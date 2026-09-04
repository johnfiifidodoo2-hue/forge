require('dotenv').config();
const bcrypt = require('bcryptjs');

let prismaClient = null;
let usePostgres = false;

// Attempt to initialize Prisma PostgreSQL client
try {
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');

  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool);
    prismaClient = new PrismaClient({ adapter, log: ['error'] });
    usePostgres = true;
    console.log('[FORGE DB] PostgreSQL adapter initialized. Will verify connectivity on first query.');
  }
} catch (e) {
  console.warn('[FORGE DB] PostgreSQL driver initialization skipped, activating resilient memory store fallback.');
}

// ─── Resilient In-Memory & Demo Store ─────────────────────────────────────────

// Pre-compute a password hash synchronously using a known salt so demo users
// are available immediately (no async race condition).
// Hash was generated via: bcrypt.hash('Password123!', 10) and verified.
const DEMO_HASH = '$2a$10$zPFd7WwWznhovQjmpKz4muEtYuLxryCtmgYjaVPMZ2BKMGqUA5bci';

const store = {
  users: [
    {
      id: 1,
      email: 'creator@forge.dev',
      name: 'Kai Chen',
      password: DEMO_HASH,
      role: 'CREATOR',
      bio: 'Full-stack developer & UI enthusiast building cross-disciplinary tools.',
      skills: 'React, Node.js, TypeScript, Tailwind',
      portfolioUrl: 'https://github.com',
      whatsappNumber: '+1234567890',
      preferredTheme: 'DARK',
      createdAt: new Date(),
    },
    {
      id: 2,
      email: 'expert@forge.dev',
      name: 'Dr. Rose-Mary Gyening',
      password: DEMO_HASH,
      role: 'EXPERT',
      bio: 'Lecturer for Computer Architecture with extensive industry and academic experience.',
      skills: 'Computer Architecture, Hardware, Mentorship, Engineering',
      portfolioUrl: 'https://example.edu/faculty/rose-mary-gyening',
      whatsappNumber: 'rosygyening',
      preferredTheme: 'DARK',
      createdAt: new Date(),
    },
    {
      id: 3,
      email: 'investor@forge.dev',
      name: 'Sarah Blake',
      password: DEMO_HASH,
      role: 'EXPERT',
      bio: 'Partner at Antigravity Capital. Interested in deep tech, AI, and SaaS platforms.',
      skills: 'Venture Capital, Go-To-Market, Fundraising, Strategy',
      portfolioUrl: 'https://superscout.co',
      whatsappNumber: '+1987654322',
      preferredTheme: 'LIGHT',
      createdAt: new Date(),
    },
    {
      id: 4,
      email: 'devops@forge.dev',
      name: 'Alex Rivera',
      password: DEMO_HASH,
      role: 'EXPERT',
      bio: 'DevOps & Cloud Infrastructure Architect. AWS Certified.',
      skills: 'Docker, Kubernetes, AWS, CI/CD',
      portfolioUrl: 'https://github.com/alexrivera',
      whatsappNumber: '+1987654323',
      preferredTheme: 'DARK',
      createdAt: new Date(),
    },
  ],
  projects: [
    {
      id: 1,
      title: 'Antigravity Workspace Engine',
      description: 'A revolutionary collaboration tool combining real-time communication with AI-driven proposal generation.',
      tags: 'react, express, web, collaboration',
      ownerId: 1,
      createdAt: new Date('2023-01-15T10:00:00Z'),
    },
    {
      id: 2,
      title: 'RISC-V Edge AI Accelerator',
      description: 'An open-source custom instruction set extension for RISC-V processors designed specifically to accelerate neural network inference on ultra-low-power edge devices. Seeking mentorship on memory bandwidth optimization and pipeline hazards.',
      tags: 'computer-architecture, hardware, risc-v, edge-ai, fpga',
      ownerId: 1,
      createdAt: new Date('2023-03-22T14:30:00Z'),
    },
    {
      id: 3,
      title: 'AirBed & Breakfast (Marketplace)',
      description: 'A peer-to-peer online marketplace and homestay network enabling people to list or rent short-term lodging in residential properties.',
      tags: 'marketplace, scalable, real-estate, ruby-on-rails',
      ownerId: 1,
      createdAt: new Date('2023-05-10T09:15:00Z'),
    },
    {
      id: 4,
      title: 'UberCab (On-Demand Transport)',
      description: 'A location-based smartphone app allowing users to request a premium black car service on demand with one tap.',
      tags: 'mobile-app, logistics, real-time, gps',
      ownerId: 1,
      createdAt: new Date('2023-08-01T11:45:00Z'),
    },
  ],
  comments: [
    {
      id: 1,
      content: 'This RISC-V project looks fascinating! Are you considering implementing out-of-order execution for the tensor operations?',
      projectId: 2,
      authorId: 2,
      createdAt: new Date(),
    }
  ],
  upvotes: [],
  saves: [],
  resources: [
    {
      id: 1,
      title: 'Next.js 14 Official Documentation',
      description: 'The React Framework for the Web. Learn about App Router, Server Actions, and more.',
      url: 'https://nextjs.org/docs',
      category: 'GUIDE',
      sharedById: 2,
      createdAt: new Date(),
    },
    {
      id: 2,
      title: 'Prisma ORM Crash Course',
      description: 'Learn how to use Prisma with PostgreSQL in this comprehensive YouTube tutorial.',
      url: 'https://www.youtube.com/watch?v=RebA5J-rlwg',
      category: 'TOOL',
      sharedById: 2,
      createdAt: new Date(),
    },
    {
      id: 3,
      title: 'Tailwind CSS UI Kit',
      description: 'Beautifully designed, fully responsive UI components built with Tailwind.',
      url: 'https://tailwindui.com/',
      category: 'UI_KIT',
      sharedById: 2,
      createdAt: new Date(),
    },
    {
      id: 4,
      title: 'Y Combinator Startup Library',
      description: 'Essential advice, essays, and videos on how to build a successful startup, raise funding, and scale.',
      url: 'https://www.ycombinator.com/library',
      category: 'GUIDE',
      sharedById: 3,
      createdAt: new Date(),
    },
    {
      id: 5,
      title: 'Y Combinator SAFE Template',
      description: 'The standard Simple Agreement for Future Equity used by top startups globally for early-stage fundraising.',
      url: 'https://www.ycombinator.com/documents/',
      category: 'TEMPLATE',
      sharedById: 3,
      createdAt: new Date(),
    },
    {
      id: 6,
      title: 'AWS Activate for Startups',
      description: 'Apply for up to $100,000 in AWS credits to cover your cloud infrastructure costs while you scale.',
      url: 'https://aws.amazon.com/activate/',
      category: 'TOOL',
      sharedById: 4,
      createdAt: new Date(),
    },
    {
      id: 7,
      title: 'Computer Architecture: A Quantitative Approach',
      description: 'The definitive textbook for computer architecture and hardware engineering fundamentals.',
      url: 'https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1',
      category: 'GUIDE',
      sharedById: 2,
      createdAt: new Date(),
    }
  ],
  bookings: [],
  notifications: [],
  chatMessages: [
    {
      id: 1,
      senderId: 1,
      roomId: 'global',
      content: 'Welcome to the Forge Antigravity Lounge! Let us build something extraordinary together. 🚀',
      createdAt: new Date(),
    },
    {
      id: 2,
      senderId: 2,
      roomId: 'global',
      content: 'Hello! I am available for 1:1 sessions on hardware integration and computer architecture optimization.',
      createdAt: new Date(),
    },
  ],
  pitchProposals: [],
  follows: [],
};

