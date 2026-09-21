import { timingSafeEqual } from 'crypto';

/** Constant-time string comparison (avoids timing attacks on secrets). */
export const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};
