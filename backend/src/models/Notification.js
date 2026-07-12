const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM(
      'Asset Assigned',
      'Maintenance Approved',
      'Maintenance Rejected',
      'Maintenance Resolved',
      'Booking Confirmed',
      'Booking Cancelled',
      'Booking Reminder',
      'Transfer Requested',
      'Transfer Approved',
      'Transfer Rejected',
      'Overdue Return Alert',
      'Audit Discrepancy Flagged',
      'Audit Assigned'
    ),
    allowNull: false,
  },
  message: { type: DataTypes.STRING, allowNull: false },
  relatedEntityType: { type: DataTypes.STRING, allowNull: true }, // e.g. 'Asset', 'Booking'
  relatedEntityId: { type: DataTypes.INTEGER, allowNull: true },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'notifications',
  timestamps: true,
});

module.exports = Notification;
