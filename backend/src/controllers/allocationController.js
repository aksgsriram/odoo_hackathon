const { Op } = require('sequelize');
const { Asset, AllocationHistory, TransferRequest, User, Department } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity, notify } = require('../utils/activityLogger');

// POST /api/allocations
// Allocate an asset to an employee OR a department. Blocks if already allocated (conflict rule).
const allocateAsset = asyncHandler(async (req, res) => {
  const { assetId, employeeId, departmentId, expectedReturnDate } = req.body;

  if (!assetId || (!employeeId && !departmentId)) {
    throw new ApiError(400, 'assetId and either employeeId or departmentId are required.');
  }
  if (employeeId && departmentId) {
    throw new ApiError(400, 'Allocate to either an employee OR a department, not both.');
  }

  const asset = await Asset.findByPk(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found.');

  // --- Conflict rule ---
  if (asset.status === 'Allocated') {
    const currentHolder = asset.currentHolderEmployeeId
      ? await User.findByPk(asset.currentHolderEmployeeId)
      : await Department.findByPk(asset.currentHolderDepartmentId);

    throw new ApiError(409, `Asset ${asset.assetTag} is currently held by ${currentHolder ? currentHolder.name : 'someone else'}.`, {
      currentlyHeldBy: currentHolder ? currentHolder.name : null,
      suggestion: 'Use the Transfer Request flow instead (POST /api/allocations/transfer-requests).',
    });
  }

  if (!['Available', 'Reserved'].includes(asset.status)) {
    throw new ApiError(400, `Asset ${asset.assetTag} is not allocatable from status "${asset.status}".`);
  }

  if (employeeId) {
    const employee = await User.findByPk(employeeId);
    if (!employee) throw new ApiError(400, 'Invalid employeeId.');
  }
  if (departmentId) {
    const dept = await Department.findByPk(departmentId);
    if (!dept) throw new ApiError(400, 'Invalid departmentId.');
  }

  const allocation = await AllocationHistory.create({
    assetId,
    employeeId: employeeId || null,
    departmentId: departmentId || null,
    allocatedById: req.user.id,
    allocatedAt: new Date(),
    expectedReturnDate: expectedReturnDate || null,
    status: 'Active',
  });

  asset.status = 'Allocated';
  asset.currentHolderEmployeeId = employeeId || null;
  asset.currentHolderDepartmentId = departmentId || null;
  await asset.save();

  await logActivity(req.user.id, 'ASSET_ALLOCATED', 'Asset', asset.id, { employeeId, departmentId });
  if (employeeId) {
    await notify(employeeId, 'Asset Assigned', `${asset.name} (${asset.assetTag}) has been allocated to you.`, 'Asset', asset.id);
  }

  res.status(201).json({ success: true, allocation, asset });
});

// GET /api/allocations?assetId=&employeeId=&departmentId=&status=
const listAllocations = asyncHandler(async (req, res) => {
  const { assetId, employeeId, departmentId, status } = req.query;
  const where = {};
  if (assetId) where.assetId = assetId;
  if (employeeId) where.employeeId = employeeId;
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;

  const allocations = await AllocationHistory.findAll({
    where,
    include: [
      { model: Asset, as: 'asset' },
      { model: User, as: 'employee', attributes: ['id', 'name', 'email'] },
      { model: Department, as: 'department', attributes: ['id', 'name'] },
    ],
    order: [['allocatedAt', 'DESC']],
  });

  res.json({ success: true, allocations });
});

// GET /api/allocations/overdue  (feeds Dashboard + Notifications)
const listOverdueAllocations = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const overdue = await AllocationHistory.findAll({
    where: {
      status: 'Active',
      expectedReturnDate: { [Op.lt]: today },
    },
    include: [
      { model: Asset, as: 'asset' },
      { model: User, as: 'employee', attributes: ['id', 'name', 'email'] },
      { model: Department, as: 'department', attributes: ['id', 'name'] },
    ],
    order: [['expectedReturnDate', 'ASC']],
  });

  // Auto-flag as Overdue if not already marked
  await AllocationHistory.update(
    { status: 'Overdue' },
    { where: { id: overdue.map((o) => o.id), status: 'Active' } }
  );

  res.json({ success: true, overdueAllocations: overdue });
});

// POST /api/allocations/:id/return  (Return flow)
const returnAsset = asyncHandler(async (req, res) => {
  const { conditionNotes } = req.body;

  const allocation = await AllocationHistory.findByPk(req.params.id, { include: [{ model: Asset, as: 'asset' }] });
  if (!allocation) throw new ApiError(404, 'Allocation record not found.');
  if (allocation.status === 'Returned') throw new ApiError(400, 'This allocation has already been returned.');

  allocation.status = 'Returned';
  allocation.returnedAt = new Date();
  allocation.returnConditionNotes = conditionNotes || null;
  allocation.returnApprovedById = req.user.id;
  await allocation.save();

  const asset = allocation.asset;
  asset.status = 'Available';
  asset.currentHolderEmployeeId = null;
  asset.currentHolderDepartmentId = null;
  if (conditionNotes) asset.condition = conditionNotes;
  await asset.save();

  await logActivity(req.user.id, 'ASSET_RETURNED', 'Asset', asset.id, { allocationId: allocation.id, conditionNotes });
  res.json({ success: true, allocation, asset });
});

