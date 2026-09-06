const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Fallback high-quality structured generator if Gemini API key is unavailable or fails
function generateStructuredPitchFallback({ startupName, targetMarket, problemStatement, solution, metrics, fundingAsk, creatorName }) {
  const sourceText = `${targetMarket} ${problemStatement} ${solution} ${metrics}`.toLowerCase();
  const isComputeArchitecture = /risc-v|fpga|npu|processor|coprocessor|hardware|silicon|cuda|gpu|cache|memory|dma|edge ai|edge-ai|inference/.test(sourceText);
  const architectureSection = isComputeArchitecture
    ? `## 5. Compute Architecture & Technical Moat
* **System Design:** Explain the hardware/software co-design across compute units, memory hierarchy, data movement, compiler/runtime, and workload.
* **Performance Evidence:** Track throughput (TOPS/FPS), p50/p95 latency, energy efficiency (TOPS/W), memory bandwidth use, SRAM/cache hit rate, and cost per deployed device.
* **Defensibility:** Quantisation-aware kernels, DMA/double buffering, dataflow scheduling, and FPGA/silicon validation create a moat beyond an application-only AI product.
* **Validation Plan:** Benchmark against a named baseline at the same accuracy target and clearly separate measured results from projections.

`
    : `## 5. Product Architecture & Technical Moat
* **System Design:** Document the workflow, data boundaries, reliability model, and integration points that make the product hard to replace.
* **Validation Plan:** Tie milestones to measurable adoption, retention, quality, and unit-economics outcomes.

`;
  const pitchDeck = `# ${startupName} — AI Investor Pitch Deck

## 1. Executive Summary
**${startupName}** is redefining ${targetMarket} by addressing critical inefficiencies with a proprietary, high-velocity solution. Built by multidisciplinary experts on Forge Antigravity, the platform bridges the gap between complex engineering, human-centered UI/UX design, and rapid execution.

## 2. Market Analysis & Opportunity
* **Target Market:** ${targetMarket}
* **Problem Statement:** ${problemStatement}
* **Market Drivers:** The cost, latency, reliability, and operational constraints described above create a concrete reason for customers to change behaviour.

## 3. Product Solution & Competitive Advantage
* **Core Solution:** ${solution}
* **Competitive Moat:** Integrated real-time collaboration, direct expert mentorship pipelines, and AI-accelerated proposal engines.

## 4. Traction & Key Performance Metrics
* **Current Traction & Metrics:** ${metrics || 'Prototype validated with early adopters; next step is repeatable customer evidence.'}
* **Investor Discipline:** Label each number as measured, customer-reported, or forecast.

${architectureSection}## 6. Financial Projections & Funding Ask
* **Capital Requirement:** ${fundingAsk}
* **Use of Funds:** ${isComputeArchitecture ? '55% hardware/software R&D and prototype validation, 25% design-partner pilots and go-to-market, 20% operations, supply-chain readiness, and hiring.' : '50% product and engineering R&D, 30% go-to-market and growth, 20% operations and talent.'}
`;

  const coldEmail = `Subject: Investment Opportunity: ${startupName} — Pitch & Partnership

Dear VC Partner,

I hope this email finds you well.

My name is ${creatorName || 'Founder'}, founder of ${startupName}. We are building a high-impact solution targeting ${targetMarket}.

${problemStatement}

To solve this, ${startupName} provides: ${solution}.

Key Traction & Highlights:
- Metrics: ${metrics || 'Early user validation and platform traction.'}
- ${isComputeArchitecture ? 'Architecture: measurable compute, memory, latency, and power targets with a reproducible benchmark plan.' : 'Execution: a measurable validation plan tied to customer outcomes.'}
- Seeking: ${fundingAsk} to accelerate product expansion and market capture.

I would love to schedule a 15-minute introductory call to share our investor deck and discuss how we align with your portfolio thesis.

Best regards,

${creatorName || 'Founder'}
Founder & CEO, ${startupName}
Pitch Profile: https://forge-antigravity.vercel.app
`;

  const superscoutPayload = {
    platform: "Superscout AI Investor Hub",
    submissionUrl: "https://superscout.co/investor/antigravity-capital",
    startup: {
      name: startupName,
      targetMarket: targetMarket,
      problem: problemStatement,
      solution: solution,
      metrics: metrics || "Early Stage MVP Traction",
      fundingAsk: fundingAsk,
      founder: creatorName || "Forge Creator",
    },
    verificationStatus: "Verified via Forge Antigravity Engine",
    submittedAt: new Date().toISOString()
  };

  return { pitchDeck, coldEmail, superscoutPayload: JSON.stringify(superscoutPayload, null, 2) };
}

