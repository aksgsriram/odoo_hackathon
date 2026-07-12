const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');
const { listActivityLogs } = require('../controllers/activityLogController');

router.get('/', authenticate, allowRoles('Admin'), listActivityLogs);

module.exports = router;