/* ------------------------- Transfer Requests ------------------------- */

// POST /api/allocations/transfer-requests
const createTransferRequest = asyncHandler(async (req, res) => {
  const { assetId, toEmployeeId, toDepartmentId, reason } = req.body;
  if (!assetId || (!toEmployeeId && !toDepartmentId)) {
    throw new ApiError(400, 'assetId and either toEmployeeId or toDepartmentId are required.');
  }

  const asset = await Asset.findByPk(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found.');
  if (asset.status !== 'Allocated') throw new ApiError(400, 'Only currently allocated assets can be transferred.');

  const transferRequest = await TransferRequest.create({
    assetId,
    fromEmployeeId: asset.currentHolderEmployeeId,
    fromDepartmentId: asset.currentHolderDepartmentId,
    toEmployeeId: toEmployeeId || null,
    toDepartmentId: toDepartmentId || null,
    requestedById: req.user.id,
    reason: reason || null,
    status: 'Requested',
  });

  await logActivity(req.user.id, 'TRANSFER_REQUESTED', 'TransferRequest', transferRequest.id, { assetId });
  if (asset.currentHolderEmployeeId) {
    await notify(asset.currentHolderEmployeeId, 'Transfer Requested', `A transfer has been requested for ${asset.name} (${asset.assetTag}).`, 'TransferRequest', transferRequest.id);
  }

  res.status(201).json({ success: true, transferRequest });
});

// GET /api/allocations/transfer-requests?status=&assetId=
const listTransferRequests = asyncHandler(async (req, res) => {
  const { status, assetId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (assetId) where.assetId = assetId;

  const requests = await TransferRequest.findAll({
    where,
    include: [
      { model: Asset, as: 'asset' },
      { model: User, as: 'fromEmployee', attributes: ['id', 'name'] },
      { model: Department, as: 'fromDepartment', attributes: ['id', 'name'] },
      { model: User, as: 'toEmployee', attributes: ['id', 'name'] },
      { model: Department, as: 'toDepartment', attributes: ['id', 'name'] },
      { model: User, as: 'requestedBy', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json({ success: true, transferRequests: requests });
});

// PATCH /api/allocations/transfer-requests/:id/decision   (Approve / Reject) - Asset Manager / Department Head
const decideTransferRequest = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // decision: 'Approved' | 'Rejected'
  if (!['Approved', 'Rejected'].includes(decision)) throw new ApiError(400, 'decision must be Approved or Rejected.');

  const transferRequest = await TransferRequest.findByPk(req.params.id, { include: [{ model: Asset, as: 'asset' }] });
  if (!transferRequest) throw new ApiError(404, 'Transfer request not found.');
  if (transferRequest.status !== 'Requested') throw new ApiError(400, 'This transfer request has already been decided.');

  transferRequest.approvedById = req.user.id;
  transferRequest.decisionNote = note || null;
  transferRequest.decidedAt = new Date();

  if (decision === 'Rejected') {
    transferRequest.status = 'Rejected';
    await transferRequest.save();
    await logActivity(req.user.id, 'TRANSFER_REJECTED', 'TransferRequest', transferRequest.id, {});
    return res.json({ success: true, transferRequest });
  }

  // Approved -> re-allocate, history updated automatically
  transferRequest.status = 'Approved';
  await transferRequest.save();

  const asset = transferRequest.asset;

  // Close out the old allocation record
  const activeAllocation = await AllocationHistory.findOne({
    where: { assetId: asset.id, status: ['Active', 'Overdue'] },
    order: [['allocatedAt', 'DESC']],
  });
  if (activeAllocation) {
    activeAllocation.status = 'Returned';
    activeAllocation.returnedAt = new Date();
    activeAllocation.returnConditionNotes = 'Reassigned via approved transfer.';
    activeAllocation.returnApprovedById = req.user.id;
    await activeAllocation.save();
  }

  // Create the new allocation
  const newAllocation = await AllocationHistory.create({
    assetId: asset.id,
    employeeId: transferRequest.toEmployeeId,
    departmentId: transferRequest.toDepartmentId,
    allocatedById: req.user.id,
    allocatedAt: new Date(),
    status: 'Active',
  });

  asset.currentHolderEmployeeId = transferRequest.toEmployeeId;
  asset.currentHolderDepartmentId = transferRequest.toDepartmentId;
  asset.status = 'Allocated';
  await asset.save();

  transferRequest.status = 'Reallocated';
  await transferRequest.save();

  await logActivity(req.user.id, 'TRANSFER_APPROVED', 'TransferRequest', transferRequest.id, { newAllocationId: newAllocation.id });
  if (transferRequest.toEmployeeId) {
    await notify(transferRequest.toEmployeeId, 'Transfer Approved', `${asset.name} (${asset.assetTag}) has been transferred to you.`, 'Asset', asset.id);
  }

  res.json({ success: true, transferRequest, newAllocation, asset });
});

module.exports = {
  allocateAsset,
  listAllocations,
  listOverdueAllocations,
  returnAsset,
  createTransferRequest,
  listTransferRequests,
  decideTransferRequest,
};