function getProjectAutofillFallback(project) {
  const projectText = `${project.title} ${project.description} ${project.tags}`.toLowerCase();
  const isComputeArchitecture = /risc-v|fpga|npu|processor|coprocessor|hardware|silicon|cuda|gpu|cache|memory|dma|edge ai|edge-ai|inference/.test(projectText);

  if (isComputeArchitecture) {
    return {
      startupName: project.title,
      targetMarket: 'Industrial edge AI, machine vision, and embedded compute',
      problemStatement: 'Manufacturers need fast, private AI inference at the edge, but cloud round trips add latency and cost while general-purpose processors waste power moving model data through memory.',
      solution: project.description,
      metrics: 'Test input: FPGA prototype, 31 FPS at 1080p, <20 ms target latency, 128 INT8 MACs, 512 KB scratchpad SRAM, and 3.6 TOPS/W estimated. Mark estimated figures clearly until independently benchmarked.',
      fundingAsk: '$1,500,000 Pre-seed',
    };
  }

  return {
    startupName: project.title,
    targetMarket: 'B2B SaaS / Developer Tools',
    problemStatement: 'Current solutions are fragmented and inefficient for the intended users.',
    solution: project.description,
    metrics: 'Pre-product; validating with prospective users and design partners.',
    fundingAsk: '$250,000 Pre-seed',
  };
}

// POST /api/pitch/generate — AI Investor Proposal & Email Engine
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { startupName, targetMarket, problemStatement, solution, metrics, fundingAsk } = req.body;

    if (!startupName || !targetMarket || !problemStatement || !solution || !fundingAsk) {
      return res.status(400).json({ error: 'Please provide startupName, targetMarket, problemStatement, solution, and fundingAsk.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let pitchDeck = '';
    let coldEmail = '';
    let superscoutPayload = '';

    if (apiKey) {
      try {
        const promptText = `Act as a top-tier Silicon Valley VC partner and pitch strategist. Generate a structured pitch deck, a cold VC email, and a JSON payload for Superscout VC platform based on the following startup details:
Startup Name: ${startupName}
Target Market: ${targetMarket}
Problem Statement: ${problemStatement}
Solution: ${solution}
Metrics/Traction: ${metrics || 'Early stage traction'}
Funding Ask: ${fundingAsk}
Creator Name: ${req.user.name}

Output format must be valid JSON with keys: "pitchDeck" (markdown string), "coldEmail" (text string), and "superscoutPayload" (JSON object or formatted JSON string).`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            pitchDeck = parsed.pitchDeck || '';
            coldEmail = parsed.coldEmail || '';
            superscoutPayload = typeof parsed.superscoutPayload === 'object' ? JSON.stringify(parsed.superscoutPayload, null, 2) : String(parsed.superscoutPayload || '');
          }
        }
      } catch (geminiErr) {
        console.warn('[FORGE AI PITCH] Gemini API call fallback:', geminiErr.message);
      }
    }

    // Use fallback structured generator if Gemini response wasn't returned
    if (!pitchDeck || !coldEmail || !superscoutPayload) {
      const fallback = generateStructuredPitchFallback({
        startupName,
        targetMarket,
        problemStatement,
        solution,
        metrics,
        fundingAsk,
        creatorName: req.user.name,
      });
      pitchDeck = fallback.pitchDeck;
      coldEmail = fallback.coldEmail;
      superscoutPayload = fallback.superscoutPayload;
    }

    // Store proposal in PostgreSQL database via Prisma
    const proposal = await prisma.pitchProposal.create({
      data: {
        creatorId: req.user.id,
        startupName,
        targetMarket,
        problemStatement,
        solution,
        metrics: metrics || '',
        fundingAsk,
        generatedPitch: pitchDeck,
        generatedEmail: coldEmail,
      },
    });

    res.status(201).json({
      id: proposal.id,
      pitchDeck,
      coldEmail,
      superscoutPayload,
      proposal,
    });
  } catch (err) {
    console.error('[FORGE AI PITCH] Generation error:', err);
    res.status(500).json({ error: 'Failed to generate AI pitch proposal.' });
  }
});

// GET /api/pitch/history — Retrieve generated proposals history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const proposals = await prisma.pitchProposal.findMany({
      where: { creatorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ proposals });
  } catch (err) {
    console.error('[FORGE AI PITCH] History error:', err);
    res.status(500).json({ error: 'Failed to retrieve proposal history.' });
  }
});
// GET /api/pitch/autofill — Auto-fill pitch fields based on a project
router.get('/autofill', requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.query.projectId, 10);
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.json(getProjectAutofillFallback(project));
    }

    const promptText = `Based on the following startup project idea, deduce the target market, problem statement, and estimate a reasonable funding ask (e.g. "$500k Pre-seed").
Title: ${project.title}
Description: ${project.description}
Tags: ${project.tags}

Output valid JSON ONLY with these keys: "startupName", "targetMarket", "problemStatement", "solution", "metrics", "fundingAsk". Keep the solution and startupName close to the original.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) throw new Error('AI request failed');
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText || '{}');

    const fallback = getProjectAutofillFallback(project);
    res.json({
      startupName: parsed.startupName || fallback.startupName,
      targetMarket: parsed.targetMarket || fallback.targetMarket,
      problemStatement: parsed.problemStatement || fallback.problemStatement,
      solution: parsed.solution || fallback.solution,
      metrics: parsed.metrics || fallback.metrics,
      fundingAsk: parsed.fundingAsk || fallback.fundingAsk,
    });
  } catch (err) {
    console.error('[FORGE AI PITCH] Autofill error:', err);
    res.status(500).json({ error: 'Failed to auto-fill pitch details.' });
  }
});

module.exports = router;
