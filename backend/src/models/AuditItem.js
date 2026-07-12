const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditItem = sequelize.define('AuditItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  auditCycleId: { type: DataTypes.INTEGER, allowNull: false },
  assetId: { type: DataTypes.INTEGER, allowNull: false },
  result: {
    type: DataTypes.ENUM('Pending', 'Verified', 'Missing', 'Damaged'),
    allowNull: false,
    defaultValue: 'Pending',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  auditedById: { type: DataTypes.INTEGER, allowNull: true },
  auditedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'audit_items',
  timestamps: true,
  indexes: [{ unique: true, fields: ['auditCycleId', 'assetId'] }],
});

module.exports = AuditItem;
