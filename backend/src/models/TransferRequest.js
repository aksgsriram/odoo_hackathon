const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TransferRequest = sequelize.define('TransferRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assetId: { type: DataTypes.INTEGER, allowNull: false },
  fromEmployeeId: { type: DataTypes.INTEGER, allowNull: true },
  fromDepartmentId: { type: DataTypes.INTEGER, allowNull: true },
  toEmployeeId: { type: DataTypes.INTEGER, allowNull: true },
  toDepartmentId: { type: DataTypes.INTEGER, allowNull: true },
  requestedById: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('Requested', 'Approved', 'Rejected', 'Reallocated'),
    allowNull: false,
    defaultValue: 'Requested',
  },
  approvedById: { type: DataTypes.INTEGER, allowNull: true },
  decisionNote: { type: DataTypes.TEXT, allowNull: true },
  decidedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'transfer_requests',
  timestamps: true,
});

module.exports = TransferRequest;
