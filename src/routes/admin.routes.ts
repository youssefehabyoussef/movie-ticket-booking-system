import { Router } from 'express';
import { getStats } from '../controllers/stats.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats', protect, restrictTo('admin'), getStats);

export default router;
