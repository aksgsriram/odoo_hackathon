const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  // Role is ONLY ever changed via Admin promotion (Organization Setup > Employee Directory).
  // Signup always creates 'Employee'. This is enforced in the controller layer, not just here.
  role: {
    type: DataTypes.ENUM('Employee', 'DepartmentHead', 'AssetManager', 'Admin'),
    allowNull: false,
    defaultValue: 'Employee',
  },
  departmentId: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('Active', 'Inactive'), allowNull: false, defaultValue: 'Active' },
  resetTokenHash: { type: DataTypes.STRING, allowNull: true },
  resetTokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
