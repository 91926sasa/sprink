const isDev = (process.env.NODE_ENV || 'development') === 'development';

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5175',
  sessionSecret: process.env.SESSION_SECRET || 'sprink-dev-secret',
  cookie: {
    name: isDev ? 'sprink_session' : '__Host-sprink_session',
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: !isDev,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  database: {
    url: process.env.DATABASE_URL || '',
    sqlitePath: process.env.SQLITE_PATH || './data/sprink-dev.db',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    ssl: process.env.DATABASE_SSL !== 'false',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  trpgo: {
    issuer: process.env.TRPGO_OIDC_ISSUER || '',
    clientId: process.env.TRPGO_OIDC_CLIENT_ID || '',
    clientSecret: process.env.TRPGO_OIDC_CLIENT_SECRET || '',
    redirectUri: process.env.TRPGO_OIDC_REDIRECT_URI || '',
    scopes: ['openid', 'profile', 'sprink'] as readonly string[],
  },
} as const;

export function validateRequiredEnvVars(): void {
  if (isDev) return;

  const errors: string[] = [];

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'sprink-dev-secret') {
    errors.push('SESSION_SECRET must be set to a strong random value (not default)');
  }
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required in production (PostgreSQL)');
  }
  if (!process.env.CORS_ORIGIN) {
    errors.push('CORS_ORIGIN must be set to your production domain(s)');
  }

  if (errors.length > 0) {
    console.error('[Sprink] FATAL: Missing required environment variables:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
}
