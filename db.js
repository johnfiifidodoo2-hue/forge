require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// ─── Configuration guard ──────────────────────────────────────────────────────
// If DATABASE_URL is missing the app will fail silently with a cryptic 500.
// Crash immediately so the issue is obvious in Vercel's function logs.
if (!process.env.DATABASE_URL) {
  console.error(
    '[FORGE] FATAL: DATABASE_URL environment variable is not set.\n' +
    'Add it in Vercel → Project Settings → Environment Variables.'
  );
  // Throw so the runtime marks the function as failed at cold-start
  throw new Error('Missing required environment variable: DATABASE_URL');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  // Keep connections alive in Vercel's serverless environment
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;

