const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

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
