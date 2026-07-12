const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true }, // null for system-generated actions
  action: { type: DataTypes.STRING, allowNull: false }, // e.g. 'ASSET_REGISTERED', 'ASSET_ALLOCATED'
  entityType: { type: DataTypes.STRING, allowNull: true },
  entityId: { type: DataTypes.INTEGER, allowNull: true },
  details: { type: DataTypes.TEXT, allowNull: true }, // JSON stringified extra info
}, {
  tableName: 'activity_logs',
  timestamps: true,
});

module.exports = ActivityLog;
