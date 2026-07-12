const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditAssignment = sequelize.define('AuditAssignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  auditCycleId: { type: DataTypes.INTEGER, allowNull: false },
  auditorId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'audit_assignments',
  timestamps: true,
  indexes: [{ unique: true, fields: ['auditCycleId', 'auditorId'] }],
});

module.exports = AuditAssignment;
