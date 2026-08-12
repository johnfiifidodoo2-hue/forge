const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseSkills(skills) {
  if (typeof skills === 'string' && skills.length) {
    return skills.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseTags(tags) {
  if (typeof tags === 'string' && tags.length) {
    return tags.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

// GET /api/users/:id — public profile for any user
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id.' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            owner: { select: { id: true, name: true, role: true } },
            _count: { select: { comments: true, upvotes: true } },
          },
        },
        resources: {
          orderBy: { createdAt: 'desc' },
          include: { sharedBy: { select: { id: true, name: true, role: true } } },
        },
        _count: { select: { followers: true, following: true, projects: true, resources: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { password, ...safe } = user;

    // Average rating from completed bookings where this user is the expert
    const completedBookings = await prisma.booking.findMany({
      where: { expertId: userId, status: 'COMPLETED', rating: { not: null } },
      select: { rating: true, review: true, title: true, scheduledAt: true, creator: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
    });

    const ratings = completedBookings.filter((b) => b.rating).map((b) => b.rating);
    const averageRating = ratings.length
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

    // Am I following this user?
    let isFollowing = false;
    let amFollowing = false;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-forge-key-change-me-in-production');
        const me = decoded.id;
        if (me === userId) {
          // viewing own profile
        } else {
          const f = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: me, followingId: userId } },
          });
          isFollowing = !!f;
          const r = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: userId, followingId: me } },
          });
          amFollowing = !!r;
        }
      } catch {
        // ignore
      }
    }

    res.json({
      user: {
        id: safe.id,
        name: safe.name,
        role: safe.role,
        bio: safe.bio || '',
        skills: parseSkills(safe.skills),
        portfolioUrl: safe.portfolioUrl || '',
        createdAt: safe.createdAt,
        followerCount: safe._count.followers,
        followingCount: safe._count.following,
        averageRating,
        reviewCount: ratings.length,
        isFollowing,
        amFollowing,
      },
      projects: safe.projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        tags: parseTags(p.tags),
        createdAt: p.createdAt,
        commentCount: p._count.comments,
        upvoteCount: p._count.upvotes,
      })),
      resources: safe.resources.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        downloadUrl: r.url,
        createdAt: r.createdAt,
        uploader: r.sharedBy,
      })),
      reviews: completedBookings.map((b) => ({
        rating: b.rating,
        review: b.review,
        title: b.title,
        scheduledAt: b.scheduledAt,
        author: b.creator.name,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

// POST /api/users/:id/follow — toggle follow for the logged-in user
router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (targetId === userId) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      const followerCount = await prisma.follow.count({ where: { followingId: targetId } });
      return res.json({ following: false, followerCount });
    }

    await prisma.follow.create({ data: { followerId: userId, followingId: targetId } });

    // Notify the target
    if (target.role === 'EXPERT') {
      await prisma.notification.create({
        data: {
          userId: targetId,
          type: 'NEW_FOLLOWER',
          message: `${req.user.name} started following you`,
          referenceId: userId,
        },
      }).catch(() => {});
    }

    const followerCount = await prisma.follow.count({ where: { followingId: targetId } });
    res.json({ following: true, followerCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle follow.' });
  }
});

// GET /api/users/:id/following — list of users this profile follows (public)
router.get('/:id/following', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, name: true, role: true, bio: true, skills: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ users: follows.map((f) => ({ ...f.following, skills: parseSkills(f.following.skills) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load following.' });
  }
});

// GET /api/users/:id/followers — list of users following this profile (public)
router.get('/:id/followers', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const follows = await prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, name: true, role: true, bio: true, skills: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ users: follows.map((f) => ({ ...f.follower, skills: parseSkills(f.follower.skills) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load followers.' });
  }
});

module.exports = router;
