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
      bio: 'Lecturer for Computer Architecture. Expert in processor design, pipeline optimization, memory hierarchies, and RISC-V instruction sets.',
      skills: 'Computer Architecture, RISC-V, Pipeline Design, Memory Systems, Hardware Engineering',
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
      bio: 'Partner at Antigravity Capital. 12+ years in venture capital across AI, SaaS, and deep tech. Former Y Combinator batch mentor.',
      skills: 'Venture Capital, Fundraising, Go-To-Market, Pitch Decks, Strategy',
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
      bio: 'Cloud Infrastructure & DevOps Architect. AWS Certified Solutions Architect. Helped 30+ startups scale to millions of users.',
      skills: 'Docker, Kubernetes, AWS, CI/CD, Terraform, Microservices',
      portfolioUrl: 'https://github.com/alexrivera',
      whatsappNumber: '+1987654323',
      preferredTheme: 'DARK',
      createdAt: new Date(),
    },
    {
      id: 5,
      email: 'ux@forge.dev',
      name: 'Amara Osei',
      password: DEMO_HASH,
      role: 'EXPERT',
      bio: 'Lead UX Designer at Google Design. Specialises in design systems, user research, and Figma component libraries for SaaS products.',
      skills: 'UX Research, Figma, Design Systems, Prototyping, Product Design',
      portfolioUrl: 'https://dribbble.com',
      whatsappNumber: '+233501234567',
      preferredTheme: 'LIGHT',
      createdAt: new Date(),
    },
    {
      id: 6,
      email: 'aiml@forge.dev',
      name: 'Dr. James Ofosu',
      password: DEMO_HASH,
      role: 'EXPERT',
      bio: 'AI/ML Research Scientist. Published in NeurIPS and ICML. Expert in neural network optimization, edge AI, and model compression.',
      skills: 'Machine Learning, Python, TensorFlow, PyTorch, Edge AI, NLP',
      portfolioUrl: 'https://github.com',
      whatsappNumber: '+233201234567',
      preferredTheme: 'DARK',
      createdAt: new Date(),
    },
  ],
  projects: [
    {
      id: 1,
      title: 'RISC-V Custom Coprocessor for Matrix Acceleration',
      description: 'An open-source custom instruction set extension for RISC-V processors designed specifically to accelerate neural network 8-bit quantized matrix inference on ultra-low-power edge FPGAs. Implemented SIMD units with 4.2x throughput speedup over standard RV64GC cores. Seeking guidance on L1 cache coherency and memory bandwidth optimization.',
      tags: 'computer-architecture, hardware, risc-v, edge-ai, fpga, verilog',
      ownerId: 1,
      initialUpvotes: 42,
      createdAt: new Date('2024-02-10T10:00:00Z'),
    },
    {
      id: 2,
      title: 'AirBed & Breakfast (P2P Homestay Marketplace)',
      description: 'A global peer-to-peer online marketplace enabling travelers to book short-term residential homestays directly from hosts. Built on a modular architecture supporting dynamic pricing, instant bookings, and verified identity reviews.',
      tags: 'marketplace, scalable, real-estate, ruby-on-rails, fintech',
      ownerId: 3,
      initialUpvotes: 58,
      createdAt: new Date('2024-03-15T14:30:00Z'),
    },
    {
      id: 3,
      title: 'UberCab (On-Demand Urban Logistics & Dispatch Engine)',
      description: 'High-concurrency geospatial dispatch protocol using spatial indexing (H3 hexagonal grid) to match riders with drivers in under 500ms. Scaled dynamically with surge pricing and automated driver payout routing.',
      tags: 'logistics, real-time, gps, mobile-app, distributed-systems',
      ownerId: 4,
      initialUpvotes: 49,
      createdAt: new Date('2024-04-01T09:15:00Z'),
    },
    {
      id: 4,
      title: 'Stripe Micro-Ledger & Idempotent API Gateway',
      description: 'Double-entry bookkeeping microservice with sub-millisecond idempotency guarantees built over Stripe Webhooks. Scaled to handle 1.2M daily transactions across 14 African currencies with zero payment drift.',
      tags: 'fintech, microservices, redis, node-js, payments',
      ownerId: 1,
      initialUpvotes: 36,
      createdAt: new Date('2024-04-20T11:45:00Z'),
    },
    {
      id: 5,
      title: 'Distributed GPU Inference Engine for LLMs',
      description: 'High-performance CUDA kernels for sharded tensor parallelism across heterogeneous GPU nodes. Reduces VRAM footprint by 65% while keeping latency under 12ms per token on Llama-3 70B models.',
      tags: 'ai-ml, python, pytorch, cuda, distributed-systems',
      ownerId: 6,
      initialUpvotes: 39,
      createdAt: new Date('2024-05-05T16:20:00Z'),
    },
    {
      id: 6,
      title: 'Figma Token Compiler & Automated Design Engine',
      description: 'Automated CI/CD plugin extracting Figma variables and design tokens into multi-theme CSS custom properties and React component libraries in real-time. Adopted across 35+ product engineering teams.',
      tags: 'design-systems, figma, typescript, react, UI-kit',
      ownerId: 5,
      initialUpvotes: 31,
      createdAt: new Date('2024-05-18T08:10:00Z'),
    },
  ],
  comments: [
    {
      id: 1,
      content: 'This RISC-V coprocessor implementation is very solid! Have you checked memory alignment for 64-bit vector loads? For pipeline hazards, forwarding paths directly into the SIMD execution units can cut 2 stall cycles. Happy to review your Verilog code on a WhatsApp call!',
      projectId: 1,
      authorId: 2, // Dr. Rose-Mary Gyening
      createdAt: new Date('2024-02-11T12:00:00Z'),
    },
    {
      id: 2,
      content: 'Great hardware architecture! If you are running on Xilinx FPGAs, check out AXI4-Stream interfaces for high-throughput tensor DMA transfers.',
      projectId: 1,
      authorId: 4, // Alex Rivera
      createdAt: new Date('2024-02-12T15:30:00Z'),
    },
    {
      id: 3,
      content: 'The unit economics on P2P marketplaces rely heavily on organic host acquisition. Make sure your instant-booking conversion funnel is optimized in early stages.',
      projectId: 2,
      authorId: 3, // Sarah Blake
      createdAt: new Date('2024-03-16T10:15:00Z'),
    },
    {
      id: 4,
      content: 'Geospatial H3 grid indexing is key for sub-500ms matching! Are you using Redis GeoSpatial or Spatialite in your core dispatch service?',
      projectId: 3,
      authorId: 4, // Alex Rivera
      createdAt: new Date('2024-04-02T14:20:00Z'),
    },
    {
      id: 5,
      content: 'Idempotency keys in headers with Redis distributed locks is definitely the gold standard for financial webhooks.',
      projectId: 4,
      authorId: 1, // Kai
      createdAt: new Date('2024-04-21T09:00:00Z'),
    },
  ],
  upvotes: [
    { id: 1, userId: 1, projectId: 1 },
    { id: 2, userId: 2, projectId: 1 },
    { id: 3, userId: 3, projectId: 2 },
    { id: 4, userId: 4, projectId: 3 },
  ],
  saves: [
    { id: 1, userId: 1, projectId: 1 },
  ],
  resources: [
    {
      id: 1,
      title: 'Next.js 14 Official Documentation',
      description: 'The React Framework for the Web. Learn about App Router, Server Actions, and more.',
      url: 'https://nextjs.org/docs',
      category: 'GUIDE',
      sharedById: 1,
      createdAt: new Date(),
    },
    {
      id: 2,
      title: 'Prisma ORM Full Course (YouTube)',
      description: 'Learn how to use Prisma with PostgreSQL in this comprehensive YouTube tutorial by Traversy Media.',
      url: 'https://www.youtube.com/watch?v=RebA5J-rlwg',
      category: 'TOOL',
      sharedById: 1,
      createdAt: new Date(),
    },
    {
      id: 3,
      title: 'Tailwind CSS UI Kit',
      description: 'Beautifully designed, fully responsive UI components built with Tailwind CSS.',
      url: 'https://tailwindui.com/',
      category: 'UI_KIT',
      sharedById: 1,
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
      title: 'Computer Architecture: A Quantitative Approach (Book)',
      description: 'The definitive textbook for computer architecture by Hennessy & Patterson. Essential for hardware engineers.',
      url: 'https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1',
      category: 'GUIDE',
      sharedById: 1,
      createdAt: new Date(),
    },
    {
      id: 8,
      title: 'RISC-V Instruction Set Spec (Official)',
      description: 'The official open-source RISC-V specification. Use this to build hardware, compilers, and OS kernels.',
      url: 'https://riscv.org/technical/specifications/',
      category: 'GUIDE',
      sharedById: 1,
      createdAt: new Date(),
    },
    {
      id: 9,
      title: 'Figma — Free Starter UI Kit',
      description: 'Material 3 Design Kit for Figma. Real production-grade Figma components maintained by Google.',
      url: 'https://www.figma.com/community/file/1035203688168086460',
      category: 'UI_KIT',
      sharedById: 5,
      createdAt: new Date(),
    },
    {
      id: 10,
      title: 'AngelList Venture — Raise a Round',
      description: 'Launch your startup syndicate, raise a rolling fund, or connect with angel investors on AngelList.',
      url: 'https://venture.angellist.com/',
      category: 'GUIDE',
      sharedById: 3,
      createdAt: new Date(),
    },
    {
      id: 11,
      title: 'Next.js App Router Starter Template',
      description: 'Official Vercel Next.js 14 starter with App Router, TypeScript, Tailwind, and Prisma pre-configured.',
      url: 'https://github.com/vercel/next.js/tree/canary/examples/with-prisma',
      category: 'TEMPLATE',
      sharedById: 1,
      createdAt: new Date(),
    },
    {
      id: 12,
      title: 'React Native Full Course 2024 (YouTube)',
      description: 'Build cross-platform mobile apps with React Native — from zero to production by Expo.',
      url: 'https://www.youtube.com/watch?v=ZBCUegTZF7M',
      category: 'TOOL',
      sharedById: 1,
      createdAt: new Date(),
    },
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
    if (!postgresDisabled) {
      postgresDisabled = true;
      console.warn('[FORGE DB] ⚠️  PostgreSQL query skipped/failed — activating resilient in-memory store.');
      console.warn('[FORGE DB]    Error:', err.message || err.code);
    }
    return null; // fallback signal: use memory store seamlessly
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
  if (!item) return item;
  const res = { ...item };

  if (include) {
    // Resolve each user relation from its specific FK field
    if (include.sender)   res.sender   = store.users.find((x) => x.id === item.senderId)   || null;
    if (include.owner)    res.owner    = store.users.find((x) => x.id === item.ownerId)    || null;
    if (include.author)   res.author   = store.users.find((x) => x.id === item.authorId)   || null;
    if (include.creator)  res.creator  = store.users.find((x) => x.id === item.creatorId)  || null;
    if (include.expert)   res.expert   = store.users.find((x) => x.id === item.expertId)   || null;
    if (include.sharedBy) res.sharedBy = store.users.find((x) => x.id === item.sharedById) || null;

    if (include.comments) {
      res.comments = (store.comments || [])
        .filter((c) => c.projectId === item.id)
        .map((c) => ({
          ...c,
          author: store.users.find((u) => u.id === c.authorId) || null,
        }));
    }

    if (include.upvotes) {
      res.upvotes = (store.upvotes || []).filter((u) => u.projectId === item.id);
    }

    if (include.saves) {
      res.saves = (store.saves || []).filter((s) => s.projectId === item.id);
    }
  }

  // Calculate stats for projects
  if (storeKey === 'projects') {
    const commentsForProj = (store.comments || []).filter((c) => c.projectId === item.id);
    const upvotesForProj = (store.upvotes || []).filter((u) => u.projectId === item.id);

    res.commentCount = commentsForProj.length;
    res.upvoteCount = (item.initialUpvotes || 0) + upvotesForProj.length;
    res._count = {
      comments: res.commentCount,
      upvotes: res.upvoteCount,
    };
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
