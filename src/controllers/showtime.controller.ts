import { FilterQuery, Types } from 'mongoose';
import { env } from '../config/env';
import { Booking } from '../models/booking.model';
import { Movie } from '../models/movie.model';
import { IShowtime, Showtime } from '../models/showtime.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { buildShowtimeWindow } from '../utils/datetime';
import { paginationMeta } from '../utils/pagination';
import type {
  CreateShowtimeBody,
  ListShowtimesQuery,
  ManageSeatsBody,
  UpdateShowtimeBody,
} from '../validators/showtime.validator';

const MOVIE_FIELDS = 'title genre duration posterUrl rating status';

// ---------------------------------------------------------------- helpers

const assertMovieExists = async (movieId: string) => {
  const exists = await Movie.exists({ _id: movieId, isDeleted: false });
  if (!exists) throw ApiError.notFound('Movie not found');
};

/** Converts local date/time input into timestamps and enforces "future showtimes only". */
const resolveWindow = (date: string, startTime: string, endTime: string) => {
  if (startTime === endTime) throw ApiError.badRequest('End time must be different from start time');
  const window = buildShowtimeWindow(date, startTime, endTime, env.CINEMA_TZ_OFFSET);
  if (window.startsAt.getTime() <= Date.now()) throw ApiError.badRequest('Showtime must be in the future');
  return window;
};