// ─── Connection error detection ──────────────────────────────────────────────

function isConnectionError(err) {
  if (!err) return false;
  const msg = String(err.message || err.code || '');
  return (
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNRESET') ||
    msg.includes('SSL') ||
    msg.includes('TLS') ||
    msg.includes('certificate') ||
    msg.includes('P1001') ||
    msg.includes('P1002') ||
    msg.includes('P1003') ||
    msg.includes('P1008') ||
    msg.includes('P1017') ||
    err.code === 'P1001' ||
    err.code === 'P1002' ||
    err.code === 'P1003' ||
    err.code === 'P1008' ||
    err.code === 'P1017'
  );
}

// If Postgres fails on the FIRST query, disable it for all subsequent calls
// to avoid repeated latency from connection timeouts on every request.
let postgresVerified = false;
let postgresDisabled = false;

async function tryPostgres(modelName, method, args) {
  if (!usePostgres || !prismaClient || postgresDisabled) return null;

  try {
    const result = await prismaClient[modelName][method](args);
    if (!postgresVerified) {
      postgresVerified = true;
      console.log('[FORGE DB] ✅ PostgreSQL connection verified successfully.');
    }
    return { ok: true, result };
  } catch (err) {
    if (isConnectionError(err)) {
      if (!postgresDisabled) {
        postgresDisabled = true;
        console.warn('[FORGE DB] ⚠️  PostgreSQL unreachable — switching to resilient in-memory store for this session.');
        console.warn('[FORGE DB]    Error:', err.message || err.code);
      }
      return null; // signal: use fallback
    }
    throw err; // rethrow non-connection errors (e.g., unique constraint violations)
  }
}

