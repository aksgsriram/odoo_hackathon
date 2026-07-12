const { Op } = require('sequelize');
const { Asset, Booking, MaintenanceRequest, AllocationHistory, TransferRequest } = require('../models');

// GET /api/dashboard
const getDashboard = async (req, res) => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayStr = todayStart.toISOString().slice(0, 10);
  const in7Days = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    assetsAvailable,
    assetsAllocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdueReturns,
    overdueBookingsCount,
  ] = await Promise.all([
    Asset.count({ where: { status: 'Available' } }),
    Asset.count({ where: { status: 'Allocated' } }),
    MaintenanceRequest.count({
      where: {
        status: { [Op.in]: ['Approved', 'Technician Assigned', 'In Progress'] },
        updatedAt: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
      },
    }),
    Booking.count({ where: { status: { [Op.in]: ['Upcoming', 'Ongoing'] } } }),
    TransferRequest.count({ where: { status: 'Requested' } }),
    AllocationHistory.findAll({
      where: {
        status: 'Active',
        expectedReturnDate: { [Op.gte]: todayStr, [Op.lte]: in7Days },
      },
      include: [{ model: Asset, as: 'asset', attributes: ['id', 'name', 'assetTag'] }],
    }),
    AllocationHistory.findAll({
      where: {
        status: { [Op.in]: ['Active', 'Overdue'] },
        expectedReturnDate: { [Op.lt]: todayStr },
      },
      include: [{ model: Asset, as: 'asset', attributes: ['id', 'name', 'assetTag'] }],
    }),
    Booking.count({
      where: {
        status: { [Op.in]: ['Upcoming', 'Ongoing'] },
        startTime: { [Op.lt]: todayStart },
      },
    }),
  ]);

  res.json({
    success: true,
    kpis: {
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturnsCount: upcomingReturns.length,
      overdueReturnsCount: overdueReturns.length,
    },
    overdueReturns,   // highlighted separately, per spec
    upcomingReturns,
  });
};

module.exports = { getDashboard };
