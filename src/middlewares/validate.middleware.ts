import { RequestHandler } from 'express';
import { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/ApiError';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates (and cleans) req.body / req.query / req.params with Zod.
 * On success the parsed values replace the raw ones, so controllers receive
 * trimmed, coerced, defaulted data. On failure a 400 with details is returned.
 */
export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req, _res, next) => {
    const problems: { location: string; field: string; message: string }[] = [];

    for (const location of ['body', 'query', 'params'] as const) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);
      if (result.success) {
        (req as unknown as Record<string, unknown>)[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          problems.push({ location, field: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (problems.length > 0) {
      return next(ApiError.badRequest('Validation failed', problems));
    }
    next();
  };
