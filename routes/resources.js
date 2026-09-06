const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_CATEGORIES = ['UI_KIT', 'CODE_SNIPPET', 'TEMPLATE', 'GUIDE', 'TOOL', 'GITHUB_REPO', 'HARDWARE'];

function normalizeHttpUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

// GET /api/resources - all resources, optionally filtered by ?category= and ?search=
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of ${VALID_CATEGORIES.join(', ')}` });
    }

    const resources = await prisma.resource.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sharedBy: { select: { id: true, name: true, role: true } },
      },
    });

    let filtered = resources;

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }

    const shaped = filtered.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      downloadUrl: r.url,
      uploader: r.sharedBy,
      createdAt: r.createdAt,
    }));

    res.json({ resources: shaped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load resources.' });
  }
});

// POST /api/resources - share a new resource
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, category, downloadUrl } = req.body;
    const safeUrl = normalizeHttpUrl(downloadUrl);

    if (!title || !description || !category || !safeUrl) {
      return res.status(400).json({ error: 'title, description, category, and downloadUrl are required.' });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of ${VALID_CATEGORIES.join(', ')}` });
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        category,
        url: safeUrl,
        sharedById: req.user.id,
      },
      include: {
        sharedBy: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json({
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        downloadUrl: resource.url,
        uploader: resource.sharedBy,
        createdAt: resource.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to share resource.' });
  }
});

// PATCH /api/resources/:id - edit your own resource
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    const { title, description, category, downloadUrl } = req.body;

    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) return res.status(404).json({ error: 'Resource not found.' });
    if (resource.sharedById !== req.user.id) {
      return res.status(403).json({ error: 'Only the uploader can edit this resource.' });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of ${VALID_CATEGORIES.join(', ')}` });
    }

    const data = {};
    if (title !== undefined) data.title = String(title).trim();
    if (description !== undefined) data.description = String(description).trim();
    if (category !== undefined) data.category = category;
    if (downloadUrl !== undefined) {
      const safeUrl = normalizeHttpUrl(downloadUrl);
      if (!safeUrl) return res.status(400).json({ error: 'downloadUrl must be a valid http or https URL.' });
      data.url = safeUrl;
    }
    if (!(data.title ?? resource.title) || !(data.description ?? resource.description) || !(data.url ?? resource.url)) {
      return res.status(400).json({ error: 'title, description, and downloadUrl cannot be empty.' });
    }

    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data,
      include: { sharedBy: { select: { id: true, name: true, role: true } } },
    });

    res.json({
      resource: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        category: updated.category,
        downloadUrl: updated.url,
        uploader: updated.sharedBy,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update resource.' });
  }
});

// DELETE /api/resources/:id - delete your own resource
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) return res.status(404).json({ error: 'Resource not found.' });
    if (resource.sharedById !== req.user.id) {
      return res.status(403).json({ error: 'Only the uploader can delete this resource.' });
    }

    await prisma.resource.delete({ where: { id: resourceId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete resource.' });
  }
});

module.exports = router;
