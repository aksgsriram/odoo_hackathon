const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  assetId: { type: DataTypes.INTEGER, allowNull: false }, // must be an isBookable asset
  bookedByEmployeeId: { type: DataTypes.INTEGER, allowNull: false },
  bookedForDepartmentId: { type: DataTypes.INTEGER, allowNull: true }, // Dept Head booking on behalf of dept
  purpose: { type: DataTypes.STRING, allowNull: true },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE, allowNull: false },
  status: {
    type: DataTypes.ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Upcoming',
  },
  cancelledById: { type: DataTypes.INTEGER, allowNull: true },
  cancelReason: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'bookings',
  timestamps: true,
});

module.exports = Booking;
