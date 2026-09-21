import { z } from 'zod';
import { BOOKING_STATUSES } from '../models/booking.model';
import { objectId, pagination, seatNumber } from './common.validator';

export const createBookingBody = z.object({
  showtimeId: objectId,
  seats: z
    .array(seatNumber)
    .min(1, 'Select at least one seat')
    .max(10, 'You can book at most 10 seats per reservation')
    .refine((seats) => new Set(seats).size === seats.length, 'Duplicate seats in the same reservation'),
});

export const listBookingsQuery = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  ...pagination,
});

export const adminListBookingsQuery = listBookingsQuery.extend({
  showtimeId: objectId.optional(),
  customerId: objectId.optional(),
});

export type CreateBookingBody = z.infer<typeof createBookingBody>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuery>;
export type AdminListBookingsQuery = z.infer<typeof adminListBookingsQuery>;
