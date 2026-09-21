import { FilterQuery } from 'mongoose';
import { IMovie, Movie } from '../models/movie.model';
import { Showtime } from '../models/showtime.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { paginationMeta } from '../utils/pagination';
import { escapeRegex } from '../utils/regex';
import type { CreateMovieBody, ListMoviesQuery, UpdateMovieBody } from '../validators/movie.validator';

export const listMovies = asyncHandler(async (req, res) => {
  const q = req.query as unknown as ListMoviesQuery;

  const filter: FilterQuery<IMovie> = { isDeleted: false };
  if (q.search) filter.title = { $regex: escapeRegex(q.search), $options: 'i' };
  if (q.genre) filter.genre = { $regex: `^${escapeRegex(q.genre)}$`, $options: 'i' };
  if (q.status) filter.status = q.status;
  if (q.date) {
    const movieIds = await Showtime.distinct('movie', { date: q.date, startsAt: { $gt: new Date() } });
    filter._id = { $in: movieIds };
  }

  const direction = q.order === 'asc' ? 1 : -1;
  const skip = (q.page - 1) * q.limit;

  const [movies, total] = await Promise.all([
    Movie.find(filter).sort({ [q.sortBy]: direction, _id: 1 }).skip(skip).limit(q.limit),
    Movie.countDocuments(filter),
  ]);

  res.json({ success: true, data: movies, meta: paginationMeta(total, q.page, q.limit) });
});

export const getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findOne({ _id: req.params.id, isDeleted: false });
  if (!movie) throw ApiError.notFound('Movie not found');
  res.json({ success: true, data: movie });
});

export const createMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.create(req.body as CreateMovieBody);
  res.status(201).json({ success: true, message: 'Movie created successfully', data: movie });
});

export const updateMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { $set: req.body as UpdateMovieBody },
    { new: true, runValidators: true },
  );
  if (!movie) throw ApiError.notFound('Movie not found');
  res.json({ success: true, message: 'Movie updated successfully', data: movie });
});

/** Soft delete: the movie disappears from the API but stays in the database. */
export const deleteMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findOne({ _id: req.params.id, isDeleted: false });
  if (!movie) throw ApiError.notFound('Movie not found');

  const hasUpcomingShowtimes = await Showtime.exists({ movie: movie._id, startsAt: { $gt: new Date() } });
  if (hasUpcomingShowtimes) {
    throw ApiError.conflict('This movie still has upcoming showtimes. Delete or reschedule them first');
  }

  await Movie.updateOne({ _id: movie._id }, { $set: { isDeleted: true, deletedAt: new Date() } });
  res.json({ success: true, message: 'Movie deleted successfully' });
});
