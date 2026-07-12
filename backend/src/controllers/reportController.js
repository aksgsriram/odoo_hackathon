const { Op, fn, col, literal } = require('sequelize');
const { Asset, AssetCategory, Department, MaintenanceRequest, Booking, AllocationHistory } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/reports/utilization  (most-used vs idle assets, based on allocation count)
const utilizationReport = asyncHandler(async (req, res) => {
  const results = await AllocationHistory.findAll({
    attributes: ['assetId', [fn('COUNT', col('AllocationHistory.id')), 'allocationCount']],
    group: ['assetId'],
    order: [[literal('allocationCount'), 'DESC']],
    include: [{ model: Asset, as: 'asset', attributes: ['id', 'name', 'assetTag', 'status'] }],
  });

  const allAssetIds = (await Asset.findAll({ attributes: ['id'] })).map((a) => a.id);
  const usedIds = results.map((r) => r.assetId);
  const idleAssetIds = allAssetIds.filter((id) => !usedIds.includes(id));
  const idleAssets = await Asset.findAll({ where: { id: idleAssetIds }, attributes: ['id', 'name', 'assetTag', 'status'] });

  res.json({ success: true, mostUsed: results, idleAssets });
});

// GET /api/reports/maintenance-frequency
const maintenanceFrequencyReport = asyncHandler(async (req, res) => {
  const byAsset = await MaintenanceRequest.findAll({
    attributes: ['assetId', [fn('COUNT', col('MaintenanceRequest.id')), 'requestCount']],
    group: ['assetId'],
    order: [[literal('requestCount'), 'DESC']],
    include: [{ model: Asset, as: 'asset', attributes: ['id', 'name', 'assetTag', 'categoryId'] }],
  });

  const byCategory = await MaintenanceRequest.findAll({
    attributes: [[fn('COUNT', col('MaintenanceRequest.id')), 'requestCount']],
    include: [{ model: Asset, as: 'asset', attributes: ['categoryId'], include: [{ model: AssetCategory, as: 'category', attributes: ['id', 'name'] }] }],
    group: ['asset.categoryId', 'asset->category.id'],
  });

  res.json({ success: true, byAsset, byCategory });
});

// GET /api/reports/upcoming  (due for maintenance heuristically = flagged for maintenance recently; nearing retirement = old acquisition date)
const upcomingReport = asyncHandler(async (req, res) => {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 5); // simple "nearing retirement" heuristic: 5+ yrs old

  const nearingRetirement = await Asset.findAll({
    where: {
      acquisitionDate: { [Op.lt]: twoYearsAgo.toISOString().slice(0, 10) },
      status: { [Op.notIn]: ['Retired', 'Disposed'] },
    },
    order: [['acquisitionDate', 'ASC']],
  });

  const dueForMaintenance = await Asset.findAll({
    where: { status: 'Under Maintenance' },
  });

  res.json({ success: true, nearingRetirement, dueForMaintenance });
});

// GET /api/reports/department-allocation
const departmentAllocationReport = asyncHandler(async (req, res) => {
  const summary = await AllocationHistory.findAll({
    attributes: ['departmentId', [fn('COUNT', col('AllocationHistory.id')), 'allocationCount']],
    where: { departmentId: { [Op.ne]: null }, status: 'Active' },
    group: ['departmentId'],
    include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
  });

  res.json({ success: true, departmentAllocationSummary: summary });
});

// GET /api/reports/booking-heatmap  (bookings grouped by hour-of-day)
const bookingHeatmapReport = asyncHandler(async (req, res) => {
  const bookings = await Booking.findAll({
    where: { status: { [Op.in]: ['Upcoming', 'Ongoing', 'Completed'] } },
    attributes: ['startTime'],
  });

  const heatmap = Array(24).fill(0);
  bookings.forEach((b) => {
    const hour = new Date(b.startTime).getHours();
    heatmap[hour] += 1;
  });

  res.json({ success: true, heatmapByHour: heatmap });
});

// GET /api/reports/export?type=assets|maintenance|bookings  (simple JSON/CSV export)
const exportReport = asyncHandler(async (req, res) => {
  const { type, format } = req.query;
  let rows = [];

  if (type === 'assets') rows = (await Asset.findAll()).map((a) => a.toJSON());
  else if (type === 'maintenance') rows = (await MaintenanceRequest.findAll()).map((m) => m.toJSON());
  else if (type === 'bookings') rows = (await Booking.findAll()).map((b) => b.toJSON());
  else return res.status(400).json({ success: false, message: 'type must be assets, maintenance, or bookings' });

  if (format === 'csv') {
    if (rows.length === 0) return res.type('text/csv').send('');
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n');
    res.type('text/csv').attachment(`${type}-export.csv`).send(csv);
  } else {
    res.json({ success: true, type, rows });
  }
});

module.exports = {
  utilizationReport,
  maintenanceFrequencyReport,
  upcomingReport,
  departmentAllocationReport,
  bookingHeatmapReport,
  exportReport,
};
