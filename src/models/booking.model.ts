import { Schema, Types, model } from 'mongoose';
import { jsonTransform } from '../utils/jsonTransform';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface IBooking {
  customer: Types.ObjectId;
  showtime: Types.ObjectId;
  seats: number[];
  totalPrice: number;
  status: BookingStatus;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
    seats: {
      type: [Number],
      required: true,
      validate: [(value: number[]) => value.length > 0, 'At least one seat must be selected'],
    },
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: BOOKING_STATUSES, default: 'confirmed' },
    cancelledAt: { type: Date },
  },
  { timestamps: true, toJSON: { transform: jsonTransform } },
);

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ showtime: 1, status: 1 });

export const Booking = model<IBooking>('Booking', bookingSchema);
