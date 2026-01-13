import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getEnv } from './config/env';
import { createAuthRoutes } from './routes/auth';
import { createDSARoutes } from './routes/dsa';
import { createLLDRoutes } from './routes/lld';
import { AppError, createErrorResponse } from './utils/errors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const app = new Hono();

// CORS middleware
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.route('/api/auth', createAuthRoutes());
app.route('/api/dsa', createDSARoutes());
app.route('/api/lld', createLLDRoutes());

// Error handling middleware
app.onError((err, c) => {
  console.error('Error:', err);
  
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
    
    const env = getEnv();
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

