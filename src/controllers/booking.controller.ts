import { FilterQuery, PopulateOptions, Types } from 'mongoose';
import { requireUser } from '../middlewares/auth.middleware';
import { Booking, IBooking } from '../models/booking.model';
import { Showtime } from '../models/showtime.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { paginationMeta } from '../utils/pagination';
import type {
  AdminListBookingsQuery,
  CreateBookingBody,
  ListBookingsQuery,
} from '../validators/booking.validator';

const SHOWTIME_POPULATE: PopulateOptions = {
  path: 'showtime',
  select: 'movie hallNumber date startTime endTime startsAt ticketPrice',
  populate: { path: 'movie', select: 'title genre duration posterUrl' },
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Create a booking.
 *
 * Seat reservation is a single atomic MongoDB update on the showtime document:
 * it only succeeds if NONE of the requested seats is already booked or blocked
 * and the show has not started. Two customers racing for the same seat can
 * therefore never both succeed. Because seat numbers are validated to be unique
 * and inside 1..totalCapacity, booked seats can never exceed the hall capacity.
 */
export const createBooking = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { showtimeId, seats } = req.body as CreateBookingBody;
  const selectedSeats = [...seats].sort((a, b) => a - b);

  const showtime = await Showtime.findById(showtimeId);
  if (!showtime) throw ApiError.notFound('Showtime not found');

  const now = new Date();
  if (showtime.startsAt.getTime() <= now.getTime()) {
    throw ApiError.badRequest('Bookings can only be made for upcoming showtimes');
  }

  const invalidSeats = selectedSeats.filter((seat) => seat > showtime.totalCapacity);
  if (invalidSeats.length > 0) {
    throw ApiError.badRequest(
      `Invalid seat numbers: ${invalidSeats.join(', ')}. Valid seats are 1-${showtime.totalCapacity}`,
    );
  }

  const reserved = await Showtime.findOneAndUpdate(
    {
      _id: showtime._id,
      startsAt: { $gt: now },
      bookedSeats: { $nin: selectedSeats },
      blockedSeats: { $nin: selectedSeats },
    },
    { $push: { bookedSeats: { $each: selectedSeats } } },
    { new: true },
  );
  if (!reserved) {
    throw ApiError.conflict('One or more of the selected seats are no longer available');
  }

  try {
    const booking = await Booking.create({
      customer: user._id,
      showtime: showtime._id,
      seats: selectedSeats,
      totalPrice: round2(showtime.ticketPrice * selectedSeats.length),
      status: 'confirmed', // no payment step in this project, so bookings are confirmed immediately
    });
    await booking.populate(SHOWTIME_POPULATE);

    res.status(201).json({ success: true, message: 'Booking confirmed', data: booking });
  } catch (error) {
    // Do not keep seats locked if the booking could not be saved.
    await Showtime.updateOne({ _id: showtime._id }, { $pull: { bookedSeats: { $in: selectedSeats } } });
    throw error;
  }
});

/** Booking history of the logged-in customer. */
export const listMyBookings = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const q = req.query as unknown as ListBookingsQuery;

  const filter: FilterQuery<IBooking> = { customer: user._id };
  if (q.status) filter.status = q.status;

  const skip = (q.page - 1) * q.limit;
  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(q.limit).populate(SHOWTIME_POPULATE),
    Booking.countDocuments(filter),
  ]);

  res.json({ success: true, data: bookings, meta: paginationMeta(total, q.page, q.limit) });
});

/** Admin: every booking in the system. */
export const listAllBookings = asyncHandler(async (req, res) => {
  const q = req.query as unknown as AdminListBookingsQuery;

  const filter: FilterQuery<IBooking> = {};
  if (q.status) filter.status = q.status;
  if (q.showtimeId) filter.showtime = new Types.ObjectId(q.showtimeId);
  if (q.customerId) filter.customer = new Types.ObjectId(q.customerId);

  const skip = (q.page - 1) * q.limit;
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(q.limit)
      .populate('customer', 'fullName email')
      .populate(SHOWTIME_POPULATE),
    Booking.countDocuments(filter),
  ]);

  res.json({ success: true, data: bookings, meta: paginationMeta(total, q.page, q.limit) });
});

/** A customer can read only their own booking; an admin can read any. */
export const getBooking = asyncHandler(async (req, res) => {
  const user = requireUser(req);

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (user.role !== 'admin' && !booking.customer.equals(user._id)) {
    throw ApiError.forbidden('You can only view your own bookings');
  }

  await booking.populate([{ path: 'customer', select: 'fullName email' }, SHOWTIME_POPULATE]);
  res.json({ success: true, data: booking });
});

/** Cancel a booking before the movie starts. The seats are released automatically. */
export const cancelBooking = asyncHandler(async (req, res) => {
  const user = requireUser(req);

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (!booking.customer.equals(user._id)) throw ApiError.forbidden('You can only cancel your own bookings');
  if (booking.status === 'cancelled') throw ApiError.conflict('This booking is already cancelled');

  const showtime = await Showtime.findById(booking.showtime);
  const now = new Date();
  if (showtime && showtime.startsAt.getTime() <= now.getTime()) {
    throw ApiError.badRequest('Bookings cannot be cancelled after the movie has started');
  }

  // Atomic status flip: protects against two simultaneous cancel requests.
  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, status: { $ne: 'cancelled' } },
    { $set: { status: 'cancelled', cancelledAt: now } },
    { new: true },
  );
  if (!cancelled) throw ApiError.conflict('This booking is already cancelled');

  // Release the seats so other customers can book them.
  await Showtime.updateOne({ _id: booking.showtime }, { $pull: { bookedSeats: { $in: booking.seats } } });

  await cancelled.populate(SHOWTIME_POPULATE);
  res.json({ success: true, message: 'Booking cancelled and seats released', data: cancelled });
});
