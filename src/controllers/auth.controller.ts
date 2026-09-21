import { env } from '../config/env';
import { requireUser } from '../middlewares/auth.middleware';
import { User } from '../models/user.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { signToken } from '../utils/jwt';
import { safeEqual } from '../utils/security';
import type { LoginBody, RegisterBody } from '../validators/auth.validator';

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, adminSecret } = req.body as RegisterBody;

  // Anyone can sign up as a customer. Cinema Admin accounts need the server-side secret.
  if (role === 'admin') {
    const expected = env.ADMIN_REGISTRATION_SECRET;
    if (!expected || !adminSecret || !safeEqual(adminSecret, expected)) {
      throw ApiError.forbidden('Invalid or missing admin registration secret');
    }
  }

  if (await User.exists({ email })) {
    throw ApiError.conflict('This email is already registered');
  }

  const user = await User.create({ fullName, email, password, role });
  const token = signToken({ id: user.id, role: user.role });

  res.status(201).json({ success: true, message: 'Registered successfully', data: { user, token } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as LoginBody;

  const user = await User.findOne({ email }).select('+password');
  // Same message for "unknown email" and "wrong password" so accounts cannot be enumerated.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken({ id: user.id, role: user.role });
  res.json({ success: true, message: 'Logged in successfully', data: { user, token } });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: requireUser(req) });
});
