/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared toJSON transform: exposes `id` instead of `_id`, and never leaks
 * `__v` or `password` in API responses.
 */
export const jsonTransform = (_doc: unknown, ret: any) => {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.__v;
  delete ret.password;
  return ret;
};
