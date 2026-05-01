import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config, validateRequiredEnvVars } from './lib/config.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { scenarioRouter } from './routes/scenarios.js';
import { tagRouter } from './routes/tags.js';
import { reviewRouter } from './routes/reviews.js';
import { bookmarkRouter } from './routes/bookmarks.js';
import { profileRouter } from './routes/profiles.js';
import { followRouter } from './routes/follows.js';
import { likeRouter } from './routes/likes.js';
import { commentRouter } from './routes/comments.js';
import { reportRouter } from './routes/reports.js';
import { notificationRouter } from './routes/notifications.js';
import { seriesRouter } from './routes/series.js';
import { playReportRouter } from './routes/play-reports.js';
import { rankingRouter } from './routes/rankings.js';
import { serviceRouter } from './routes/service.js';
import path from 'path';
import { authMiddleware } from './middleware/auth.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { securityHeadersMiddleware } from './middleware/security-headers.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { notFoundHandler, errorHandlerMiddleware } from './middleware/error-handler.js';
import { enableDbMode } from './services/session.service.js';
import { initializeDatabase } from './db/unified-client.js';

validateRequiredEnvVars();

const app = express();

if (!config.isDev) {
  app.set('trust proxy', 1);
}

// Middleware stack
app.use(requestIdMiddleware);
app.use(securityHeadersMiddleware);

const corsOrigins = config.corsOrigin.includes(',')
  ? config.corsOrigin.split(',').map(o => o.trim())
  : config.corsOrigin;
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(rateLimitMiddleware);
app.use(authMiddleware);

// Routes (/api/v1)
app.use('/api/v1', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', scenarioRouter);
app.use('/api/v1', tagRouter);
app.use('/api/v1', reviewRouter);
app.use('/api/v1', bookmarkRouter);
app.use('/api/v1', profileRouter);
app.use('/api/v1', followRouter);
app.use('/api/v1', likeRouter);
app.use('/api/v1', commentRouter);
app.use('/api/v1', reportRouter);
app.use('/api/v1', notificationRouter);
app.use('/api/v1', seriesRouter);
app.use('/api/v1', playReportRouter);
app.use('/api/v1', rankingRouter);
app.use('/api/v1', serviceRouter);

// Serve Vite-built frontend
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, 'client');
app.use(express.static(clientDir));

// 404 handler for API routes
app.use('/api', notFoundHandler);

// Global error handler
app.use(errorHandlerMiddleware);

// Assets 404
app.get('/assets/*', (_req, res) => {
  res.status(404).end();
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

let server: ReturnType<typeof app.listen> | null = null;

async function startServer() {
  const dbType = await initializeDatabase();

  if (dbType === 'pg') {
    try {
      const { connectRedis, checkRedisConnection } = await import('./cache/client.js');
      await connectRedis();
      const redisConnected = await checkRedisConnection();
      if (redisConnected) {
        console.log('[Sprink] Redis connected');
      }
      await enableDbMode('pg');
    } catch (err) {
      console.warn('[Sprink] Redis not available:', err);
      await enableDbMode('pg');
    }
  } else {
    await enableDbMode('sqlite');
  }

  server = app.listen(config.port, () => {
    const dbLabel = dbType === 'sqlite' ? 'SQLite (dev)' : 'PostgreSQL (prod)';
    console.log(`[Sprink] Server running on port ${config.port} (${config.nodeEnv})`);
    console.log(`[Sprink] Frontend: http://localhost:${config.port}/`);
    console.log(`[Sprink] DB: ${dbLabel}`);
  });
}

async function gracefulShutdown(signal: string) {
  console.log(`[Sprink] ${signal} received, shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log('[Sprink] HTTP server closed');
    });
  }

  try {
    const { closePool } = await import('./db/client.js');
    await closePool();
    console.log('[Sprink] Database pool closed');
  } catch {
    // SQLite mode
  }

  setTimeout(() => {
    console.error('[Sprink] Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[Sprink] Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('[Sprink] Uncaught Exception:', err);
  process.exit(1);
});

startServer().catch((err) => {
  console.error('[Sprink] Failed to start server:', err);
  process.exit(1);
});
