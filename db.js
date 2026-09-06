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
      title: 'RISC-V Custom Coprocessor for Matrix Acceleration (0x7F SIMD)',
      description: 'An open-source custom 64-bit vector instruction set extension for RISC-V RV64GC processors targeting 8-bit quantized neural matrix multiplication (opcode 0x7F). Features SIMD execution units, 64-bit vector register files, and non-blocking load/store queues achieving 4.2x throughput speedup over standard ISA. Verified on Xilinx UltraScale+ FPGA.',
      tags: 'computer-architecture, hardware, risc-v, edge-ai, fpga, verilog, simd',
      ownerId: 1,
      initialUpvotes: 142,
      createdAt: new Date('2024-02-10T10:00:00Z'),
    },
    {
      id: 2,
      title: 'AirBed & Breakfast (P2P Homestay Marketplace Platform)',
      description: 'A global peer-to-peer online marketplace enabling travelers to book short-term residential homestays directly from hosts. Built on a modular microservices architecture supporting dynamic surge pricing, instant booking confirmation, verified identity review funnels, and automated host payouts.',
      tags: 'marketplace, scalable, real-estate, ruby-on-rails, next-js, yc',
      ownerId: 3,
      initialUpvotes: 156,
      createdAt: new Date('2024-03-15T14:30:00Z'),
    },
    {
      id: 3,
      title: 'UberCab Real-Time Spatial Dispatch Engine',
      description: 'High-concurrency geospatial dispatch protocol utilizing Uber H3 hexagonal spatial indexing and Redis GeoSpatial indices to match riders with drivers in under 450ms. Scaled dynamically with surge pricing and automated driver payout routing.',
      tags: 'logistics, real-time, gps, h3-hexagons, mobile-app, distributed-systems',
      ownerId: 4,
      initialUpvotes: 119,
      createdAt: new Date('2024-04-01T09:15:00Z'),
    },
    {
      id: 4,
      title: 'Stripe Micro-Ledger & Idempotent API Gateway',
      description: 'Double-entry bookkeeping microservice with sub-millisecond idempotency guarantees built over Stripe Webhooks. Uses Redis distributed locks (redlock) and PostgreSQL transactional logs to process 1.2M daily transactions across 14 African currencies with zero payment drift.',
      tags: 'fintech, microservices, redis, node-js, payments, stripe',
      ownerId: 1,
      initialUpvotes: 128,
      createdAt: new Date('2024-04-20T11:45:00Z'),
    },
    {
      id: 5,
      title: 'CUDA Tensor Core Matrix Engine (FP16/INT8)',
      description: 'High-performance C++/CUDA kernels for sharded tensor parallelism across heterogeneous GPU nodes. Achieved 92% linear scaling efficiency across 16 RTX 4090 / A100 GPU nodes while keeping token generation latency under 11.8ms on Llama-3 70B models.',
      tags: 'ai-ml, cuda, pytorch, gpu, tensor-cores, deep-learning',
      ownerId: 6,
      initialUpvotes: 135,
      createdAt: new Date('2024-05-05T16:20:00Z'),
    },
    {
      id: 6,
      title: 'Figma Production Token Compiler & UI Engine',
      description: 'Automated CI/CD plugin extracting Figma variables and design tokens into multi-theme CSS custom properties and React component libraries in real-time. Adopted across 35+ product engineering teams.',
      tags: 'design-systems, figma, typescript, react, ui-kit, tailwind',
      ownerId: 5,
      initialUpvotes: 98,
      createdAt: new Date('2024-05-18T08:10:00Z'),
    },
    {
      id: 7,
      title: 'Zero-Knowledge Identity Vault & zk-SNARK Verifier',
      description: 'Privacy-preserving identity verification protocol using zk-SNARKs (groth16 proof system) to prove credentials without revealing underlying PII. Written in Rust with WebAssembly bindings running at 60 FPS in browser.',
      tags: 'cryptography, zk-snarks, rust, security, web3, wasm',
      ownerId: 1,
      initialUpvotes: 112,
      createdAt: new Date('2024-05-25T11:00:00Z'),
    },
    {
      id: 8,
      title: 'Kubernetes Multi-Region Failover & Ingress Mesh',
      description: 'Declarative Infrastructure-as-Code Terraform repository setting up multi-region EKS clusters with Istio service mesh, cert-manager auto-renewal, and cross-region Postgres read-replica failover under 3 seconds.',
      tags: 'devops, kubernetes, aws, docker, cloud, terraform',
      ownerId: 4,
      initialUpvotes: 87,
      createdAt: new Date('2024-06-01T14:40:00Z'),
    },
    {
      id: 9,
      title: 'EdgeTensor: RISC-V NPU for Private On-Device AI',
      description: 'A test-ready deep-tech startup concept: a RISC-V RV64GC edge SoC with a 128-MAC INT8 neural-processing coprocessor, 512 KB scratchpad SRAM, DMA-fed double buffering, and a coherent L2 cache. The MVP targets sub-8 W industrial vision gateways, running quantized defect-detection models below 20 ms while keeping sensitive video on-device. Current FPGA prototype achieves 31 FPS on 1080p input and 3.6 TOPS/W estimated efficiency. Seeking design partners in manufacturing and logistics.',
      tags: 'computer-architecture, risc-v, npu, edge-ai, fpga, memory-hierarchy, dma, startup',
      ownerId: 1,
      initialUpvotes: 64,
      createdAt: new Date('2026-09-01T10:00:00Z'),
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
    {
      id: 6,
      content: 'CUDA tensor core GEMM efficiency is impressive! 92% scaling across 16 GPUs with half-precision FP16 is production ready.',
      projectId: 5,
      authorId: 6, // Dr. James Ofosu
      createdAt: new Date('2024-05-06T11:00:00Z'),
    },
    {
      id: 7,
      content: 'For EdgeTensor, lead the pitch with the memory story: double-buffered DMA keeps the MAC array busy while the next tile arrives. Investors will understand that as lower latency, lower power, and a defensible hardware/software co-design moat.',
      projectId: 9,
      authorId: 2,
      createdAt: new Date('2026-09-02T09:30:00Z'),
    },
  ],
  upvotes: [
    { id: 1, userId: 1, projectId: 1 },
    { id: 2, userId: 2, projectId: 1 },
    { id: 3, userId: 3, projectId: 2 },
    { id: 4, userId: 4, projectId: 3 },
    { id: 5, userId: 2, projectId: 9 },
    { id: 6, userId: 6, projectId: 9 },
  ],
  saves: [
    { id: 1, userId: 1, projectId: 1 },
  ],
  resources: [
    // ── GITHUB REPOSITORIES (5+ WORKING EXAMPLES) ──
    {
      id: 1,
      title: 'Vercel Next.js 14 Production Repository',
      description: 'Official open-source Next.js repository with App Router, Server Actions, and React Server Components.',
      url: 'https://github.com/vercel/next.js',
      category: 'GITHUB_REPO',
      sharedById: 1,
      createdAt: new Date('2024-01-10T10:00:00Z'),
    },
    {
      id: 2,
      title: 'RISC-V ISA Manual & Hardware Specification Repo',
      description: 'Official RISC-V International ISA manual and hardware specification for custom matrix SIMD extensions.',
      url: 'https://github.com/riscv/riscv-isa-manual',
      category: 'GITHUB_REPO',
      sharedById: 2,
      createdAt: new Date('2024-01-15T11:30:00Z'),
    },
    {
      id: 3,
      title: 'Prisma ORM & PostgreSQL Production Examples Repo',
      description: 'Comprehensive code samples demonstrating relational database schemas, connection pooling, and migrations.',
      url: 'https://github.com/prisma/prisma-examples',
      category: 'GITHUB_REPO',
      sharedById: 4,
      createdAt: new Date('2024-02-12T14:15:00Z'),
    },
    {
      id: 4,
      title: 'NVIDIA CUDA Tensor Core Matrix Multiplication Kernels Repo',
      description: 'High-performance C++/CUDA sample code for GEMM matrix multiplication optimized for NVIDIA Tensor Cores.',
      url: 'https://github.com/NVIDIA/cuda-samples',
      category: 'GITHUB_REPO',
      sharedById: 6,
      createdAt: new Date('2024-03-01T10:45:00Z'),
    },
    {
      id: 5,
      title: 'Stripe Node.js Official Financial SDK Repo',
      description: 'Production Node.js microservice SDK implementing financial idempotency headers and transaction logs.',
      url: 'https://github.com/stripe/stripe-node',
      category: 'GITHUB_REPO',
      sharedById: 1,
      createdAt: new Date('2024-04-18T13:10:00Z'),
    },
    {
      id: 6,
      title: 'Kubernetes Production Cluster Manifests Repo',
      description: 'Declarative K8s YAML manifests for ingress controllers, cert-manager, auto-scaling, and rolling updates.',
      url: 'https://github.com/kubernetes/examples',
      category: 'GITHUB_REPO',
      sharedById: 4,
      createdAt: new Date('2024-05-02T11:00:00Z'),
    },
    {
      id: 7,
      title: 'PyTorch Distributed Data Parallel (DDP) Multi-GPU Repo',
      description: 'Step-by-step repository and python scripts for multi-GPU model training using PyTorch DDP.',
      url: 'https://github.com/pytorch/examples',
      category: 'GITHUB_REPO',
      sharedById: 6,
      createdAt: new Date('2024-05-14T09:40:00Z'),
    },

    // ── COMPUTER ARCHITECTURE & HARDWARE (5+ WORKING EXAMPLES) ──
    {
      id: 8,
      title: 'RISC-V Unprivileged ISA Specification (Official Portal)',
      description: 'Official RISC-V International specification for base integer ISAs and custom coprocessor extensions.',
      url: 'https://riscv.org/technical/specifications/',
      category: 'HARDWARE',
      sharedById: 2,
      createdAt: new Date('2024-01-20T10:00:00Z'),
    },
    {
      id: 9,
      title: 'Computer Architecture: A Quantitative Approach (Harvard Reference)',
      description: 'Academic reference by Hennessy & Patterson covering instruction-level parallelism, cache hierarchy, and memory buses.',
      url: 'https://www.eecs.harvard.edu/~dbrooks/cs146-spring2004/',
      category: 'HARDWARE',
      sharedById: 2,
      createdAt: new Date('2024-03-22T15:20:00Z'),
    },
    {
      id: 10,
      title: 'CHIPS Alliance Open Source Hardware Repositories',
      description: 'Open-source hardware organization developing open silicon, EDA tools, and RISC-V cores.',
      url: 'https://chipsalliance.org/',
      category: 'HARDWARE',
      sharedById: 2,
      createdAt: new Date('2024-03-25T11:00:00Z'),
    },
    {
      id: 11,
      title: 'OpenTitan Open Source Silicon Root of Trust',
      description: 'Transparent, high-quality reference design for silicon root of trust chips maintained by lowRISC.',
      url: 'https://opentitan.org/',
      category: 'HARDWARE',
      sharedById: 2,
      createdAt: new Date('2024-04-02T16:00:00Z'),
    },
    {
      id: 12,
      title: 'Xilinx Vivado FPGA Design Suite Portal',
      description: 'Complete FPGA logic synthesis, placement, routing, and IP integration suite for hardware engineers.',
      url: 'https://www.xilinx.com/products/design-tools/vivado.html',
      category: 'HARDWARE',
      sharedById: 2,
      createdAt: new Date('2024-04-10T09:30:00Z'),
    },
    {
      id: 33,
      title: 'lowRISC SoC Design Platform (ibex RISC-V Core)',
      description: 'Industrial-grade open-source RISC-V 32-bit embedded processor core in SystemVerilog used by Google OpenTitan silicon.',
      url: 'https://lowrisc.org/',
      category: 'HARDWARE',
      sharedById: 2,
      createdAt: new Date('2024-04-20T10:00:00Z'),
    },

    // ── STARTUP & FUNDING TEMPLATES (5+ WORKING EXAMPLES) ──
    {
      id: 13,
      title: 'Y Combinator SAFE Investor Template & Documents',
      description: 'The standard Simple Agreement for Future Equity (Post-Money SAFE) used globally for early-stage startup fundraising.',
      url: 'https://www.ycombinator.com/documents/',
      category: 'TEMPLATE',
      sharedById: 3,
      createdAt: new Date('2024-02-01T09:00:00Z'),
    },
    {
      id: 14,
      title: 'AngelList Venture Capital Investor Portal',
      description: 'Direct portal connecting tech founders with accredited angel syndicates and early-stage venture funds.',
      url: 'https://www.angellist.com/',
      category: 'TEMPLATE',
      sharedById: 3,
      createdAt: new Date('2024-04-05T08:30:00Z'),
    },
    {
      id: 15,
      title: 'Seedcamp Founder & Term Sheet Resources',
      description: 'Europe\'s leading seed fund term sheet templates, cap table calculators, and investor pitch deck guidelines.',
      url: 'https://www.seedcamp.com/resources/',
      category: 'TEMPLATE',
      sharedById: 3,
      createdAt: new Date('2024-04-12T14:00:00Z'),
    },
    {
      id: 16,
      title: 'NVCA Standard Venture Capital Model Legal Documents',
      description: 'National Venture Capital Association standardized term sheets, stock purchase agreements, and voting rights templates.',
      url: 'https://nvca.org/model-legal-documents/',
      category: 'TEMPLATE',
      sharedById: 3,
      createdAt: new Date('2024-04-20T10:15:00Z'),
    },
    {
      id: 17,
      title: 'Stripe Atlas Startup Incorporation & Legal Guide',
      description: 'Form a Delaware C-Corp, issue founder stock, and set up US banking in days for global tech startups.',
      url: 'https://stripe.com/atlas',
      category: 'TEMPLATE',
      sharedById: 3,
      createdAt: new Date('2024-04-28T12:00:00Z'),
    },

    // ── UI KITS & DESIGN TOKENS (5+ WORKING EXAMPLES) ──
    {
      id: 18,
      title: 'Figma Community Production Design Tokens & UI Kit 2024',
      description: 'Complete Figma design kit featuring auto-layout components, color tokens, and accessible typography scale.',
      url: 'https://www.figma.com/community',
      category: 'UI_KIT',
      sharedById: 5,
      createdAt: new Date('2024-02-20T16:00:00Z'),
    },
    {
      id: 19,
      title: 'Tailwind CSS Official Component Library & Design Tokens',
      description: 'Utility-first CSS framework for rapid UI development with responsive grid and dark mode tokens.',
      url: 'https://tailwindcss.com/docs',
      category: 'UI_KIT',
      sharedById: 5,
      createdAt: new Date('2024-03-05T09:15:00Z'),
    },
    {
      id: 20,
      title: 'Shadcn UI Accessible Component System',
      description: 'Beautifully designed, accessible Radix UI and Tailwind CSS components copy-pasteable into React apps.',
      url: 'https://ui.shadcn.com/',
      category: 'UI_KIT',
      sharedById: 5,
      createdAt: new Date('2024-03-18T11:45:00Z'),
    },
    {
      id: 21,
      title: 'Google Material Design 3 Figma Design System',
      description: 'Google official Material 3 component library for Android and Web design with dynamic color tokens.',
      url: 'https://m3.material.io/',
      category: 'UI_KIT',
      sharedById: 5,
      createdAt: new Date('2024-04-01T15:30:00Z'),
    },
    {
      id: 22,
      title: 'Lucide Icons Open Source Iconography System',
      description: 'Clean, consistent open-source icon set with React, Vue, and SVG packages maintained by community.',
      url: 'https://lucide.dev/',
      category: 'UI_KIT',
      sharedById: 5,
      createdAt: new Date('2024-04-15T08:20:00Z'),
    },

    // ── DOCUMENTATION & GUIDES (5+ WORKING EXAMPLES) ──
    {
      id: 23,
      title: 'Next.js App Router & Server Actions Official Guide',
      description: 'Complete Vercel guide on React Server Components, dynamic routing, caching, and Server Actions.',
      url: 'https://nextjs.org/docs',
      category: 'GUIDE',
      sharedById: 1,
      createdAt: new Date('2024-01-12T10:00:00Z'),
    },
    {
      id: 24,
      title: 'Prisma ORM Schema & PostgreSQL Integration Guide',
      description: 'Comprehensive documentation covering type-safe database queries, raw SQL, and connection pooling.',
      url: 'https://www.prisma.io/docs',
      category: 'GUIDE',
      sharedById: 4,
      createdAt: new Date('2024-02-14T14:30:00Z'),
    },
    {
      id: 25,
      title: 'PyTorch Distributed Data Parallel Multi-GPU Tutorial',
      description: 'Step-by-step guide on scaling PyTorch neural net training across multiple GPUs and nodes with DDP.',
      url: 'https://pytorch.org/tutorials/intermediate/ddp_tutorial.html',
      category: 'GUIDE',
      sharedById: 6,
      createdAt: new Date('2024-03-02T09:00:00Z'),
    },
    {
      id: 26,
      title: 'Docker Multi-Stage Build & Production Image Best Practices',
      description: 'Official Docker documentation on optimizing image size, security vulnerability scanning, and caching.',
      url: 'https://docs.docker.com/develop/develop-images/dockerfile_best-practices/',
      category: 'GUIDE',
      sharedById: 4,
      createdAt: new Date('2024-03-20T16:15:00Z'),
    },
    {
      id: 27,
      title: 'Stripe Financial Webhooks & Idempotency Best Practices',
      description: 'Official Stripe developer guide on webhook signature validation, idempotency headers, and retry logic.',
      url: 'https://stripe.com/docs/api/idempotency',
      category: 'GUIDE',
      sharedById: 1,
      createdAt: new Date('2024-04-10T11:00:00Z'),
    },

    // ── PLATFORMS & CLOUD TOOLS (5+ WORKING EXAMPLES) ──
    {
      id: 28,
      title: 'AWS Activate Startup Cloud Infrastructure Credits Portal',
      description: 'Apply for up to $100,000 in AWS credits covering EC2 compute, S3 storage, and RDS database hosting.',
      url: 'https://aws.amazon.com/activate/',
      category: 'TOOL',
      sharedById: 4,
      createdAt: new Date('2024-03-10T12:00:00Z'),
    },
    {
      id: 29,
      title: 'Vercel Developer Platform & Edge Network Infrastructure',
      description: 'Global serverless edge network for deploying Next.js, React, and serverless functions with zero config.',
      url: 'https://vercel.com/docs',
      category: 'TOOL',
      sharedById: 1,
      createdAt: new Date('2024-03-15T10:00:00Z'),
    },
    {
      id: 30,
      title: 'Supabase Realtime PostgreSQL Cloud Platform',
      description: 'Open source Firebase alternative providing PostgreSQL databases, Auth, Edge Functions, and Vector storage.',
      url: 'https://supabase.com/docs',
      category: 'TOOL',
      sharedById: 1,
      createdAt: new Date('2024-03-28T14:45:00Z'),
    },
    {
      id: 31,
      title: 'Postman API Platform & Automated Webhook Suite',
      description: 'API development ecosystem for building, testing, documenting, and sharing REST and GraphQL APIs.',
      url: 'https://www.postman.com/',
      category: 'TOOL',
      sharedById: 4,
      createdAt: new Date('2024-04-05T09:20:00Z'),
    },
    {
      id: 32,
      title: 'Docker Hub Production Container Registry',
      description: 'World largest library and community for container images, automated builds, and security scans.',
      url: 'https://hub.docker.com/',
      category: 'TOOL',
      sharedById: 4,
      createdAt: new Date('2024-04-18T15:00:00Z'),
    },

    // ── COPY-READY CODE SNIPPETS (REAL, MAINTAINED EXAMPLES) ──
    {
      id: 34,
      title: 'Express Production Security Best-Practices Snippets',
      description: 'Practical Express patterns for TLS, Helmet, secure cookies, input validation, and dependency hygiene. Useful when hardening Forge-style Node APIs.',
      url: 'https://expressjs.com/en/advanced/best-practice-security.html',
      category: 'CODE_SNIPPET',
      sharedById: 4,
      createdAt: new Date('2024-05-01T09:00:00Z'),
    },
    {
      id: 35,
      title: 'RISC-V Assembly Programming Examples',
      description: 'Runnable RISC-V assembly examples covering arithmetic, branches, stack frames, function calls, and memory access—ideal for testing ISA and pipeline concepts.',
      url: 'https://github.com/TheThirdOne/rars/tree/master/examples',
      category: 'CODE_SNIPPET',
      sharedById: 2,
      createdAt: new Date('2024-05-03T11:30:00Z'),
    },
    {
      id: 36,
      title: 'OpenAI API JavaScript Examples',
      description: 'Official JavaScript examples for structured responses, streaming, tools, and error handling. A solid reference for testing an AI-assisted product workflow.',
      url: 'https://github.com/openai/openai-node/tree/master/examples',
      category: 'CODE_SNIPPET',
      sharedById: 6,
      createdAt: new Date('2024-05-06T14:15:00Z'),
    },
    {
      id: 37,
      title: 'CUDA Matrix Multiplication Sample',
      description: 'Official CUDA sample demonstrating tiled matrix multiplication, shared-memory locality, and the performance trade-offs behind GPU compute kernels.',
      url: 'https://github.com/NVIDIA/cuda-samples/tree/master/Samples/6_Performance/MatrixMul',
      category: 'CODE_SNIPPET',
      sharedById: 6,
      createdAt: new Date('2024-05-09T10:45:00Z'),
    },
    {
      id: 38,
      title: 'SystemVerilog RTL Style Guide & Examples',
      description: 'Synthesizable RTL conventions and code examples for clear state machines, reset behaviour, and safe combinational/sequential logic.',
      url: 'https://github.com/lowRISC/style-guides/blob/master/VerilogCodingStyle.md',
      category: 'CODE_SNIPPET',
      sharedById: 2,
      createdAt: new Date('2024-05-12T16:00:00Z'),
    },
  ],

  bookings: [],
  notifications: [],
  chatMessages: [
    {
      id: 1,
      senderId: 1,
      roomId: 'general-collaboration',
      content: 'Welcome to Forge! We have integrated Next.js 14, Prisma ORM, and custom RISC-V coprocessor models. 🚀',
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: 2,
      senderId: 2,
      roomId: 'general-collaboration',
      content: 'Hello creators! I am available for 1:1 consultation sessions on computer architecture pipelines, FPGA synthesis, and Verilog hardware cores.',
      createdAt: new Date(Date.now() - 72000000),
    },
    {
      id: 3,
      senderId: 3,
      roomId: 'general-collaboration',
      content: 'Founders looking for VC pitch deck reviews or Y Combinator guidance, feel free to reach out via WhatsApp or book a session!',
      createdAt: new Date(Date.now() - 43200000),
    },
    {
      id: 4,
      senderId: 1,
      roomId: 'comp-arch-hardware',
      content: '@Dr. Rose-Mary Gyening We are benchmarking 8-bit quantized matrix inference on RISC-V. How do we prevent L1 cache write-back stalls?',
      createdAt: new Date(Date.now() - 36000000),
    },
    {
      id: 5,
      senderId: 2,
      roomId: 'comp-arch-hardware',
      content: 'Great question! Implementing 64-bit SIMD vector registers with non-blocking load/store queues will hide memory latency. Check out the ISA spec in Resources!',
      createdAt: new Date(Date.now() - 28800000),
    },
    {
      id: 6,
      senderId: 6,
      roomId: 'comp-arch-hardware',
      content: 'Agreed! Matrix forwarding paths directly into execution units can cut 2 stall cycles per GEMM iteration.',
      createdAt: new Date(Date.now() - 21600000),
    },
    {
      id: 7,
      senderId: 1,
      roomId: 'fundraising-vcs',
      content: 'What metrics do top VC syndicates care most about for early-stage B2B dev tools?',
      createdAt: new Date(Date.now() - 18000000),
    },
    {
      id: 8,
      senderId: 3,
      roomId: 'fundraising-vcs',
      content: 'At pre-seed, it is founder execution velocity and organic developer adoption! Show clear weekly active usage and clean unit economics.',
      createdAt: new Date(Date.now() - 14400000),
    },
    {
      id: 9,
      senderId: 4,
      roomId: 'devops-cloud',
      content: 'If you are deploying Next.js + Prisma on Vercel with PostgreSQL, make sure to cap connection pool max to 3 to prevent pool exhaustion!',
      createdAt: new Date(Date.now() - 10800000),
    },
    {
      id: 10,
      senderId: 1,
      roomId: 'devops-cloud',
      content: 'Thanks Alex! Applied the pool configuration and response latency dropped to 45ms.',
      createdAt: new Date(Date.now() - 7200000),
    },
    {
      id: 11,
      senderId: 6,
      roomId: 'ai-ml-models',
      content: 'Just benchmarked PyTorch DDP across 16 GPU nodes. VRAM consumption dropped 65% on Llama-3 70B fine-tuning.',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: 12,
      senderId: 5,
      roomId: 'ai-ml-models',
      content: 'That speed is incredible! We are building automated Figma component generators using that exact pipeline.',
      createdAt: new Date(Date.now() - 1800000),
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
