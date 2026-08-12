require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const defaultDbPath = path.resolve(__dirname, 'dev.db').replace(/\\/g, '/');
const dbUrl = process.env.DATABASE_URL || `file:${defaultDbPath}`;

const adapter = new PrismaLibSql({
  url: dbUrl,
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
