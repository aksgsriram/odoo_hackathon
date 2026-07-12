const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Lifecycle states per problem statement
const ASSET_STATUSES = [
  'Available',
  'Allocated',
  'Reserved',
  'Under Maintenance',
  'Lost',
  'Retired',
  'Disposed',
];

const Asset = sequelize.define('Asset', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  categoryId: { type: DataTypes.INTEGER, allowNull: false }, // FK -> asset_categories.id
  assetTag: { type: DataTypes.STRING, allowNull: false, unique: true }, // auto-generated e.g. AF-0001
  serialNumber: { type: DataTypes.STRING, allowNull: true },
  qrCode: { type: DataTypes.STRING, allowNull: true, unique: true },
  acquisitionDate: { type: DataTypes.DATEONLY, allowNull: true },
  acquisitionCost: { type: DataTypes.DECIMAL(12, 2), allowNull: true }, // reports/ranking only, not linked to accounting
  condition: { type: DataTypes.STRING, allowNull: true }, // e.g. New, Good, Fair, Poor
  location: { type: DataTypes.STRING, allowNull: true },
  photoUrl: { type: DataTypes.STRING, allowNull: true },
  documentUrls: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' }, // JSON array of doc urls
  isBookable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // "shared/bookable" flag
  status: { type: DataTypes.ENUM(...ASSET_STATUSES), allowNull: false, defaultValue: 'Available' },
  // Current holder (mutually exclusive: employee OR department)
  currentHolderEmployeeId: { type: DataTypes.INTEGER, allowNull: true },
  currentHolderDepartmentId: { type: DataTypes.INTEGER, allowNull: true },
  departmentId: { type: DataTypes.INTEGER, allowNull: true }, // owning/home department
}, {
  tableName: 'assets',
  timestamps: true,
});

Asset.STATUSES = ASSET_STATUSES;

// Allowed lifecycle transitions (state machine)
Asset.ALLOWED_TRANSITIONS = {
  'Available': ['Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired'],
  'Allocated': ['Available', 'Under Maintenance', 'Lost'],
  'Reserved': ['Available', 'Allocated', 'Under Maintenance', 'Lost'],
  'Under Maintenance': ['Available', 'Lost', 'Retired'],
  'Lost': ['Available', 'Retired'], // recovered lost asset can be reinstated
  'Retired': ['Disposed'],
  'Disposed': [], // terminal state
};

module.exports = Asset;
