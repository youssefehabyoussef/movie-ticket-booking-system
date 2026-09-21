import { Schema, model } from 'mongoose';
import { jsonTransform } from '../utils/jsonTransform';

export const MOVIE_STATUSES = ['now_showing', 'coming_soon'] as const;
export type MovieStatus = (typeof MOVIE_STATUSES)[number];

export interface IMovie {
  title: string;
  genre: string;
  /** Duration in minutes */
  duration: number;
  description: string;
  posterUrl: string;
  /** 0 - 10 */
  rating: number;
  status: MovieStatus;
  releaseDate?: Date;
  /** Soft delete flag: deleted movies are hidden but kept in the database */
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 200 },
    genre: { type: String, required: [true, 'Genre is required'], trim: true, maxlength: 60 },
    duration: { type: Number, required: [true, 'Duration is required'], min: 1, max: 600 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 2000 },
    posterUrl: { type: String, required: [true, 'Poster URL is required'], trim: true },
    rating: { type: Number, min: 0, max: 10, default: 0 },
    status: { type: String, enum: MOVIE_STATUSES, default: 'coming_soon' },
    releaseDate: { type: Date },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, select: false },
  },
  { timestamps: true, toJSON: { transform: jsonTransform } },
);

movieSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
movieSchema.index({ isDeleted: 1, genre: 1 });

export const Movie = model<IMovie>('Movie', movieSchema);
