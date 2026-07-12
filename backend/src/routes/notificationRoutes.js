const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { listMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

router.get('/', authenticate, listMyNotifications);
router.patch('/:id/read', authenticate, markAsRead);
router.patch('/read-all', authenticate, markAllAsRead);

module.exports = router;