/** A hall can only show one movie at a time. */
const assertNoHallConflict = async (hallNumber: number, startsAt: Date, endsAt: Date, excludeId?: Types.ObjectId) => {
  const conflict = await Showtime.exists({
    hallNumber,
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (conflict) throw ApiError.conflict(`Hall ${hallNumber} is already scheduled during this time`);
};

// ------------------------------------------------------------ public reads

export const listShowtimes = asyncHandler(async (req, res) => {
  const q = req.query as unknown as ListShowtimesQuery;

  const filter: FilterQuery<IShowtime> = {};
  if (!q.includePast) filter.startsAt = { $gt: new Date() };
  if (q.movieId) filter.movie = new Types.ObjectId(q.movieId);
  if (q.date) filter.date = q.date;
  if (q.hallNumber) filter.hallNumber = q.hallNumber;
  if (q.timeFrom || q.timeTo) {
    const range: { $gte?: string; $lte?: string } = {};
    if (q.timeFrom) range.$gte = q.timeFrom;
    if (q.timeTo) range.$lte = q.timeTo;
    filter.startTime = range;
  }

  const skip = (q.page - 1) * q.limit;
  const [showtimes, total] = await Promise.all([
    Showtime.find(filter).sort({ startsAt: 1, _id: 1 }).skip(skip).limit(q.limit).populate('movie', MOVIE_FIELDS),
    Showtime.countDocuments(filter),
  ]);

  res.json({ success: true, data: showtimes, meta: paginationMeta(total, q.page, q.limit) });
});

export const getShowtime = asyncHandler(async (req, res) => {
  const showtime = await Showtime.findById(req.params.id).populate('movie', MOVIE_FIELDS);
  if (!showtime) throw ApiError.notFound('Showtime not found');
  res.json({ success: true, data: showtime });
});

/** Seat map: which seat numbers can still be booked. */
export const getSeats = asyncHandler(async (req, res) => {
  const showtime = await Showtime.findById(req.params.id);
  if (!showtime) throw ApiError.notFound('Showtime not found');

  const taken = new Set<number>([...showtime.bookedSeats, ...showtime.blockedSeats]);
  const availableSeats: number[] = [];
  for (let seat = 1; seat <= showtime.totalCapacity; seat++) {
    if (!taken.has(seat)) availableSeats.push(seat);
  }

  res.json({
    success: true,
    data: {
      showtimeId: showtime.id,
      totalCapacity: showtime.totalCapacity,
      ticketPrice: showtime.ticketPrice,
      isBookable: showtime.startsAt.getTime() > Date.now(),
      availableSeats,
      bookedSeats: [...showtime.bookedSeats].sort((a, b) => a - b),
      blockedSeats: [...showtime.blockedSeats].sort((a, b) => a - b),
    },
  });
});

// ------------------------------------------------------------ admin writes

export const createShowtime = asyncHandler(async (req, res) => {
  const body = req.body as CreateShowtimeBody;

  await assertMovieExists(body.movie);
  const { startsAt, endsAt } = resolveWindow(body.date, body.startTime, body.endTime);
  await assertNoHallConflict(body.hallNumber, startsAt, endsAt);

  const showtime = await Showtime.create({ ...body, startsAt, endsAt });
  await showtime.populate('movie', MOVIE_FIELDS);

  res.status(201).json({ success: true, message: 'Showtime created successfully', data: showtime });
});

export const updateShowtime = asyncHandler(async (req, res) => {
  const body = req.body as UpdateShowtimeBody;

  const showtime = await Showtime.findById(req.params.id);
  if (!showtime) throw ApiError.notFound('Showtime not found');
  if (showtime.startsAt.getTime() <= Date.now()) {
    throw ApiError.badRequest('A showtime that has already started cannot be modified');
  }

  if (body.movie) {
    await assertMovieExists(body.movie);
    showtime.movie = new Types.ObjectId(body.movie);
  }

  const scheduleChanged =
    body.date !== undefined ||
    body.startTime !== undefined ||
    body.endTime !== undefined ||
    body.hallNumber !== undefined;

  if (scheduleChanged) {
    const date = body.date ?? showtime.date;
    const startTime = body.startTime ?? showtime.startTime;
    const endTime = body.endTime ?? showtime.endTime;
    const hallNumber = body.hallNumber ?? showtime.hallNumber;

    const { startsAt, endsAt } = resolveWindow(date, startTime, endTime);
    await assertNoHallConflict(hallNumber, startsAt, endsAt, showtime._id);
    showtime.set({ date, startTime, endTime, hallNumber, startsAt, endsAt });
  }

  if (body.totalCapacity !== undefined) {
    const highestReserved = Math.max(0, ...showtime.bookedSeats, ...showtime.blockedSeats);
    if (body.totalCapacity < highestReserved) {
      throw ApiError.conflict(`Capacity cannot be lower than the highest reserved seat number (${highestReserved})`);
    }
    showtime.totalCapacity = body.totalCapacity;
  }

  // Existing bookings keep the price they were made with (stored on the booking).
  if (body.ticketPrice !== undefined) showtime.ticketPrice = body.ticketPrice;

  await showtime.save();
  await showtime.populate('movie', MOVIE_FIELDS);

  res.json({ success: true, message: 'Showtime updated successfully', data: showtime });
});

export const deleteShowtime = asyncHandler(async (req, res) => {
  const showtime = await Showtime.findById(req.params.id);
  if (!showtime) throw ApiError.notFound('Showtime not found');

  const hasConfirmedBookings = await Booking.exists({ showtime: showtime._id, status: 'confirmed' });
  if (hasConfirmedBookings) {
    throw ApiError.conflict('This showtime has confirmed bookings and cannot be deleted');
  }

  // Only cancelled / pending leftovers remain, remove them together with the showtime.
  await Booking.deleteMany({ showtime: showtime._id });
  await showtime.deleteOne();

  res.json({ success: true, message: 'Showtime deleted successfully' });
});

/** Admin seat management: close broken seats or re-open them. */
export const manageSeats = asyncHandler(async (req, res) => {
  const { action, seats } = req.body as ManageSeatsBody;

  const showtime = await Showtime.findById(req.params.id);
  if (!showtime) throw ApiError.notFound('Showtime not found');

  const outOfRange = seats.filter((seat) => seat > showtime.totalCapacity);
  if (outOfRange.length > 0) {
    throw ApiError.badRequest(`Invalid seat numbers: ${outOfRange.join(', ')}. Valid range is 1-${showtime.totalCapacity}`);
  }

  let updated;
  if (action === 'block') {
    // Atomic: fails if any of these seats was booked in the meantime.
    updated = await Showtime.findOneAndUpdate(
      { _id: showtime._id, bookedSeats: { $nin: seats } },
      { $addToSet: { blockedSeats: { $each: seats } } },
      { new: true },
    );
    if (!updated) throw ApiError.conflict('Some of these seats are already booked and cannot be blocked');
  } else {
    updated = await Showtime.findByIdAndUpdate(
      showtime._id,
      { $pull: { blockedSeats: { $in: seats } } },
      { new: true },
    );
  }

  res.json({
    success: true,
    message: action === 'block' ? 'Seats blocked successfully' : 'Seats released successfully',
    data: updated,
  });
});