// ─── Resilient Model Proxies ──────────────────────────────────────────────────

function createModelProxy(modelName, storeKey) {
  return {
    async findUnique({ where, include } = {}) {
      const pg = await tryPostgres(modelName, 'findUnique', { where, include });
      if (pg) return pg.result;

      const list = store[storeKey] || [];
      let item = null;
      if (where.id !== undefined) item = list.find((x) => x.id === Number(where.id));
      if (where.email !== undefined) item = list.find((x) => String(x.email).toLowerCase() === String(where.email).toLowerCase());
      if (where.followerId_followingId) {
        item = list.find((x) => x.followerId === where.followerId_followingId.followerId && x.followingId === where.followerId_followingId.followingId);
      }
      if (where.userId_projectId) {
        item = list.find((x) => x.userId === where.userId_projectId.userId && x.projectId === where.userId_projectId.projectId);
      }
      return item ? attachRelations(item, storeKey, include) : null;
    },

    async findMany(args = {}) {
      const pg = await tryPostgres(modelName, 'findMany', args);
      if (pg) return pg.result;

      let list = [...(store[storeKey] || [])];
      const { where, orderBy, take, include } = args || {};

      if (where) {
        if (where.role) list = list.filter((x) => x.role === where.role);
        if (where.roomId) list = list.filter((x) => x.roomId === where.roomId);
        if (where.creatorId) list = list.filter((x) => x.creatorId === Number(where.creatorId));
        if (where.userId) list = list.filter((x) => x.userId === Number(where.userId));
        if (where.ownerId) list = list.filter((x) => x.ownerId === Number(where.ownerId));
        if (where.OR && Array.isArray(where.OR)) {
          list = list.filter((x) => {
            return where.OR.some((cond) => {
              if (cond.creatorId) return x.creatorId === Number(cond.creatorId);
              if (cond.expertId) return x.expertId === Number(cond.expertId);
              return false;
            });
          });
        }
      }

      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const dir = orderBy[key] === 'desc' ? -1 : 1;
        list.sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
      }

      if (take && typeof take === 'number') {
        list = list.slice(0, take);
      }

      return list.map((item) => attachRelations(item, storeKey, include));
    },

    async create({ data, include } = {}) {
      const pg = await tryPostgres(modelName, 'create', { data, include });
      if (pg) return pg.result;

      const list = store[storeKey] || [];
      const newItem = {
        id: list.length ? Math.max(...list.map((x) => x.id || 0)) + 1 : 1,
        ...data,
        createdAt: new Date(),
      };
      list.push(newItem);
      store[storeKey] = list;
      return attachRelations(newItem, storeKey, include);
    },

    async update({ where, data, include } = {}) {
      const pg = await tryPostgres(modelName, 'update', { where, data, include });
      if (pg) return pg.result;

      const list = store[storeKey] || [];
      const item = list.find((x) => x.id === Number(where.id));
      if (!item) throw new Error('Record not found.');
      Object.assign(item, data);
      return attachRelations(item, storeKey, include);
    },

    async delete({ where } = {}) {
      const pg = await tryPostgres(modelName, 'delete', { where });
      if (pg) return pg.result;

      const list = store[storeKey] || [];
      const index = list.findIndex((x) => x.id === Number(where.id));
      if (index > -1) {
        const [deleted] = list.splice(index, 1);
        return deleted;
      }
      return null;
    },

    async updateMany({ where, data } = {}) {
      const pg = await tryPostgres(modelName, 'updateMany', { where, data });
      if (pg) return pg.result;

      const list = store[storeKey] || [];
      let count = 0;
      list.forEach((item) => {
        if (!where || (where.userId && item.userId === Number(where.userId))) {
          Object.assign(item, data);
          count++;
        }
      });
      return { count };
    },
  };
}

