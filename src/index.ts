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

// Get environment variables
const env = getEnv();

// CORS middleware - Allow all origins in development, specific origin in production
app.use('*', cors({
  origin: (origin) => {
    // Allow all origins if FRONTEND_URL is '*'
    if (env.FRONTEND_URL === '*') {
      return origin || '*';
    }
    
    // Normalize URLs by removing trailing slashes for comparison
    const allowedOrigins = env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''));
    const normalizedOrigin = origin?.replace(/\/$/, '') || '';
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(normalizedOrigin)) {
      return normalizedOrigin;
    }
    
    // For development/testing, also allow localhost
    if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
      return normalizedOrigin;
    }
    
    // Default to first allowed origin if no match
    return allowedOrigins[0] || '*';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 600,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to check CORS configuration
app.get('/api/debug/cors', (c) => {
  const origin = c.req.header('origin') || 'no-origin';
  return c.json({ 
    allowedOrigins: env.FRONTEND_URL,
    requestOrigin: origin,
    timestamp: new Date().toISOString()
  });
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

