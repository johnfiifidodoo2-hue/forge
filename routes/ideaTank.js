const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string' && tags.length) {
    return tags.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

function shapeProject(p, userId = null) {
  const upvoteCount = p._count?.upvotes ?? p.upvoteCount ?? 0;
  const hasUpvoted = userId
    ? (p.upvotes || []).some((u) => u.userId === userId)
    : false;
  const isSaved = userId
    ? (p.saves || []).some((s) => s.userId === userId)
    : false;

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    tags: parseTags(p.tags),
    author: p.owner,
    createdAt: p.createdAt,
    commentCount: p._count?.comments ?? p.commentCount ?? 0,
    upvoteCount,
    hasUpvoted,
    isSaved,
    comments: (p.comments || []).map((c) => ({
      id: c.id,
      content: c.content,
      author: c.author,
      createdAt: c.createdAt,
    })),
  };
}

// GET /api/ideatank/projects - all projects with optional ?search=, ?tag=, ?sort=, ?mine=, ?saved=
router.get('/projects', async (req, res) => {
  try {
    const { search, tag, sort, mine, saved } = req.query;

    let authUserId = null;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'super-secret-forge-key-change-me-in-production'
        );
        authUserId = decoded.id;
      } catch {
        // ignore invalid token for public listing
      }
    }

    let whereClause = {};
    if (mine === 'true' && authUserId) {
      whereClause = { ownerId: authUserId };
    }
    if (saved === 'true' && authUserId) {
      whereClause = { savedBy: { some: { userId: authUserId } } };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, role: true } },
        _count: { select: { comments: true, upvotes: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
        upvotes: authUserId ? { where: { userId: authUserId }, select: { userId: true } } : false,
        savedBy: authUserId ? { where: { userId: authUserId }, select: { userId: true } } : false,
      },
    });

    let filtered = projects;

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          parseTags(p.tags).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (tag) {
      const t = String(tag).toLowerCase();
      filtered = filtered.filter((p) =>
        parseTags(p.tags).some((tagItem) => tagItem.toLowerCase() === t)
      );
    }

    let shaped = filtered.map((p) => shapeProject(p, authUserId));

    // Sort
    if (sort === 'upvotes') {
      shaped.sort((a, b) => b.upvoteCount - a.upvoteCount);
    } else if (sort === 'comments') {
      shaped.sort((a, b) => b.commentCount - a.commentCount);
    }
    // default: newest (already sorted by createdAt desc)

    res.json({ projects: shaped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load projects.' });
  }
});

// POST /api/ideatank/projects - create a new project (idea)
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { title, description, tags } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required.' });
    }

    const parsedTags = parseTags(tags);
    const tagsString = parsedTags.join(', ');

    const project = await prisma.project.create({
      data: {
        title,
        description,
        tags: tagsString,
        ownerId: req.user.id,
      },
      include: {
        owner: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json({
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        tags: parsedTags,
        author: project.owner,
        createdAt: project.createdAt,
        commentCount: 0,
        upvoteCount: 0,
        hasUpvoted: false,
        comments: [],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// POST /api/ideatank/projects/:id/comments - add a comment to a project
router.post('/projects/:id/comments', requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required.' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        projectId,
        authorId: req.user.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    // Notify project owner about the comment
    if (project.ownerId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: project.ownerId,
          type: 'COMMENT',
          message: `${req.user.name} commented on your idea "${project.title}"`,
          referenceId: projectId,
        },
      }).catch(() => {});
    }

    res.status(201).json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// POST /api/ideatank/projects/:id/upvote - toggle upvote (interest signal)
router.post('/projects/:id/upvote', requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const existing = await prisma.projectUpvote.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (existing) {
      await prisma.projectUpvote.delete({ where: { id: existing.id } });
    } else {
      await prisma.projectUpvote.create({ data: { userId, projectId } });

      // Notify project owner about the upvote
      if (project.ownerId !== userId) {
        await prisma.notification.create({
          data: {
            userId: project.ownerId,
            type: 'UPVOTE',
            message: `Someone upvoted your idea "${project.title}"`,
            referenceId: projectId,
          },
        }).catch(() => {});
      }
    }

    const upvoteCount = await prisma.projectUpvote.count({ where: { projectId } });

    res.json({ upvoteCount, hasUpvoted: !existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle upvote.' });
  }
});

// POST /api/ideatank/projects/:id/save - toggle save (bookmark) an idea
router.post('/projects/:id/save', requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const existing = await prisma.projectSave.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (existing) {
      await prisma.projectSave.delete({ where: { id: existing.id } });
    } else {
      await prisma.projectSave.create({ data: { userId, projectId } });
    }

    res.json({ saved: !existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle save.' });
  }
});

// PATCH /api/ideatank/projects/:id - edit your own idea
router.patch('/projects/:id', requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { title, description, tags } = req.body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can edit this idea.' });
    }

    const data = {};
    if (title !== undefined) data.title = String(title).trim();
    if (description !== undefined) data.description = String(description).trim();
    if (tags !== undefined) data.tags = parseTags(tags).join(', ');
    if (!(data.title ?? project.title) || !(data.description ?? project.description)) {
      return res.status(400).json({ error: 'title and description cannot be empty.' });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
      include: {
        owner: { select: { id: true, name: true, role: true } },
        _count: { select: { comments: true, upvotes: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
        upvotes: { where: { userId: req.user.id }, select: { userId: true } },
        savedBy: { where: { userId: req.user.id }, select: { userId: true } },
      },
    });

    res.json({ project: shapeProject(updated, req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update idea.' });
  }
});

// DELETE /api/ideatank/projects/:id - delete your own idea
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can delete this idea.' });
    }

    await prisma.comment.deleteMany({ where: { projectId } });
    await prisma.projectUpvote.deleteMany({ where: { projectId } });
    await prisma.projectSave.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete idea.' });
  }
});

module.exports = router;
