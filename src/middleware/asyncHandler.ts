import { type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from '../utils/errors';
import { errorResponse } from '../utils/response';
import { logger } from '../lib/logger';

export const asyncHandler =
  (fn: (c: Context) => Promise<Response>) =>
    async (c: Context) => {
      try {
        return await fn(c);
      } catch (err: any) {
        const requestId = c.get('requestId');

        logger.error({ err, requestId }, 'Unhandled error');

        if (err instanceof AppError) {
          return c.json(
            errorResponse(err.code, err.message, requestId),
            err.statusCode as ContentfulStatusCode
          );
        }

        return c.json(
          errorResponse(
            'INTERNAL_ERROR',
            'Internal server error',
            requestId
          ),
          500
        );
      }
    };
