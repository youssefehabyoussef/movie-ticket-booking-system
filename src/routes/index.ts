import { Router } from 'express';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import bookingRoutes from './booking.routes';
import movieRoutes from './movie.routes';
import showtimeRoutes from './showtime.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/movies', movieRoutes);
router.use('/showtimes', showtimeRoutes);
router.use('/bookings', bookingRoutes);
router.use('/admin', adminRoutes);

export default router;
