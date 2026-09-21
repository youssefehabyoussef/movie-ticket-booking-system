import { Router } from 'express';
import { getMe, login, register } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginBody, registerBody } from '../validators/auth.validator';

const router = Router();

router.post('/register', validate({ body: registerBody }), register);
router.post('/login', validate({ body: loginBody }), login);
router.get('/me', protect, getMe);

export default router;
