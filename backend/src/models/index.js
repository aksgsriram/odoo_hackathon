const sequelize = require('../config/db');

const User = require('./User');
const Department = require('./Department');
const AssetCategory = require('./AssetCategory');
const Asset = require('./Asset');
const AllocationHistory = require('./AllocationHistory');
const TransferRequest = require('./TransferRequest');
const Booking = require('./Booking');
const MaintenanceRequest = require('./MaintenanceRequest');
const AuditCycle = require('./AuditCycle');
const AuditAssignment = require('./AuditAssignment');
const AuditItem = require('./AuditItem');
const Notification = require('./Notification');
const ActivityLog = require('./ActivityLog');

/* ---------------- Department <-> User ---------------- */
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(User, { foreignKey: 'departmentId', as: 'members' });
Department.belongsTo(User, { foreignKey: 'headId', as: 'head' });
Department.belongsTo(Department, { foreignKey: 'parentDepartmentId', as: 'parentDepartment' });
Department.hasMany(Department, { foreignKey: 'parentDepartmentId', as: 'subDepartments' });

/* ---------------- Asset <-> Category / Department / Holder ---------------- */
Asset.belongsTo(AssetCategory, { foreignKey: 'categoryId', as: 'category' });
AssetCategory.hasMany(Asset, { foreignKey: 'categoryId', as: 'assets' });

Asset.belongsTo(Department, { foreignKey: 'departmentId', as: 'homeDepartment' });
Asset.belongsTo(User, { foreignKey: 'currentHolderEmployeeId', as: 'currentHolderEmployee' });
Asset.belongsTo(Department, { foreignKey: 'currentHolderDepartmentId', as: 'currentHolderDepartment' });

/* ---------------- Allocation History ---------------- */
AllocationHistory.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
Asset.hasMany(AllocationHistory, { foreignKey: 'assetId', as: 'allocationHistory' });
AllocationHistory.belongsTo(User, { foreignKey: 'employeeId', as: 'employee' });
AllocationHistory.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
AllocationHistory.belongsTo(User, { foreignKey: 'allocatedById', as: 'allocatedBy' });
AllocationHistory.belongsTo(User, { foreignKey: 'returnApprovedById', as: 'returnApprovedBy' });

/* ---------------- Transfer Requests ---------------- */
TransferRequest.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
Asset.hasMany(TransferRequest, { foreignKey: 'assetId', as: 'transferRequests' });
TransferRequest.belongsTo(User, { foreignKey: 'fromEmployeeId', as: 'fromEmployee' });
TransferRequest.belongsTo(Department, { foreignKey: 'fromDepartmentId', as: 'fromDepartment' });
TransferRequest.belongsTo(User, { foreignKey: 'toEmployeeId', as: 'toEmployee' });
TransferRequest.belongsTo(Department, { foreignKey: 'toDepartmentId', as: 'toDepartment' });
TransferRequest.belongsTo(User, { foreignKey: 'requestedById', as: 'requestedBy' });
TransferRequest.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });

/* ---------------- Bookings ---------------- */
Booking.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
Asset.hasMany(Booking, { foreignKey: 'assetId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'bookedByEmployeeId', as: 'bookedBy' });
Booking.belongsTo(Department, { foreignKey: 'bookedForDepartmentId', as: 'bookedForDepartment' });
Booking.belongsTo(User, { foreignKey: 'cancelledById', as: 'cancelledBy' });

/* ---------------- Maintenance ---------------- */
MaintenanceRequest.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
Asset.hasMany(MaintenanceRequest, { foreignKey: 'assetId', as: 'maintenanceRequests' });
MaintenanceRequest.belongsTo(User, { foreignKey: 'raisedById', as: 'raisedBy' });
MaintenanceRequest.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });

/* ---------------- Audits ---------------- */
AuditCycle.belongsTo(Department, { foreignKey: 'scopeDepartmentId', as: 'scopeDepartment' });
AuditCycle.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

AuditAssignment.belongsTo(AuditCycle, { foreignKey: 'auditCycleId', as: 'auditCycle' });
AuditCycle.hasMany(AuditAssignment, { foreignKey: 'auditCycleId', as: 'auditorAssignments' });
AuditAssignment.belongsTo(User, { foreignKey: 'auditorId', as: 'auditor' });

AuditItem.belongsTo(AuditCycle, { foreignKey: 'auditCycleId', as: 'auditCycle' });
AuditCycle.hasMany(AuditItem, { foreignKey: 'auditCycleId', as: 'items' });
AuditItem.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
Asset.hasMany(AuditItem, { foreignKey: 'assetId', as: 'auditItems' });
AuditItem.belongsTo(User, { foreignKey: 'auditedById', as: 'auditedBy' });

/* ---------------- Notifications / Logs ---------------- */
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Department,
  AssetCategory,
  Asset,
  AllocationHistory,
  TransferRequest,
  Booking,
  MaintenanceRequest,
  AuditCycle,
  AuditAssignment,
  AuditItem,
  Notification,
  ActivityLog,
};
