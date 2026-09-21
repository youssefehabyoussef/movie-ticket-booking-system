import { Router } from 'express';
import {
  createShowtime,
  deleteShowtime,
  getSeats,
  getShowtime,
  listShowtimes,
  manageSeats,
  updateShowtime,
} from '../controllers/showtime.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParams } from '../validators/common.validator';
import {
  createShowtimeBody,
  listShowtimesQuery,
  manageSeatsBody,
  updateShowtimeBody,
} from '../validators/showtime.validator';

const router = Router();

// Public: anyone can browse showtimes and see which seats are free
router.get('/', validate({ query: listShowtimesQuery }), listShowtimes);
router.get('/:id', validate({ params: idParams }), getShowtime);
router.get('/:id/seats', validate({ params: idParams }), getSeats);

// Cinema Admin only
router.post('/', protect, restrictTo('admin'), validate({ body: createShowtimeBody }), createShowtime);
router.patch('/:id', protect, restrictTo('admin'), validate({ params: idParams, body: updateShowtimeBody }), updateShowtime);
router.delete('/:id', protect, restrictTo('admin'), validate({ params: idParams }), deleteShowtime);
router.patch('/:id/seats', protect, restrictTo('admin'), validate({ params: idParams, body: manageSeatsBody }), manageSeats);

export default router;
