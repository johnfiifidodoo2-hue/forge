const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - overview metrics for the logged-in user
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isExpert = req.user.role === 'EXPERT';

    const [projectCount, resourceCount, commentCount, bookingCount, pendingBookings, totalIdeas, totalResources, totalExperts] =
      await Promise.all([
        prisma.project.count({ where: { ownerId: userId } }),
        prisma.resource.count({ where: { sharedById: userId } }),
        prisma.comment.count({ where: { authorId: userId } }),
        prisma.booking.count({
          where: isExpert ? { expertId: userId } : { creatorId: userId },
        }),
        prisma.booking.count({
          where: {
            status: 'PENDING',
            ...(isExpert ? { expertId: userId } : { creatorId: userId }),
          },
        }),
        prisma.project.count(),
        prisma.resource.count(),
        prisma.user.count({ where: { role: 'EXPERT' } }),
      ]);

    const recentProjects = await prisma.project.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { comments: true, upvotes: true } },
      },
    });

    res.json({
      stats: {
        myProjects: projectCount,
        myResources: resourceCount,
        myComments: commentCount,
        myBookings: bookingCount,
        pendingBookings,
        communityIdeas: totalIdeas,
        communityResources: totalResources,
        availableExperts: totalExperts,
      },
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        title: p.title,
        author: p.owner,
        commentCount: p._count.comments,
        upvoteCount: p._count.upvotes,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard stats.' });
  }
});

// GET /api/dashboard/activity - recent platform activity feed
router.get('/activity', requireAuth, async (req, res) => {
  try {
    const [recentComments, recentProjects, recentResources] = await Promise.all([
      prisma.comment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
          project: { select: { id: true, title: true } },
        },
      }),
      prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true } },
        },
      }),
      prisma.resource.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          sharedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const activities = [];

    recentComments.forEach((c) => {
      activities.push({
        type: 'comment',
        icon: '💬',
        text: `${c.author.name} commented on "${c.project.title}"`,
        time: c.createdAt,
      });
    });

    recentProjects.forEach((p) => {
      activities.push({
        type: 'idea',
        icon: '💡',
        text: `${p.owner.name} pitched "${p.title}"`,
        time: p.createdAt,
      });
    });

    recentResources.forEach((r) => {
      activities.push({
        type: 'resource',
        icon: '📦',
        text: `${r.sharedBy.name} shared "${r.title}"`,
        time: r.createdAt,
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({ activities: activities.slice(0, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load activity feed.' });
  }
});

// GET /api/dashboard/leaderboard - top ideas + top contributors + top experts
router.get('/leaderboard', async (req, res) => {
  try {
    const topIdeas = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        owner: { select: { id: true, name: true, role: true } },
        _count: { select: { upvotes: true, comments: true } },
      },
    });

    topIdeas.sort((a, b) => b._count.upvotes - a._count.upvotes);
    const ideas = topIdeas.slice(0, 5).map((p) => ({
      id: p.id,
      title: p.title,
      author: p.owner,
      upvoteCount: p._count.upvotes,
      commentCount: p._count.comments,
    }));

    const users = await prisma.user.findMany({
      include: {
        _count: { select: { projects: true, resources: true, comments: true, followers: true } },
        projects: { select: { _count: { select: { upvotes: true } } } },
      },
    });

    const contributors = users
      .map((u) => {
        const score =
          u._count.projects * 3 +
          u._count.resources * 2 +
          u._count.comments +
          u._count.followers * 2 +
          u.projects.reduce((sum, p) => sum + p._count.upvotes, 0);
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          score,
          projects: u._count.projects,
          resources: u._count.resources,
          followers: u._count.followers,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const experts = await prisma.user.findMany({
      where: { role: 'EXPERT' },
      select: {
        id: true,
        name: true,
        bio: true,
        skills: true,
        expertBookings: {
          where: { status: 'COMPLETED', rating: { not: null } },
          select: { rating: true },
        },
        _count: { select: { followers: true } },
      },
    });

    const topExperts = experts
      .map((e) => {
        const ratings = e.expertBookings.map((b) => b.rating);
        const averageRating = ratings.length
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null;
        return {
          id: e.id,
          name: e.name,
          bio: e.bio,
          skills: e.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3),
          averageRating,
          reviewCount: ratings.length,
          followerCount: e._count.followers,
        };
      })
      .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0) || b.followerCount - a.followerCount)
      .slice(0, 5);

    res.json({ ideas, contributors, experts: topExperts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

module.exports = router;
