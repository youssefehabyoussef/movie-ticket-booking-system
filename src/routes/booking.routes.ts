import { Router } from 'express';
import {
  cancelBooking,
  createBooking,
  getBooking,
  listAllBookings,
  listMyBookings,
} from '../controllers/booking.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { adminListBookingsQuery, createBookingBody, listBookingsQuery } from '../validators/booking.validator';
import { idParams } from '../validators/common.validator';

const router = Router();

// Every booking route requires a logged-in user
router.use(protect);

// Customer
router.post('/', restrictTo('customer'), validate({ body: createBookingBody }), createBooking);
router.get('/my', restrictTo('customer'), validate({ query: listBookingsQuery }), listMyBookings);
router.patch('/:id/cancel', restrictTo('customer'), validate({ params: idParams }), cancelBooking);

// Cinema Admin
router.get('/', restrictTo('admin'), validate({ query: adminListBookingsQuery }), listAllBookings);

// Customer (own booking) or Admin (any booking)
router.get('/:id', validate({ params: idParams }), getBooking);

export default router;
