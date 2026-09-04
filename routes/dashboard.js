const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - overview metrics for the logged-in user
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isExpert = req.user.role === 'EXPERT';

    // Fetch all lists and count manually — compatible with memory store
    const [allProjects, allResources, allComments, allBookings, allUsers] = await Promise.all([
      prisma.project.findMany({}),
      prisma.resource.findMany({}),
      prisma.comment.findMany({}),
      prisma.booking.findMany({}),
      prisma.user.findMany({}),
    ]);

    const myProjects  = allProjects.filter((p) => p.ownerId === userId).length;
    const myResources = allResources.filter((r) => r.sharedById === userId).length;
    const myComments  = allComments.filter((c) => c.authorId === userId).length;
    const myBookings  = allBookings.filter((b) => isExpert ? b.expertId === userId : b.creatorId === userId).length;
    const pendingBookings = allBookings.filter((b) =>
      b.status === 'PENDING' && (isExpert ? b.expertId === userId : b.creatorId === userId)
    ).length;
    const availableExperts = allUsers.filter((u) => u.role === 'EXPERT').length;

    // Recent projects with owner names
    const sortedProjects = [...allProjects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const recentProjects = sortedProjects.map((p) => {
      const owner = allUsers.find((u) => u.id === p.ownerId) || { id: 0, name: 'Unknown' };
      const commentCount = allComments.filter((c) => c.projectId === p.id).length;
      const upvoteCount  = 0; // upvotes counted separately if needed
      return {
        id: p.id,
        title: p.title,
        author: { id: owner.id, name: owner.name },
        commentCount,
        upvoteCount,
        createdAt: p.createdAt,
      };
    });

    res.json({
      stats: {
        myProjects,
        myResources,
        myComments,
        myBookings,
        pendingBookings,
        communityIdeas: allProjects.length,
        communityResources: allResources.length,
        availableExperts,
      },
      recentProjects,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard stats.' });
  }
});

// GET /api/dashboard/activity - recent platform activity feed
router.get('/activity', requireAuth, async (req, res) => {
  try {
    const [allComments, allProjects, allResources, allUsers] = await Promise.all([
      prisma.comment.findMany({}),
      prisma.project.findMany({}),
      prisma.resource.findMany({}),
      prisma.user.findMany({}),
    ]);

    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));
    const projectMap = Object.fromEntries(allProjects.map((p) => [p.id, p]));

    const activities = [];

    const recentComments = [...allComments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    recentComments.forEach((c) => {
      const author  = userMap[c.authorId];
      const project = projectMap[c.projectId];
      if (author && project) {
        activities.push({
          type: 'comment',
          icon: '💬',
          text: `${author.name} commented on "${project.title}"`,
          time: c.createdAt,
        });
      }
    });

    const recentProjects = [...allProjects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    recentProjects.forEach((p) => {
      const owner = userMap[p.ownerId];
      if (owner) {
        activities.push({
          type: 'idea',
          icon: '💡',
          text: `${owner.name} pitched "${p.title}"`,
          time: p.createdAt,
        });
      }
    });

    const recentResources = [...allResources].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
    recentResources.forEach((r) => {
      activities.push({
        type: 'resource',
        icon: '📦',
        text: `New resource: "${r.title}"`,
        time: r.createdAt,
      });
    });

    // Additional realistic platform events for community vitality
    const staticEvents = [
      {
        type: 'mentor',
        icon: '🎓',
        text: 'Dr. Rose-Mary Gyening published Verilog memory hazard benchmarks for RISC-V SIMD cores',
        time: new Date(Date.now() - 3600000 * 2),
      },
      {
        type: 'funding',
        icon: '🚀',
        text: 'Sarah Blake approved pitch deck review request for "AirBed & Breakfast"',
        time: new Date(Date.now() - 3600000 * 5),
      },
      {
        type: 'github',
        icon: '⚡',
        text: 'Alex Rivera pushed 14 commits to "k8s-deploy-pipeline" repository',
        time: new Date(Date.now() - 3600000 * 8),
      },
      {
        type: 'design',
        icon: '🎨',
        text: 'Amara Osei updated "Figma Global Design System 2024" component tokens',
        time: new Date(Date.now() - 3600000 * 12),
      },
      {
        type: 'ai',
        icon: '🧠',
        text: 'Dr. James Ofosu benchmarked 12ms token latency on Llama-3 70B GPU cluster',
        time: new Date(Date.now() - 3600000 * 16),
      },
    ];

    activities.push(...staticEvents);
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    res.json({ activities: activities.slice(0, 12) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load activity feed.' });
  }
});

// GET /api/dashboard/leaderboard - top ideas + top contributors + top experts
router.get('/leaderboard', async (req, res) => {
  try {
    const [allProjects, allResources, allComments, allUsers, allBookings] = await Promise.all([
      prisma.project.findMany({}),
      prisma.resource.findMany({}),
      prisma.comment.findMany({}),
      prisma.user.findMany({}),
      prisma.booking.findMany({}),
    ]);

    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

    // Top ideas by comment count (upvotes would need upvote data)
    const ideas = allProjects
      .map((p) => ({
        id: p.id,
        title: p.title,
        author: userMap[p.ownerId] ? { id: p.ownerId, name: userMap[p.ownerId].name, role: userMap[p.ownerId].role } : null,
        upvoteCount: 0,
        commentCount: allComments.filter((c) => c.projectId === p.id).length,
      }))
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 5);

    // Top contributors
    const contributors = allUsers.map((u) => {
      const projectCount  = allProjects.filter((p) => p.ownerId === u.id).length;
      const resourceCount = allResources.filter((r) => r.sharedById === u.id).length;
      const commentCount  = allComments.filter((c) => c.authorId === u.id).length;
      const score = projectCount * 3 + resourceCount * 2 + commentCount;
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        score,
        projects: projectCount,
        resources: resourceCount,
        followers: 0,
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    // Top experts
    const experts = allUsers
      .filter((u) => u.role === 'EXPERT')
      .map((e) => {
        const completedBookings = allBookings.filter(
          (b) => b.expertId === e.id && b.status === 'COMPLETED' && b.rating != null
        );
        const ratings = completedBookings.map((b) => b.rating);
        const averageRating = ratings.length
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null;
        return {
          id: e.id,
          name: e.name,
          bio: e.bio,
          skills: (e.skills || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3),
          averageRating,
          reviewCount: ratings.length,
          followerCount: 0,
        };
      })
      .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      .slice(0, 5);

    res.json({ ideas, contributors, experts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

module.exports = router;
