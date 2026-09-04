const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseSkills(skills) {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string' && skills.length) {
    return skills.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function shapeExpert(expert, ratingInfo) {
  return {
    id: expert.id,
    name: expert.name,
    email: expert.email,
    bio: expert.bio || '',
    skills: parseSkills(expert.skills),
    whatsappNumber: expert.whatsappNumber || '',
    createdAt: expert.createdAt,
    averageRating: ratingInfo?.averageRating ?? null,
    reviewCount: ratingInfo?.reviewCount ?? 0,
    followerCount: ratingInfo?.followerCount ?? 0,
  };
}

// GET /api/bookings/experts - list all users with the EXPERT role
router.get('/experts', async (req, res) => {
  try {
    const { search, skill } = req.query;

    const experts = await prisma.user.findMany({
      where: { role: 'EXPERT' },
      orderBy: { name: 'asc' },
    });

    // groupBy is only available in Postgres — gracefully skip when using memory store
    let ratingRows = [];
    let followerRows = [];
    try {
      const expertIds = experts.map((e) => e.id);
      [ratingRows, followerRows] = await Promise.all([
        prisma.booking.groupBy({
          by: ['expertId'],
          where: { expertId: { in: expertIds }, status: 'COMPLETED', rating: { not: null } },
          _avg: { rating: true },
          _count: { rating: true },
        }),
        prisma.follow.groupBy({
          by: ['followingId'],
          where: { followingId: { in: expertIds } },
          _count: { followingId: true },
        }),
      ]);
    } catch (_) {
      // memory store fallback — no rating/follower data available
    }

    const ratingMap = {};
    ratingRows.forEach((r) => {
      ratingMap[r.expertId] = { averageRating: r._avg.rating, reviewCount: r._count.rating };
    });
    const followerMap = {};
    followerRows.forEach((r) => {
      followerMap[r.followingId] = r._count.followingId;
    });

    let filtered = experts;

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.bio || '').toLowerCase().includes(q) ||
          parseSkills(e.skills).some((s) => s.toLowerCase().includes(q))
      );
    }

    if (skill) {
      const s = String(skill).toLowerCase();
      filtered = filtered.filter((e) =>
        parseSkills(e.skills).some((sk) => sk.toLowerCase() === s)
      );
    }

    const shaped = filtered.map((e) =>
      shapeExpert(e, {
        ...ratingMap[e.id],
        followerCount: followerMap[e.id] || 0,
      })
    );

    if (req.query.sort === 'rating') {
      shaped.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    } else if (req.query.sort === 'followers') {
      shaped.sort((a, b) => b.followerCount - a.followerCount);
    }

    res.json({ experts: shaped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load experts.' });
  }
});

// POST /api/bookings - request a booking with an expert
router.post('/', requireAuth, async (req, res) => {
  try {
    const { expertId, scheduledAt, title } = req.body;

    if (!expertId || !scheduledAt) {
      return res.status(400).json({ error: 'expertId and scheduledAt are required.' });
    }

    const expert = await prisma.user.findUnique({ where: { id: parseInt(expertId, 10) } });
    if (!expert || expert.role !== 'EXPERT') {
      return res.status(404).json({ error: 'Expert not found.' });
    }

    if (expert.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot book yourself.' });
    }

    const booking = await prisma.booking.create({
      data: {
        title: title || '1:1 Consultation Session',
        expertId: expert.id,
        creatorId: req.user.id,
        scheduledAt: new Date(scheduledAt),
        status: 'PENDING',
      },
      include: {
        expert: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking.' });
  }
});

// GET /api/bookings/mine - all bookings for the logged-in user (as expert or creator)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [{ expertId: req.user.id }, { creatorId: req.user.id }],
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        expert: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bookings.' });
  }
});

// PATCH /api/bookings/:id/status - confirm, cancel, or complete a booking
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const validStatuses = ['CONFIRMED', 'CANCELLED', 'COMPLETED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${validStatuses.join(', ')}` });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const isExpert = booking.expertId === req.user.id;
    const isCreator = booking.creatorId === req.user.id;

    if (!isExpert && !isCreator) {
      return res.status(403).json({ error: 'You are not part of this booking.' });
    }

    if (status === 'CONFIRMED' && !isExpert) {
      return res.status(403).json({ error: 'Only the expert can confirm bookings.' });
    }

    if (status === 'CANCELLED' && booking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Completed bookings cannot be cancelled.' });
    }

    if (status === 'COMPLETED' && booking.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Only confirmed bookings can be marked completed.' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        expert: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // Create notification for the other party
    const notifyUserId = isExpert ? booking.creatorId : booking.expertId;
    const actorName = isExpert ? updated.expert.name : updated.creator.name;
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: 'BOOKING_UPDATE',
        message: `${actorName} ${status.toLowerCase()} your booking "${updated.title}"`,
        referenceId: bookingId,
      },
    }).catch(() => {});

    res.json({ booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking status.' });
  }
});

// PATCH /api/bookings/:id/notes - add or update notes for a booking
router.patch('/:id/notes', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({ error: 'notes field is required.' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const isExpert = booking.expertId === req.user.id;
    const isCreator = booking.creatorId === req.user.id;

    if (!isExpert && !isCreator) {
      return res.status(403).json({ error: 'You are not part of this booking.' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { notes: String(notes).slice(0, 2000) },
      include: {
        expert: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.json({ booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking notes.' });
  }
});

// POST /api/bookings/:id/rating - the creator rates a completed session
router.post('/:id/rating', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { rating, review } = req.body;

    const ratingInt = parseInt(rating, 10);
    if (!ratingInt || ratingInt < 1 || ratingInt > 5) {
      return res.status(400).json({ error: 'rating must be a number between 1 and 5.' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (booking.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can rate this session.' });
    }
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Only completed sessions can be rated.' });
    }
    if (booking.rating) {
      return res.status(400).json({ error: 'This session has already been rated.' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        rating: ratingInt,
        review: review ? String(review).slice(0, 1000) : null,
      },
      include: {
        expert: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // Notify the expert about the rating
    await prisma.notification.create({
      data: {
        userId: booking.expertId,
        type: 'BOOKING_UPDATE',
        message: `${req.user.name} rated your session "${updated.title}" ${ratingInt}★`,
        referenceId: bookingId,
      },
    }).catch(() => {});

    res.json({ booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit rating.' });
  }
});

module.exports = router;
