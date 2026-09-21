import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

export const idParams = z.object({ id: objectId });

export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

/** Seat numbers are whole numbers starting at 1 (upper bound is checked against the hall capacity). */
export const seatNumber = z.number().int('Seat numbers must be whole numbers').min(1, 'Seat numbers start from 1');

/** Query strings only carry text, so booleans arrive as "true" / "false". */
export const booleanQuery = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');
