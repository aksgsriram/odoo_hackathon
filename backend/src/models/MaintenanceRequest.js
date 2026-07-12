const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaintenanceRequest = sequelize.define('MaintenanceRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assetId: { type: DataTypes.INTEGER, allowNull: false },
  raisedById: { type: DataTypes.INTEGER, allowNull: false },
  issueDescription: { type: DataTypes.TEXT, allowNull: false },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: false,
    defaultValue: 'Medium',
  },
  photoUrl: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Technician Assigned', 'In Progress', 'Resolved'),
    allowNull: false,
    defaultValue: 'Pending',
  },
  approvedById: { type: DataTypes.INTEGER, allowNull: true },
  rejectionReason: { type: DataTypes.TEXT, allowNull: true },
  technicianName: { type: DataTypes.STRING, allowNull: true },
  resolutionNotes: { type: DataTypes.TEXT, allowNull: true },
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'maintenance_requests',
  timestamps: true,
});

// Workflow order for validating forward-only progression
MaintenanceRequest.WORKFLOW_ORDER = ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved'];

module.exports = MaintenanceRequest;
