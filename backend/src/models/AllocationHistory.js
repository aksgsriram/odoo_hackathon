const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AllocationHistory = sequelize.define('AllocationHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assetId: { type: DataTypes.INTEGER, allowNull: false },
  employeeId: { type: DataTypes.INTEGER, allowNull: true }, // allocated to employee...
  departmentId: { type: DataTypes.INTEGER, allowNull: true }, // ...or to a department
  allocatedById: { type: DataTypes.INTEGER, allowNull: false }, // who performed the allocation
  allocatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  expectedReturnDate: { type: DataTypes.DATEONLY, allowNull: true },
  returnedAt: { type: DataTypes.DATE, allowNull: true },
  returnConditionNotes: { type: DataTypes.TEXT, allowNull: true },
  returnApprovedById: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.ENUM('Active', 'Returned', 'Overdue'),
    allowNull: false,
    defaultValue: 'Active',
  },
}, {
  tableName: 'allocation_history',
  timestamps: true,
});

module.exports = AllocationHistory;
