const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditCycle = sequelize.define('AuditCycle', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  scopeDepartmentId: { type: DataTypes.INTEGER, allowNull: true },
  scopeLocation: { type: DataTypes.STRING, allowNull: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('Open', 'Closed'), allowNull: false, defaultValue: 'Open' },
  createdById: { type: DataTypes.INTEGER, allowNull: false },
  closedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'audit_cycles',
  timestamps: true,
});

module.exports = AuditCycle;
