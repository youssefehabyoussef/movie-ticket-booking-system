import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Forwards errors thrown inside async controllers to Express' error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
