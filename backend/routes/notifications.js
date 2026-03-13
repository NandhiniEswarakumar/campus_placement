const express = require('express');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/roleAuth');
const {
  addNotificationClient,
  removeNotificationClient,
  roleModelMap,
} = require('../services/notificationService');

const router = express.Router();

// GET /api/notifications — get notifications for logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id,
      recipientModel: roleModelMap[req.user.role],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      recipientModel: roleModelMap[req.user.role],
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/notifications/stream — server-sent events for live notifications
router.get('/stream', requireAuth, async (req, res) => {
  const recipientModel = roleModelMap[req.user.role];
  if (!recipientModel) {
    return res.status(400).json({ message: 'Unsupported recipient role.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  addNotificationClient(req.user.id, recipientModel, res);
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeNotificationClient(req.user.id, recipientModel, res);
    res.end();
  });
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, recipientModel: roleModelMap[req.user.role], read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    notification.read = true;
    await notification.save();
    res.json({ message: 'Marked as read', notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
