const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const CHANNELS = new Set([
  'general-collaboration',
  'comp-arch-hardware',
  'fundraising-vcs',
  'devops-cloud',
  'ai-ml-models',
]);

function validateChannel(roomId) {
  return typeof roomId === 'string' && CHANNELS.has(roomId);
}

// GET /api/chat/invitees — real creators that can be invited to a channel
router.get('/invitees', requireAuth, async (req, res) => {
  try {
    const creators = await prisma.user.findMany({
      where: { role: 'CREATOR' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true, bio: true, skills: true },
    });

    res.json({
      creators: creators
        .filter((creator) => creator.id !== req.user.id)
        .map(({ id, name, role, bio, skills }) => ({ id, name, role, bio, skills })),
    });
  } catch (err) {
    console.error('[FORGE CHAT] Fetch invitees error:', err);
    res.status(500).json({ error: 'Failed to load creators available for invitation.' });
  }
});

// POST /api/chat/invitations — invite a creator and create a visible channel record
router.post('/invitations', requireAuth, async (req, res) => {
  try {
    const creatorId = Number(req.body.creatorId);
    const roomId = String(req.body.roomId || '');

    if (!Number.isInteger(creatorId) || !validateChannel(roomId)) {
      return res.status(400).json({ error: 'A valid creator and channel are required.' });
    }
    if (creatorId === req.user.id) {
      return res.status(400).json({ error: 'You cannot invite yourself to a channel.' });
    }

    const creator = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator || creator.role !== 'CREATOR') {
      return res.status(404).json({ error: 'Creator not found.' });
    }

    const channelLabel = `#${roomId}`;
    await prisma.notification.create({
      data: {
        userId: creator.id,
        type: 'CHANNEL_INVITE',
        message: `${req.user.name} invited you to join ${channelLabel}.`,
        referenceId: 0,
      },
    });

    const message = await prisma.chatMessage.create({
      data: {
        senderId: req.user.id,
        roomId,
        content: `👋 ${req.user.name} invited ${creator.name} to join this channel.`,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, skills: true, whatsappNumber: true } },
      },
    });

    res.status(201).json({ invitation: { creator: { id: creator.id, name: creator.name }, roomId }, message });
  } catch (err) {
    console.error('[FORGE CHAT] Create invitation error:', err);
    res.status(500).json({ error: 'Failed to send channel invitation.' });
  }
});

// GET /api/chat/messages — Retrieve recent chat room messages
router.get('/messages', async (req, res) => {
  try {
    const roomId = req.query.roomId || 'global';
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            skills: true,
            whatsappNumber: true,
          },
        },
      },
    });

    res.json({ roomId, messages });
  } catch (err) {
    console.error('[FORGE CHAT] Fetch messages error:', err);
    res.status(500).json({ error: 'Failed to retrieve chat messages.' });
  }
});

// POST /api/chat/messages — Send a new message to the chat room
router.post('/messages', requireAuth, async (req, res) => {
  try {
    const { content, roomId = 'global' } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }
    if (!validateChannel(roomId)) {
      return res.status(400).json({ error: 'Unknown chat channel.' });
    }

    const trimmedContent = content.trim().slice(0, 1000);

    const message = await prisma.chatMessage.create({
      data: {
        senderId: req.user.id,
        roomId: String(roomId),
        content: trimmedContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            skills: true,
            whatsappNumber: true,
          },
        },
      },
    });

    res.status(201).json({ message });
  } catch (err) {
    console.error('[FORGE CHAT] Create message error:', err);
    res.status(500).json({ error: 'Failed to send chat message.' });
  }
});

module.exports = router;
