import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { compress } from '@hono/bun-compress';
import { requestId } from './middleware/requestId';
import { logger } from './lib/logger';
import { getDatabase } from './config/database';
import { connectDatabase, disconnectDatabase } from './config/database';
import { ENV } from './config/env';
import { rateLimit } from './middleware/rateLimit';
import { createAuthRoutes } from './routes/auth';
import { createDSARoutes } from './routes/dsa';
import { createLLDRoutes } from './routes/lld';
import { AppError, createErrorResponse } from './utils/errors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const app = new Hono();

// Simple metrics counter
let requestCount = 0;

// Get environment variables
const env = ENV;

// Request ID middleware
app.use('*', requestId);

// Compression middleware
app.use('*', compress());

// CORS middleware - Allow all origins in development, specific origin in production
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''));
    const normalizedOrigin = origin?.replace(/\/$/, '') || '';

    if (allowedOrigins.includes(normalizedOrigin)) {
      return normalizedOrigin;
    }

    return '';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 600,
}));

// Request size limit (1MB)
app.use('*', bodyLimit({ maxSize: 1024 * 1024 }));

// Count total requests
app.use('*', async (c, next) => {
  requestCount++;
  await next();
});

// Structured request logging
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      requestId: c.get('requestId'),
    },
    'HTTP Request'
  );
});

// Health endpoints
app.get('/health', (c) =>
  c.json({ status: 'ok', uptime: process.uptime() })
);

app.get('/health/ready', async (c) => {
  try {
    await getDatabase().command({ ping: 1 });
    return c.json({ status: 'ready' });
  } catch {
    return c.json({ status: 'not_ready' }, 503);
  }
});

// Metrics endpoint
app.get('/metrics', (c) =>
  c.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    requests: requestCount,
  })
);

// Debug endpoint removed for security

// Rate limit auth routes
app.use('/api/auth/*', rateLimit);

// API routes
app.route('/api/auth', createAuthRoutes());
app.route('/api/dsa', createDSARoutes());
app.route('/api/lld', createLLDRoutes());

// Error handling middleware
app.onError((err, c) => {
  const requestId = c.get('requestId');

  logger.error({ err, requestId }, 'Unhandled error');

  if (err instanceof AppError) {
    return c.json(createErrorResponse(err), err.statusCode as ContentfulStatusCode);
  }

  return c.json(createErrorResponse(err), 500);
});

// 404 handler
app.notFound((c) => {
  return c.json(createErrorResponse(new AppError(404, 'Route not found', 'NOT_FOUND')), 404);
});

// Start server
async function start() {
  try {
    await connectDatabase();
    
    const port = parseInt(env.PORT, 10);

    serve({
      fetch: app.fetch,
      port,
    }, (info) => {
      console.log(`Server is running on port ${info.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

start();
