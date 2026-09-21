import { Schema, Types, model } from 'mongoose';
import { jsonTransform } from '../utils/jsonTransform';

export interface IShowtime {
  movie: Types.ObjectId;
  hallNumber: number;
  /** Local cinema date, YYYY-MM-DD */
  date: string;
  /** Local cinema time, HH:mm */
  startTime: string;
  endTime: string;
  /** Real timestamps computed from date + times (used for all time comparisons) */
  startsAt: Date;
  endsAt: Date;
  ticketPrice: number;
  totalCapacity: number;
  /** Seat numbers (1..totalCapacity) taken by bookings */
  bookedSeats: number[];
  /** Seat numbers the admin closed (broken seat, maintenance, ...) */
  blockedSeats: number[];
  createdAt: Date;
  updatedAt: Date;
}

const showtimeSchema = new Schema<IShowtime>(
  {
    movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: [true, 'Movie is required'], index: true },
    hallNumber: { type: Number, required: [true, 'Hall number is required'], min: 1 },
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    ticketPrice: { type: Number, required: [true, 'Ticket price is required'], min: 0 },
    totalCapacity: { type: Number, required: [true, 'Total capacity is required'], min: 1, max: 1000 },
    bookedSeats: { type: [Number], default: [] },
    blockedSeats: { type: [Number], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform: (doc: unknown, ret: any) => {
        jsonTransform(doc, ret);
        const booked = ret.bookedSeats?.length ?? 0;
        const blocked = ret.blockedSeats?.length ?? 0;
        ret.availableSeatsCount = (ret.totalCapacity ?? 0) - booked - blocked;
        return ret;
      },
    },
  },
);

// Used to detect overlapping shows inside the same hall.
showtimeSchema.index({ hallNumber: 1, startsAt: 1, endsAt: 1 });

export const Showtime = model<IShowtime>('Showtime', showtimeSchema);
