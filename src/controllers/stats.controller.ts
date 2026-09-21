import { Booking } from '../models/booking.model';
import { Movie } from '../models/movie.model';
import { Showtime } from '../models/showtime.model';
import { User } from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';

/** Admin dashboard numbers. */
export const getStats = asyncHandler(async (_req, res) => {
  const now = new Date();

  const [movies, nowShowing, comingSoon, upcomingShowtimes, customers, byStatus, sales, topMovies] = await Promise.all([
    Movie.countDocuments({ isDeleted: false }),
    Movie.countDocuments({ isDeleted: false, status: 'now_showing' }),
    Movie.countDocuments({ isDeleted: false, status: 'coming_soon' }),
    Showtime.countDocuments({ startsAt: { $gt: now } }),
    User.countDocuments({ role: 'customer' }),
    Booking.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate<{ revenue: number; ticketsSold: number }>([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, revenue: { $sum: '$totalPrice' }, ticketsSold: { $sum: { $size: '$seats' } } } },
    ]),
    Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $lookup: { from: Showtime.collection.name, localField: 'showtime', foreignField: '_id', as: 'show' } },
      { $unwind: '$show' },
      { $group: { _id: '$show.movie', ticketsSold: { $sum: { $size: '$seats' } }, revenue: { $sum: '$totalPrice' } } },
      { $sort: { ticketsSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: Movie.collection.name, localField: '_id', foreignField: '_id', as: 'movie' } },
      { $unwind: '$movie' },
      { $project: { _id: 0, movieId: '$_id', title: '$movie.title', ticketsSold: 1, revenue: 1 } },
    ]),
  ]);

  const bookings = { pending: 0, confirmed: 0, cancelled: 0 } as Record<string, number>;
  for (const row of byStatus) bookings[row._id] = row.count;

  res.json({
    success: true,
    data: {
      movies: { total: movies, nowShowing, comingSoon },
      upcomingShowtimes,
      customers,
      bookings,
      ticketsSold: sales[0]?.ticketsSold ?? 0,
      revenue: sales[0]?.revenue ?? 0,
      topMovies,
    },
  });
});
