import jwt, { JsonWebTokenError, JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../models/user.model';

export interface TokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
}

export const signToken = (user: { id: string; role: UserRole }): string =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new JsonWebTokenError('Invalid token payload');
  }
  return decoded as TokenPayload;
};
