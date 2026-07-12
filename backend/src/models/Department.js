const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  headId: { type: DataTypes.INTEGER, allowNull: true }, // FK -> users.id
  parentDepartmentId: { type: DataTypes.INTEGER, allowNull: true }, // FK -> departments.id (hierarchy)
  status: { type: DataTypes.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' },
}, {
  tableName: 'departments',
  timestamps: true,
});

module.exports = Department;
