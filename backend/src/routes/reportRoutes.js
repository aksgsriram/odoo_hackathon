const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');
const {
  utilizationReport, maintenanceFrequencyReport, upcomingReport,
  departmentAllocationReport, bookingHeatmapReport, exportReport,
} = require('../controllers/reportController');

const managerRoles = allowRoles('Admin', 'AssetManager', 'DepartmentHead');

router.get('/utilization', authenticate, managerRoles, utilizationReport);
router.get('/maintenance-frequency', authenticate, managerRoles, maintenanceFrequencyReport);
router.get('/upcoming', authenticate, managerRoles, upcomingReport);
router.get('/department-allocation', authenticate, managerRoles, departmentAllocationReport);
router.get('/booking-heatmap', authenticate, managerRoles, bookingHeatmapReport);
router.get('/export', authenticate, managerRoles, exportReport);

module.exports = router;
