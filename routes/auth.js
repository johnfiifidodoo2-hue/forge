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
  }
  return safe;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required.' });
    }

    if (role && !['CREATOR', 'EXPERT'].includes(role)) {
      return res.status(400).json({ error: 'role must be CREATOR or EXPERT.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'CREATOR',
      },
    });

    const token = signToken(user);
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong during signup.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong during login.' });
  }
});

// GET /api/auth/me - return current user based on token
const { requireAuth } = require('../middleware/auth');
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: sanitizeUser(user) });
});

// PATCH /api/auth/profile - update bio, skills, and portfolioUrl
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { bio, skills, portfolioUrl } = req.body;
    const data = {};

    if (bio !== undefined) data.bio = String(bio).slice(0, 500);
    if (portfolioUrl !== undefined) data.portfolioUrl = String(portfolioUrl).slice(0, 255);
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
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
