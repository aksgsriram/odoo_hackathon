const { ActivityLog, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/activity-logs?userId=&entityType=&action=  (Admin only, full audit trail)
const listActivityLogs = asyncHandler(async (req, res) => {
  const { userId, entityType, action } = req.query;
  const where = {};
  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  const logs = await ActivityLog.findAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }],
    order: [['createdAt', 'DESC']],
    limit: 500,
  });

  const parsed = logs.map((l) => ({ ...l.toJSON(), details: safeParse(l.details) }));
  res.json({ success: true, logs: parsed });
});

function safeParse(str) {
  try { return JSON.parse(str); } catch (e) { return str; }
}

module.exports = { listActivityLogs };
