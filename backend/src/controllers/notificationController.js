const { Notification } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notifications  (current user's notifications)
const listMyNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const where = { userId: req.user.id };
  if (unreadOnly === 'true') where.isRead = false;

  const notifications = await Notification.findAll({ where, order: [['createdAt', 'DESC']] });
  res.json({ success: true, notifications });
});

// PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification) throw new ApiError(404, 'Notification not found.');
  if (notification.userId !== req.user.id) throw new ApiError(403, 'Not your notification.');

  notification.isRead = true;
  await notification.save();
  res.json({ success: true, notification });
});

// PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
  res.json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = { listMyNotifications, markAsRead, markAllAsRead };
