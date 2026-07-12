const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssetCategory = sequelize.define('AssetCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  // e.g. [{ "key": "warrantyPeriod", "label": "Warranty Period", "type": "text" }]
  customFields: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },
  status: { type: DataTypes.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' },
}, {
  tableName: 'asset_categories',
  timestamps: true,
});

module.exports = AssetCategory;
