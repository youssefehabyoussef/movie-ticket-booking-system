import { z } from 'zod';
import { MOVIE_STATUSES } from '../models/movie.model';
import { isValidDateString } from '../utils/datetime';
import { pagination } from './common.validator';

const movieFields = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  genre: z.string().trim().min(1, 'Genre is required').max(60),
  duration: z.number().int('Duration must be a whole number of minutes').min(1).max(600),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  posterUrl: z.string().trim().url('Poster URL must be a valid URL'),
  rating: z.number().min(0).max(10).optional(),
  status: z.enum(MOVIE_STATUSES).optional(),
  releaseDate: z.coerce.date().optional(),
});

export const createMovieBody = movieFields;

export const updateMovieBody = movieFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export const listMoviesQuery = z.object({
  search: z.string().trim().min(1).optional(), // movie title
  genre: z.string().trim().min(1).optional(),
  status: z.enum(MOVIE_STATUSES).optional(),
  date: z
    .string()
    .refine(isValidDateString, 'Date must be a valid YYYY-MM-DD')
    .optional(), // only movies that have an upcoming showtime on this date
  sortBy: z.enum(['rating', 'releaseDate', 'title', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  ...pagination,
});

export type CreateMovieBody = z.infer<typeof createMovieBody>;
export type UpdateMovieBody = z.infer<typeof updateMovieBody>;
export type ListMoviesQuery = z.infer<typeof listMoviesQuery>;
