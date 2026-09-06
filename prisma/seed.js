const prisma = require('../db');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Starting database seeding...');

  await prisma.notification.deleteMany({});
  await prisma.projectUpvote.deleteMany({});
  await prisma.projectSave.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const creator = await prisma.user.create({
    data: {
      email: 'creator@forge.dev',
      name: 'Alex Creator',
      password: hashedPassword,
      role: 'CREATOR',
      bio: 'Full-stack developer building creator tools. Passionate about Web3 and indie SaaS.',
      skills: 'React, Node.js, Product Design',
      portfolioUrl: 'https://alexcreator.dev',
    },
  });

  const expert = await prisma.user.create({
    data: {
      email: 'expert@forge.dev',
      name: 'Sarah Expert',
      password: hashedPassword,
      role: 'EXPERT',
      bio: 'Senior UX lead & brand strategist. 10+ years helping startups nail product-market fit.',
      skills: 'UX Design, Brand Strategy, Figma, User Research',
      portfolioUrl: 'https://sarahdesigns.co',
    },
  });

  const expert2 = await prisma.user.create({
    data: {
      email: 'mentor@forge.dev',
      name: 'Jordan Lee',
      password: hashedPassword,
      role: 'EXPERT',
      bio: 'Staff engineer & technical writer. I help teams ship docs and developer experience.',
      skills: 'Technical Writing, API Design, Developer Experience, React',
      portfolioUrl: 'https://jordanlee.dev',
    },
  });

  const expert3 = await prisma.user.create({
    data: {
      email: 'maya@forge.dev',
      name: 'Maya Patel',
      password: hashedPassword,
      role: 'EXPERT',
      bio: 'Cloud architect & DevOps mentor. AWS certified. Helping teams scale infrastructure.',
      skills: 'AWS, Docker, Kubernetes, CI/CD, Terraform',
      portfolioUrl: 'https://mayapatel.cloud',
    },
  });

  const creator2 = await prisma.user.create({
    data: {
      email: 'kai@forge.dev',
      name: 'Kai Nakamura',
      password: hashedPassword,
      role: 'CREATOR',
      bio: 'Mobile developer & accessibility advocate. Building inclusive apps for everyone.',
      skills: 'React Native, Swift, Accessibility, TypeScript',
      portfolioUrl: 'https://kaibuilds.io',
    },
  });

  const demo = await prisma.user.create({
    data: {
      email: 'demo@forge.dev',
      name: 'Demo User',
      password: hashedPassword,
      role: 'CREATOR',
      bio: 'Quick demo account for exploring Forge.',
      skills: 'Exploring, Feedback, Collaboration',
    },
  });

  const embeddedCreator = await prisma.user.create({
    data: {
      email: 'nora@forge.dev', name: 'Nora Mensah', password: hashedPassword, role: 'CREATOR',
      bio: 'Embedded-systems engineer building practical edge-AI tools for factories and field teams.',
      skills: 'C++, Embedded Linux, FPGA, Computer Vision, MQTT', portfolioUrl: 'https://github.com',
    },
  });
  const systemsCreator = await prisma.user.create({
    data: {
      email: 'daniel@forge.dev', name: 'Daniel Owusu', password: hashedPassword, role: 'CREATOR',
      bio: 'Product-minded backend developer interested in reliable systems and developer experience.',
      skills: 'Node.js, PostgreSQL, Redis, API Design, Observability', portfolioUrl: 'https://github.com',
    },
  });
  const designCreator = await prisma.user.create({
    data: {
      email: 'leila@forge.dev', name: 'Leila Haddad', password: hashedPassword, role: 'CREATOR',
      bio: 'Interaction designer translating complex ML and infrastructure tools into usable products.',
      skills: 'Figma, UX Research, Data Visualisation, Design Systems', portfolioUrl: 'https://dribbble.com',
    },
  });

  console.log('👤 Created users:');
  console.log('  - Creator: creator@forge.dev');
  console.log('  - Creator: kai@forge.dev');
  console.log('  - Expert:  expert@forge.dev');
  console.log('  - Expert:  mentor@forge.dev');
  console.log('  - Expert:  maya@forge.dev');
  console.log('  - Demo:    demo@forge.dev');
  console.log('  Password for all: Password123!');

  // -- Projects / Ideas --
  const project1 = await prisma.project.create({
    data: {
      title: 'Decentralized Creator Cooperatives',
      description:
        'A platform to help digital creators pool resources, share legal templates, and co-own digital storefronts. Looking for a smart contract dev and a legal tech writer.',
      tags: 'Web3, Co-op, Creator Economy',
      ownerId: creator.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      title: 'AI-Powered Storyboarding for Indie Filmmakers',
      description:
        'Generating consistent character styleframes from simple scene scripts to reduce pre-production overhead. Need a designer to help with the visual language.',
      tags: 'AI, Filmmaking, SaaS',
      ownerId: creator.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      title: 'Open Design System for Dev Tools',
      description:
        'A shared component library and documentation kit for developer-facing products — looking for a technical writer and React contributor.',
      tags: 'Design System, React, Docs',
      ownerId: demo.id,
    },
  });

  const project4 = await prisma.project.create({
    data: {
      title: 'Accessible Color Palette Generator',
      description:
        'An interactive tool that generates WCAG-compliant color palettes with real-time contrast ratio checking. Looking for UX feedback and accessibility testers.',
      tags: 'Accessibility, Design, Tools',
      ownerId: creator2.id,
    },
  });

  const project5 = await prisma.project.create({
    data: {
      title: 'Community-Driven API Documentation Hub',
      description:
        'Think StackOverflow meets API docs. Community members can annotate, improve, and rate API documentation for popular open-source projects.',
      tags: 'Docs, Community, Open Source',
      ownerId: creator2.id,
    },
  });

  const project6 = await prisma.project.create({
    data: {
      title: 'Real-time Collaboration Canvas for Remote Teams',
      description:
        'A lightweight whiteboard app with built-in voice chat for distributed teams. Focus on low-latency drawing and intuitive gesture controls.',
      tags: 'Collaboration, WebRTC, Canvas',
      ownerId: creator.id,
    },
  });

  // This is deliberately detailed so the AI proposal engine can be tested with
  // concrete compute-architecture inputs instead of generic SaaS copy.
  const project7 = await prisma.project.create({
    data: {
      title: 'EdgeTensor RISC-V NPU for Private Industrial Vision',
      description:
        'A RISC-V RV64GC edge SoC with a 128-MAC INT8 neural-processing coprocessor, 512 KB scratchpad SRAM, DMA-fed double buffering, and coherent L2 cache. The FPGA MVP targets sub-8 W industrial gateways for private defect detection, with 31 FPS at 1080p and a sub-20 ms end-to-end latency target. We need manufacturing design partners and an RTL verification specialist.',
      tags: 'Computer Architecture, RISC-V, NPU, Edge AI, FPGA, DMA, Memory Hierarchy',
      ownerId: creator.id,
    },
  });
  const project8 = await prisma.project.create({
    data: {
      title: 'CacheScope: Interactive Memory-Hierarchy Visualiser',
      description: 'A browser-based tool that turns CPU cache traces into interactive L1/L2/DRAM timelines. Students can compare direct-mapped, set-associative, and fully-associative caches while observing compulsory, capacity, and conflict misses.',
      tags: 'Computer Architecture, Cache, Memory Hierarchy, Education, Visualisation', ownerId: designCreator.id,
    },
  });
  const project9 = await prisma.project.create({
    data: {
      title: 'Reliable Sensor Telemetry for Cold-Chain Logistics',
      description: 'Offline-tolerant telemetry for refrigerated delivery: LoRaWAN gateways batch signed readings, an idempotent event stream accepts retries, and a dashboard surfaces temperature excursions before product spoils.',
      tags: 'IoT, Distributed Systems, Observability, Logistics, Edge Compute', ownerId: embeddedCreator.id,
    },
  });

  // -- Comments --
  await prisma.comment.create({
    data: {
      content:
        'This is highly needed. The legal frameworks around shared storefronts are incredibly messy right now.',
      projectId: project1.id,
      authorId: expert.id,
    },
  });
  await prisma.comment.create({
    data: { content: 'Include a prefetch view so learners can see when it helps throughput but creates wasted memory bandwidth.', projectId: project8.id, authorId: embeddedCreator.id },
  });
  await prisma.comment.create({
    data: { content: 'Use stable device IDs and idempotency keys from day one. Gateway retry storms are inevitable after connectivity returns.', projectId: project9.id, authorId: systemsCreator.id },
  });
  await prisma.comment.create({
    data: { content: 'Present EdgeTensor accuracy, latency, and power together; operators need a clear decision, not a wall of microarchitecture terms.', projectId: project7.id, authorId: designCreator.id },
  });

  await prisma.comment.create({
    data: {
      content: 'Lead your benchmark with end-to-end latency and TOPS/W, then show how DMA double buffering keeps the MAC array fed. That makes the memory-hierarchy advantage legible to both customers and investors.',
      projectId: project7.id,
      authorId: expert3.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'I\'d love to contribute on the smart contract side. Have experience with Solidity and audits.',
      projectId: project1.id,
      authorId: creator2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Happy to review your UX flows for the onboarding funnel.',
      projectId: project3.id,
      authorId: expert2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'The storyboarding concept is brilliant. Have you considered using Stable Diffusion for the styleframe generation?',
      projectId: project2.id,
      authorId: expert2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Great idea! I can help with the WCAG compliance testing. Let me know when you have a prototype.',
      projectId: project4.id,
      authorId: expert.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'This would be a game-changer for open source projects. Would love to collaborate on the annotation system.',
      projectId: project5.id,
      authorId: demo.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'WebRTC can be tricky for latency. Have you considered using CRDTs for the drawing state?',
      projectId: project6.id,
      authorId: expert3.id,
    },
  });

  // -- Upvotes --
  await prisma.projectUpvote.createMany({
    data: [
      { userId: expert.id, projectId: project1.id },
      { userId: expert2.id, projectId: project1.id },
      { userId: demo.id, projectId: project1.id },
      { userId: creator2.id, projectId: project1.id },
      { userId: expert3.id, projectId: project1.id },
      { userId: creator.id, projectId: project2.id },
      { userId: expert2.id, projectId: project2.id },
      { userId: expert.id, projectId: project3.id },
      { userId: creator2.id, projectId: project3.id },
      { userId: expert.id, projectId: project4.id },
      { userId: expert2.id, projectId: project4.id },
      { userId: creator.id, projectId: project4.id },
      { userId: demo.id, projectId: project5.id },
      { userId: expert3.id, projectId: project5.id },
      { userId: creator.id, projectId: project6.id },
      { userId: expert3.id, projectId: project6.id },
      { userId: creator2.id, projectId: project6.id },
      { userId: expert.id, projectId: project7.id },
      { userId: expert2.id, projectId: project7.id },
      { userId: expert3.id, projectId: project7.id },
    ],
  });

  // -- Resources --
  await prisma.resource.createMany({
    data: [
      {
        title: 'Sponsorship Pitch Deck Template',
        description: 'The exact slide layout used to secure $50k+ brand deals. Completely customizable in Figma and Google Slides.',
        url: 'https://www.ycombinator.com/library/4A-a-guide-to-seed-fundraising',
        category: 'TEMPLATE',
        sharedById: expert.id,
      },
      {
        title: '2026 Guide to Creator Legal Protections',
        description: 'An expert-written handbook on protecting your IP when partnering with agencies and brands.',
        url: 'https://www.eff.org/issues/intellectual-property',
        category: 'GUIDE',
        sharedById: expert.id,
      },
      {
        title: 'Interactive Thumbnail A/B Tester',
        description: 'A lightweight browser tool to simulate how your thumbnails look on different device mockups.',
        url: 'https://vwo.com/ab-testing/',
        category: 'TOOL',
        sharedById: creator.id,
      },
      {
        title: 'Forge UI Kit — Dark Mode Components',
        description: 'Reusable cards, forms, and navigation patterns for collaboration dashboards. Built with vanilla CSS.',
        url: 'https://ui.shadcn.com/',
        category: 'UI_KIT',
        sharedById: expert2.id,
      },
      {
        title: 'JWT Auth Middleware Snippet',
        description: 'Drop-in Express middleware for Bearer token validation with role checks. Copy-paste ready.',
        url: 'https://expressjs.com/en/advanced/best-practice-security.html',
        category: 'CODE_SNIPPET',
        sharedById: expert2.id,
      },
      {
        title: 'React Component Testing Cheatsheet',
        description: 'A comprehensive guide to testing React components with Vitest and React Testing Library. Includes common patterns.',
        url: 'https://testing-library.com/docs/react-testing-library/intro/',
        category: 'GUIDE',
        sharedById: creator2.id,
      },
      {
        title: 'Accessible Form Patterns Library',
        description: 'A collection of ARIA-compliant form patterns with keyboard navigation. Includes date pickers, autocomplete, and multi-select.',
        url: 'https://www.w3.org/WAI/ARIA/apg/patterns/',
        category: 'CODE_SNIPPET',
        sharedById: creator2.id,
      },
      {
        title: 'API Documentation Starter Template',
        description: 'A Markdown-based documentation template for REST APIs. Includes endpoint tables, auth guides, and error code references.',
        url: 'https://spec.openapis.org/oas/latest.html',
        category: 'TEMPLATE',
        sharedById: expert2.id,
      },
      {
        title: 'Color Contrast Checker CLI',
        description: 'A Node.js CLI tool that audits your CSS files for WCAG color contrast compliance and generates a report.',
        url: 'https://www.deque.com/axe/devtools/',
        category: 'TOOL',
        sharedById: expert3.id,
      },
      {
        title: 'RISC-V ISA Manual and Ratified Specifications',
        description: 'Primary reference for RV32/RV64 ISA design, extensions, privilege levels, and custom-instruction research.',
        url: 'https://riscv.org/technical/specifications/',
        category: 'HARDWARE',
        sharedById: expert3.id,
      },
      {
        title: 'OpenTitan Silicon Root of Trust',
        description: 'Open-source SystemVerilog SoC project with verification, firmware, register-generation, and security architecture examples.',
        url: 'https://opentitan.org/',
        category: 'HARDWARE',
        sharedById: expert3.id,
      },
      {
        title: 'CHIPS Alliance Open-Source Hardware',
        description: 'Production-oriented open silicon ecosystem and RISC-V projects for studying SoC integration, EDA, and verification workflows.',
        url: 'https://www.chipsalliance.org/',
        category: 'HARDWARE',
        sharedById: expert3.id,
      },
      {
        title: 'NVIDIA CUDA Samples',
        description: 'Maintained CUDA reference samples for memory transfers, occupancy, matrix multiplication, and GPU performance analysis.',
        url: 'https://github.com/NVIDIA/cuda-samples',
        category: 'GITHUB_REPO',
        sharedById: expert3.id,
      },
      {
        title: 'lowRISC Ibex RISC-V Core',
        description: 'Readable SystemVerilog implementation of an embedded RISC-V CPU, useful for pipeline, interrupt, and verification study.',
        url: 'https://github.com/lowRISC/ibex',
        category: 'GITHUB_REPO',
        sharedById: expert3.id,
      },
      {
        title: 'RARS RISC-V Assembly Examples',
        description: 'Runnable assembly examples for loads, stores, branches, calling conventions, and simple programs.',
        url: 'https://github.com/TheThirdOne/rars/tree/master/examples',
        category: 'CODE_SNIPPET',
        sharedById: expert2.id,
      },
      {
        title: 'Express Security Patterns',
        description: 'Copy-ready server hardening patterns for headers, TLS, cookies, validation, and dependency hygiene.',
        url: 'https://expressjs.com/en/advanced/best-practice-security.html',
        category: 'CODE_SNIPPET',
        sharedById: creator.id,
      },
      {
        title: 'CUDA Matrix Multiplication Sample',
        description: 'Tiled matrix-multiplication reference showing shared-memory locality and GPU compute-kernel trade-offs.',
        url: 'https://github.com/NVIDIA/cuda-samples/tree/master/Samples/6_Performance/MatrixMul',
        category: 'CODE_SNIPPET',
        sharedById: expert3.id,
      },
      {
        title: 'Y Combinator SAFE Documents',
        description: 'Current standard SAFE fundraising documents and founder guidance for testing the funding-template category.',
        url: 'https://www.ycombinator.com/documents',
        category: 'TEMPLATE',
        sharedById: expert.id,
      },
      {
        title: 'Material Design 3',
        description: 'Accessible component, colour, typography, and interaction guidance for product-design testing.',
        url: 'https://m3.material.io/',
        category: 'UI_KIT',
        sharedById: expert.id,
      },
      {
        title: 'Prisma PostgreSQL Documentation',
        description: 'Schema, migrations, query patterns, and production connection-management documentation.',
        url: 'https://www.prisma.io/docs/orm/overview/databases/postgresql',
        category: 'GUIDE',
        sharedById: expert2.id,
      },
      {
        title: 'Vercel Platform Documentation',
        description: 'Deployment, serverless-function, environment-variable, and observability docs for testing platform links.',
        url: 'https://vercel.com/docs',
        category: 'TOOL',
        sharedById: creator.id,
      },
      {
        title: 'How CPU Memory & Caches Work (Computerphile)',
        description: 'Visual explanation of cache organisation, locality, cache levels, and memory access for computer-architecture learners.',
        url: 'https://www.youtube.com/watch?v=SAk-6gVkio0',
        category: 'VIDEO',
        sharedById: expert3.id,
      },
      {
        title: 'RISC-V Assembly and Architecture Learning Path',
        description: 'YouTube learning path for RISC-V assembly, instruction formats, memory access, and processor fundamentals.',
        url: 'https://www.youtube.com/results?search_query=RISC-V+assembly+computer+architecture+tutorial',
        category: 'VIDEO',
        sharedById: expert2.id,
      },
      {
        title: 'GPU Architecture, Memory, and Parallelism',
        description: 'YouTube learning path covering CUDA, GPU memory, parallel execution, and matrix-compute fundamentals.',
        url: 'https://www.youtube.com/results?search_query=GPU+architecture+memory+parallelism+CUDA+tutorial',
        category: 'VIDEO',
        sharedById: expert3.id,
      },
      {
        title: 'RISC-V Single-Cycle Processor in Verilog',
        description: 'A practical video lesson on creating a RISC-V datapath, control unit, register file, ALU, and data memory in Verilog.',
        url: 'https://www.youtube.com/watch?v=dh88oe6O0QU',
        category: 'VIDEO',
        sharedById: expert2.id,
      },
      {
        title: 'System Design: Caching and CDNs',
        description: 'YouTube learning path connecting caching, CDNs, latency, consistency, and real infrastructure trade-offs.',
        url: 'https://www.youtube.com/results?search_query=system+design+caching+CDN+tutorial',
        category: 'VIDEO',
        sharedById: creator.id,
      },
    ],
  });

  // -- Bookings --
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 3);
  await prisma.booking.create({
    data: {
      title: 'IP Strategy & Brand Deal Review',
      scheduledAt: bookingDate,
      status: 'PENDING',
      creatorId: creator.id,
      expertId: expert.id,
    },
  });

  const confirmedDate = new Date();
  confirmedDate.setDate(confirmedDate.getDate() + 7);

  await prisma.booking.create({
    data: {
      title: 'Docs Architecture Review',
      scheduledAt: confirmedDate,
      status: 'CONFIRMED',
      creatorId: demo.id,
      expertId: expert2.id,
    },
  });

  const completedDate = new Date();
  completedDate.setDate(completedDate.getDate() - 5);

  await prisma.booking.create({
    data: {
      title: 'UX Onboarding Flow Critique',
      scheduledAt: completedDate,
      status: 'COMPLETED',
      notes: 'Great session! Sarah provided actionable feedback on reducing the onboarding steps from 7 to 4. Key insight: combine account setup and profile creation into one step.',
      rating: 5,
      review: 'Sarah was incredibly sharp and gave me a concrete action plan. Highly recommend for any UX review.',
      creatorId: creator2.id,
      expertId: expert.id,
    },
  });

  const pendingDate2 = new Date();
  pendingDate2.setDate(pendingDate2.getDate() + 10);

  await prisma.booking.create({
    data: {
      title: 'Cloud Architecture Deep Dive',
      scheduledAt: pendingDate2,
      status: 'PENDING',
      creatorId: creator.id,
      expertId: expert3.id,
    },
  });

  // A completed session for the demo account that is NOT yet rated —
  // so the demo login can showcase the post-session rating flow.
  const demoCompletedDate = new Date();
  demoCompletedDate.setDate(demoCompletedDate.getDate() - 2);

  await prisma.booking.create({
    data: {
      title: 'Portfolio & Personal Brand Review',
      scheduledAt: demoCompletedDate,
      status: 'COMPLETED',
      notes: 'Jordan walked through positioning, portfolio structure, and how to present past projects to land better opportunities.',
      creatorId: demo.id,
      expertId: expert2.id,
    },
  });

  // -- Follows --
  await prisma.follow.createMany({
    data: [
      { followerId: creator.id, followingId: expert.id },
      { followerId: creator.id, followingId: expert2.id },
      { followerId: creator.id, followingId: expert3.id },
      { followerId: creator2.id, followingId: expert.id },
      { followerId: creator2.id, followingId: expert2.id },
      { followerId: demo.id, followingId: expert.id },
      { followerId: demo.id, followingId: expert2.id },
      { followerId: demo.id, followingId: expert3.id },
      { followerId: demo.id, followingId: creator2.id },
      { followerId: expert.id, followingId: expert2.id },
      { followerId: creator2.id, followingId: creator.id },
      { followerId: demo.id, followingId: creator.id },
    ],
  });

  // -- Saves (bookmarked ideas) --
  await prisma.projectSave.createMany({
    data: [
      { userId: creator.id, projectId: project3.id },
      { userId: creator.id, projectId: project5.id },
      { userId: creator2.id, projectId: project1.id },
      { userId: demo.id, projectId: project1.id },
      { userId: demo.id, projectId: project6.id },
      { userId: expert.id, projectId: project5.id },
    ],
  });

  // -- Notifications --
  await prisma.notification.createMany({
    data: [
      {
        userId: creator.id,
        type: 'COMMENT',
        message: 'Sarah Expert commented on your idea "Decentralized Creator Cooperatives"',
        referenceId: project1.id,
      },
      {
        userId: creator.id,
        type: 'UPVOTE',
        message: 'Your idea "Decentralized Creator Cooperatives" received 5 upvotes!',
        referenceId: project1.id,
      },
      {
        userId: creator.id,
        type: 'BOOKING_UPDATE',
        message: 'Your booking "IP Strategy & Brand Deal Review" is pending confirmation',
        referenceId: 1,
      },
      {
        userId: demo.id,
        type: 'BOOKING_UPDATE',
        message: 'Your booking "Docs Architecture Review" has been confirmed by Jordan Lee',
        referenceId: 2,
        read: true,
      },
      {
        userId: creator2.id,
        type: 'COMMENT',
        message: 'Sarah Expert commented on your idea "Accessible Color Palette Generator"',
        referenceId: project4.id,
      },
      {
        userId: creator2.id,
        type: 'BOOKING_UPDATE',
        message: 'Your session "UX Onboarding Flow Critique" has been completed',
        referenceId: 3,
        read: true,
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log('  - 6 users (3 creators, 3 experts)');
  console.log('  - 6 project ideas');
  console.log('  - 7 comments');
  console.log('  - 17 upvotes');
  console.log('  - 9 resources');
  console.log('  - 5 bookings');
  console.log('  - 12 follows');
  console.log('  - 6 saved ideas');
  console.log('  - 6 notifications');
}

main()
  .catch((e) => {
    console.error('❌ Error while seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
