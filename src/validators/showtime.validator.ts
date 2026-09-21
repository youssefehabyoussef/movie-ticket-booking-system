import { z } from 'zod';
import { isValidDateString } from '../utils/datetime';
import { booleanQuery, objectId, pagination, seatNumber } from './common.validator';

const dateString = z.string().refine(isValidDateString, 'Date must be a valid date in YYYY-MM-DD format');
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm (24h) format');

const showtimeFields = z.object({
  movie: objectId,
  hallNumber: z.number().int('Hall number must be a whole number').min(1),
  date: dateString,
  startTime: timeString,
  endTime: timeString,
  ticketPrice: z.number().min(0, 'Ticket price cannot be negative'),
  totalCapacity: z.number().int('Capacity must be a whole number').min(1).max(1000),
});

export const createShowtimeBody = showtimeFields;

export const updateShowtimeBody = showtimeFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export const listShowtimesQuery = z.object({
  movieId: objectId.optional(),
  date: dateString.optional(),
  timeFrom: timeString.optional(),
  timeTo: timeString.optional(),
  hallNumber: z.coerce.number().int().min(1).optional(),
  includePast: booleanQuery,
  ...pagination,
});

export const manageSeatsBody = z.object({
  action: z.enum(['block', 'unblock']),
  seats: z
    .array(seatNumber)
    .min(1, 'Provide at least one seat')
    .max(100)
    .refine((seats) => new Set(seats).size === seats.length, 'Duplicate seat numbers in the request'),
});

export type CreateShowtimeBody = z.infer<typeof createShowtimeBody>;
export type UpdateShowtimeBody = z.infer<typeof updateShowtimeBody>;
export type ListShowtimesQuery = z.infer<typeof listShowtimesQuery>;
export type ManageSeatsBody = z.infer<typeof manageSeatsBody>;
