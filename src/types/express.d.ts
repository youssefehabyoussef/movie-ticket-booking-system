import type { HydratedDocument } from 'mongoose';
import type { IUser, IUserMethods } from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `protect` middleware on authenticated routes. */
      user?: HydratedDocument<IUser, IUserMethods>;
    }
  }
}

export {};
