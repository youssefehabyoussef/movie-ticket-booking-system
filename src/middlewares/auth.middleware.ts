import { Request, RequestHandler } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { User, UserRole } from '../models/user.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyToken } from '../utils/jwt';

/** Auth guard: requires a valid `Authorization: Bearer <token>` header. */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required. Send the token as "Authorization: Bearer <token>"');
  }

  let userId: string;
  try {
    userId = verifyToken(header.slice(7).trim()).sub;
  } catch (error) {
    throw ApiError.unauthorized(error instanceof TokenExpiredError ? 'Token expired, please log in again' : 'Invalid token');
  }

  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized('The user belonging to this token no longer exists');

  req.user = user;
  next();
});

/** Role guard: must be used after `protect`. */
export const restrictTo =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };

/** Returns the authenticated user or throws 401 (keeps controllers free of non-null assertions). */
export const requireUser = (req: Request) => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
};