function attachRelations(item, storeKey, include) {
  if (!item || !include) return item;
  const res = { ...item };

  if (include.sender || include.owner || include.author || include.creator || include.expert || include.sharedBy) {
    const userId = item.senderId || item.ownerId || item.authorId || item.creatorId || item.expertId || item.sharedById;
    const u = store.users.find((x) => x.id === userId) || store.users[0];
    if (include.sender) res.sender = u;
    if (include.owner) res.owner = u;
    if (include.author) res.author = u;
    if (include.creator) res.creator = u;
    if (include.expert) res.expert = u;
    if (include.sharedBy) res.sharedBy = u;
  }

  if (include.creator) {
    res.creator = store.users.find((x) => x.id === item.creatorId) || store.users[0];
  }
  if (include.expert) {
    res.expert = store.users.find((x) => x.id === item.expertId) || store.users[1];
  }

  if (include.comments) {
    res.comments = store.comments
      .filter((c) => c.projectId === item.id)
      .map((c) => ({
        ...c,
        author: store.users.find((u) => u.id === c.authorId) || store.users[0],
      }));
  }

  return res;
}

// Resilient DB Export Object
const db = {
  user: createModelProxy('user', 'users'),
  project: createModelProxy('project', 'projects'),
  comment: createModelProxy('comment', 'comments'),
  resource: createModelProxy('resource', 'resources'),
  booking: createModelProxy('booking', 'bookings'),
  notification: createModelProxy('notification', 'notifications'),
  chatMessage: createModelProxy('chatMessage', 'chatMessages'),
  pitchProposal: createModelProxy('pitchProposal', 'pitchProposals'),
  follow: createModelProxy('follow', 'follows'),
  projectUpvote: createModelProxy('projectUpvote', 'upvotes'),
  projectSave: createModelProxy('projectSave', 'saves'),
  async $queryRaw() {
    if (usePostgres && prismaClient && !postgresDisabled) {
      try {
        return await prismaClient.$queryRaw`SELECT 1`;
      } catch (err) {
        if (isConnectionError(err)) return [{ status: 'memory-fallback' }];
        throw err;
      }
    }
    return [{ status: 'memory-fallback' }];
  },
  // Expose the in-memory store for debugging purposes
  _store: store,
  _isUsingMemoryFallback: () => postgresDisabled || !usePostgres,
};

module.exports = db;
