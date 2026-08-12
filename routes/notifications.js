const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications - fetch notifications for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

// PATCH /api/notifications/:id/read - mark a single notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);

    const notification = await prisma.notification.findUnique({ where: { id: notifId } });
    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    const updated = await prisma.notification.update({
      where: { id: notifId },
      data: { read: true },
    });

    res.json({ notification: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// PATCH /api/notifications/read-all - mark all notifications as read
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

module.exports = router;
