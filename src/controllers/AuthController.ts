import type { Context } from 'hono';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';
import { successResponse } from '../utils/response';

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
  idToken: z.string().min(1),
});

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (c: Context) => {
    const body = await c.req.json();
    const data = registerSchema.parse(body);

    const result = await this.authService.register(
      data.email,
      data.password,
      data.name
    );

    return c.json(
      successResponse(
        {
          user: {
            _id: result.user._id?.toString(),
            email: result.user.email,
            name: result.user.name,
          },
          token: result.token,
        },
        c.get('requestId')
      ),
      201
    );
  };

  login = async (c: Context) => {
    const body = await c.req.json();
    const data = loginSchema.parse(body);

    const result = await this.authService.login(
      data.email,
      data.password
    );

    return c.json(
      successResponse(
        {
          user: {
            _id: result.user._id?.toString(),
            email: result.user.email,
            name: result.user.name,
          },
          token: result.token,
        },
        c.get('requestId')
      )
    );
  };

  googleAuth = async (c: Context) => {
    const body = await c.req.json();
    const data = googleAuthSchema.parse(body);

    const result = await this.authService.loginWithGoogle(
      data.idToken
    );

    return c.json(
      successResponse(
        {
          user: {
            _id: result.user._id?.toString(),
            email: result.user.email,
            name: result.user.name,
          },
          token: result.token,
        },
        c.get('requestId')
      )
    );
  };
}
