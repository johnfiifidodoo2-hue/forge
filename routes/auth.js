const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'super-secret-forge-key-change-me-in-production',
    { expiresIn: '7d' }
  );
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  if (typeof safe.skills === 'string') {
    safe.skills = safe.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (!Array.isArray(safe.skills)) {
    safe.skills = [];
  }
  safe.whatsappNumber = safe.whatsappNumber || '';
  safe.preferredTheme = safe.preferredTheme || 'LIGHT';
  return safe;
}

// Accepts any standard email address string after trimming and lowercasing
function normalizeEmail(raw) {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || !email.includes('@') || email.length < 5) return null;
  return email;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { password, name, role, whatsappNumber, preferredTheme } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const selectedRole = role && ['CREATOR', 'EXPERT'].includes(role) ? role : 'CREATOR';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name.trim(),
        role: selectedRole,
        whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : '',
        preferredTheme: ['LIGHT', 'DARK'].includes(preferredTheme) ? preferredTheme : 'LIGHT',
      },
    });

    const token = signToken(user);
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error('[FORGE] Signup error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong during signup. Please try again.' });
  }
});

// Demo accounts helper to auto-provision if missing
async function provisionDemoUserIfMissing(email, role = 'CREATOR') {
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const name = role === 'EXPERT' ? 'Alex Rivera (Demo Expert)' : 'Kai Chen (Demo Creator)';
  const bio = role === 'EXPERT' ? 'Senior Full-Stack Architect & Product Strategist' : 'Indie Developer & UI Specialist';
  const skills = role === 'EXPERT' ? 'System Design, React, Node.js, Cloud' : 'Figma, Tailwind, React, Express';

  return await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      bio,
      skills,
    },
  });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    // Auto-provision demo account if missing
    if (!user && (email === 'creator@forge.dev' || email === 'kai@forge.dev' || email === 'demo@forge.dev')) {
      user = await provisionDemoUserIfMissing(email, 'CREATOR');
    } else if (!user && (email === 'expert@forge.dev' || email === 'mentor@forge.dev' || email === 'maya@forge.dev')) {
      user = await provisionDemoUserIfMissing(email, 'EXPERT');
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address. Please click "Sign Up" to create an account.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = signToken(user);
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error('[FORGE] Login error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong during login. Please try again.' });
  }
});

// GET /api/auth/me - return current user based on token
const { requireAuth } = require('../middleware/auth');
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[FORGE] Auth me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Helper for updating user profile data
async function updateProfileHandler(req, res) {
  try {
    const { bio, skills, portfolioUrl, whatsappNumber, preferredTheme } = req.body;
    const data = {};

    if (bio !== undefined) data.bio = String(bio).slice(0, 500);
    if (portfolioUrl !== undefined) data.portfolioUrl = String(portfolioUrl).slice(0, 255);
    if (whatsappNumber !== undefined) data.whatsappNumber = String(whatsappNumber).trim().slice(0, 30);
    if (preferredTheme !== undefined && ['LIGHT', 'DARK'].includes(preferredTheme)) {
      data.preferredTheme = preferredTheme;
    }

    if (skills !== undefined) {
      const parsed = Array.isArray(skills)
        ? skills
        : String(skills)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      data.skills = parsed.join(', ');
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[FORGE] Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

// PATCH /api/auth/profile & PUT /api/profile
router.patch('/profile', requireAuth, updateProfileHandler);
router.put('/profile', requireAuth, updateProfileHandler);

module.exports = router;
