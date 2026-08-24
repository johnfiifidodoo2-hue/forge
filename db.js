require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const isCloud = connectionString && (connectionString.includes('supabase') || connectionString.includes('neon') || connectionString.includes('render') || connectionString.includes('sslmode='));
  
  const pool = new Pool({
    connectionString,
    ssl: isCloud ? { rejectUnauthorized: false } : false,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;



