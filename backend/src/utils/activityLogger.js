const { ActivityLog, Notification } = require('../models');

/**
 * Records an entry in the audit/activity log.
 * @param {number|null} userId - who performed the action (null = system)
 * @param {string} action - e.g. 'ASSET_REGISTERED'
 * @param {string} entityType - e.g. 'Asset'
 * @param {number} entityId
 * @param {object} details - extra JSON-serializable context
 */
async function logActivity(userId, action, entityType, entityId, details = {}) {
  return ActivityLog.create({
    userId: userId || null,
    action,
    entityType,
    entityId,
    details: JSON.stringify(details),
  });
}

/**
 * Creates a notification for a user.
 * @param {number} userId
 * @param {string} type - must match Notification model's ENUM
 * @param {string} message
 * @param {string} relatedEntityType
 * @param {number} relatedEntityId
 */
async function notify(userId, type, message, relatedEntityType = null, relatedEntityId = null) {
  if (!userId) return null;
  return Notification.create({
    userId,
    type,
    message,
    relatedEntityType,
    relatedEntityId,
  });
}

module.exports = { logActivity, notify };
