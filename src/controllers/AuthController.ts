import type { Context } from 'hono';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';
import { AppError, createErrorResponse } from '../utils/errors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleAuthSchema = z.object({
  googleId: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
});

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(c: Context) {
    try {
      const body = await c.req.json();
      const data = registerSchema.parse(body);

      const result = await this.authService.register(data.email, data.password, data.name);

      return c.json({
        user: {
          _id: result.user._id?.toString(),
          email: result.user.email,
          name: result.user.name,
        },
        token: result.token,
      }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Use ZodError.issues, since errors does not exist
        const firstIssue = error.issues[0];
        return c.json(
          createErrorResponse(
            new AppError(
              400,
              firstIssue?.message || 'Validation error',
              'VALIDATION_ERROR'
            )
          ),
          400 as ContentfulStatusCode
        );
      }
      if (error instanceof AppError) {
        return c.json(createErrorResponse(error), error.statusCode as ContentfulStatusCode);
      }
      return c.json(createErrorResponse(error), 500);
    }
  }

  async login(c: Context) {
    try {
      const body = await c.req.json();
      const data = loginSchema.parse(body);

      const result = await this.authService.login(data.email, data.password);

      return c.json({
        user: {
          _id: result.user._id?.toString(),
          email: result.user.email,
          name: result.user.name,
        },
        token: result.token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0];
        return c.json(
          createErrorResponse(
            new AppError(
              400,
              firstIssue?.message || 'Validation error',
              'VALIDATION_ERROR'
            )
          ),
          400 as ContentfulStatusCode
        );
      }
      if (error instanceof AppError) {
        return c.json(createErrorResponse(error), error.statusCode as ContentfulStatusCode);
      }
      return c.json(createErrorResponse(error), 500);
    }
  }

  async googleAuth(c: Context) {
    try {
      const body = await c.req.json();
      const data = googleAuthSchema.parse(body);

      const result = await this.authService.loginWithGoogle(data.googleId, data.email, data.name);

      return c.json({
        user: {
          _id: result.user._id?.toString(),
          email: result.user.email,
          name: result.user.name,
        },
        token: result.token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0];
        return c.json(
          createErrorResponse(
            new AppError(
              400,
              firstIssue?.message || 'Validation error',
              'VALIDATION_ERROR'
            )
          ),
          400 as ContentfulStatusCode
        );
      }
      if (error instanceof AppError) {
        return c.json(createErrorResponse(error), error.statusCode as ContentfulStatusCode);
      }
      return c.json(createErrorResponse(error), 500 as ContentfulStatusCode);
    }
  }
}

