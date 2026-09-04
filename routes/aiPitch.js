const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Fallback high-quality structured generator if Gemini API key is unavailable or fails
function generateStructuredPitchFallback({ startupName, targetMarket, problemStatement, solution, metrics, fundingAsk, creatorName }) {
  const pitchDeck = `# ${startupName} — AI Investor Pitch Deck

## 1. Executive Summary
**${startupName}** is redefining ${targetMarket} by addressing critical inefficiencies with a proprietary, high-velocity solution. Built by multidisciplinary experts on Forge Antigravity, the platform bridges the gap between complex engineering, human-centered UI/UX design, and rapid execution.

## 2. Market Analysis & Opportunity
* **Target Market:** ${targetMarket}
* **Problem Statement:** ${problemStatement}
* **Market Drivers:** Rapid digital transformation, underserved cross-disciplinary workflows, and high demand for automated productivity tools.

## 3. Product Solution & Competitive Advantage
* **Core Solution:** ${solution}
* **Competitive Moat:** Integrated real-time collaboration, direct expert mentorship pipelines, and AI-accelerated proposal engines.

## 4. Traction & Key Performance Metrics
* **Current Traction & Metrics:** ${metrics || 'Prototype validated with early adopters, multi-disciplinary engagement, and high retention rates.'}

## 5. Financial Projections & Funding Ask
* **Capital Requirement:** ${fundingAsk}
* **Use of Funds:** 50% Product & Engineering R&D, 30% Go-To-Market & Growth Marketing, 20% Operations & Talent Acquisition.
`;

  const coldEmail = `Subject: Investment Opportunity: ${startupName} — Pitch & Partnership

Dear VC Partner,

I hope this email finds you well.

My name is ${creatorName || 'Founder'}, founder of ${startupName}. We are building a high-impact solution targeting ${targetMarket}.

${problemStatement}

To solve this, ${startupName} provides: ${solution}.

Key Traction & Highlights:
- Metrics: ${metrics || 'Early user validation and platform traction.'}
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

module.exports = router;
