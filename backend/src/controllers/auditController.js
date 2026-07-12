const { AuditCycle, AuditAssignment, AuditItem, Asset, User, Department } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity, notify } = require('../utils/activityLogger');

// POST /api/audits   Create an audit cycle (scope: department/location, date range) + assign auditors
const createAuditCycle = asyncHandler(async (req, res) => {
  const { name, scopeDepartmentId, scopeLocation, startDate, endDate, auditorIds } = req.body;
  if (!name || !startDate || !endDate) throw new ApiError(400, 'name, startDate and endDate are required.');
  if (!scopeDepartmentId && !scopeLocation) throw new ApiError(400, 'Provide scopeDepartmentId and/or scopeLocation.');

  const cycle = await AuditCycle.create({
    name,
    scopeDepartmentId: scopeDepartmentId || null,
    scopeLocation: scopeLocation || null,
    startDate,
    endDate,
    createdById: req.user.id,
    status: 'Open',
  });

  // Assign auditors
  if (Array.isArray(auditorIds) && auditorIds.length) {
    const validAuditors = await User.findAll({ where: { id: auditorIds } });
    await Promise.all(validAuditors.map((a) => AuditAssignment.create({ auditCycleId: cycle.id, auditorId: a.id })));
    await Promise.all(validAuditors.map((a) => notify(a.id, 'Audit Assigned', `You've been assigned to audit cycle "${name}".`, 'AuditCycle', cycle.id)));
  }

  // Pre-populate audit items (Pending) for every in-scope asset
  const assetWhere = {};
  if (scopeDepartmentId) assetWhere.departmentId = scopeDepartmentId;
  if (scopeLocation) assetWhere.location = scopeLocation;

  const inScopeAssets = await Asset.findAll({ where: assetWhere });
  await Promise.all(
    inScopeAssets.map((asset) =>
      AuditItem.create({ auditCycleId: cycle.id, assetId: asset.id, result: 'Pending' })
    )
  );

  await logActivity(req.user.id, 'AUDIT_CYCLE_CREATED', 'AuditCycle', cycle.id, { name, assetCount: inScopeAssets.length });
  res.status(201).json({ success: true, auditCycle: cycle, itemsCreated: inScopeAssets.length });
});

// GET /api/audits?status=
const listAuditCycles = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status) where.status = status;

  const cycles = await AuditCycle.findAll({
    where,
    include: [
      { model: Department, as: 'scopeDepartment', attributes: ['id', 'name'] },
      { model: User, as: 'createdBy', attributes: ['id', 'name'] },
      { model: AuditAssignment, as: 'auditorAssignments', include: [{ model: User, as: 'auditor', attributes: ['id', 'name', 'email'] }] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json({ success: true, auditCycles: cycles });
});

// GET /api/audits/:id  (with items + discrepancy summary)
const getAuditCycle = asyncHandler(async (req, res) => {
  const cycle = await AuditCycle.findByPk(req.params.id, {
    include: [
      { model: Department, as: 'scopeDepartment', attributes: ['id', 'name'] },
      { model: AuditAssignment, as: 'auditorAssignments', include: [{ model: User, as: 'auditor', attributes: ['id', 'name', 'email'] }] },
      {
        model: AuditItem,
        as: 'items',
        include: [
          { model: Asset, as: 'asset' },
          { model: User, as: 'auditedBy', attributes: ['id', 'name'] },
        ],
      },
    ],
  });
  if (!cycle) throw new ApiError(404, 'Audit cycle not found.');

  const items = cycle.items || [];
  const discrepancyReport = items.filter((i) => ['Missing', 'Damaged'].includes(i.result));

  res.json({
    success: true,
    auditCycle: cycle,
    discrepancyReport,
    summary: {
      total: items.length,
      verified: items.filter((i) => i.result === 'Verified').length,
      missing: items.filter((i) => i.result === 'Missing').length,
      damaged: items.filter((i) => i.result === 'Damaged').length,
      pending: items.filter((i) => i.result === 'Pending').length,
    },
  });
});

// PATCH /api/audits/:cycleId/items/:itemId   Auditor marks each asset: Verified / Missing / Damaged
const markAuditItem = asyncHandler(async (req, res) => {
  const { result, notes } = req.body;
  if (!['Verified', 'Missing', 'Damaged'].includes(result)) {
    throw new ApiError(400, 'result must be Verified, Missing, or Damaged.');
  }

  const cycle = await AuditCycle.findByPk(req.params.cycleId);
  if (!cycle) throw new ApiError(404, 'Audit cycle not found.');
  if (cycle.status === 'Closed') throw new ApiError(400, 'This audit cycle is closed.');

  // Confirm requester is an assigned auditor (or Admin)
  if (req.user.role !== 'Admin') {
    const assignment = await AuditAssignment.findOne({ where: { auditCycleId: cycle.id, auditorId: req.user.id } });
    if (!assignment) throw new ApiError(403, 'You are not assigned as an auditor for this cycle.');
  }

  const item = await AuditItem.findOne({ where: { id: req.params.itemId, auditCycleId: cycle.id } });
  if (!item) throw new ApiError(404, 'Audit item not found in this cycle.');

  item.result = result;
  item.notes = notes || null;
  item.auditedById = req.user.id;
  item.auditedAt = new Date();
  await item.save();

  if (['Missing', 'Damaged'].includes(result)) {
    await logActivity(req.user.id, 'AUDIT_DISCREPANCY_FLAGGED', 'AuditItem', item.id, { result, assetId: item.assetId });
    await notify(cycle.createdById, 'Audit Discrepancy Flagged', `Asset flagged as ${result} during audit "${cycle.name}".`, 'AuditItem', item.id);
  }

  res.json({ success: true, item });
});

// PATCH /api/audits/:id/close   Locks cycle, updates asset statuses (e.g. Lost for confirmed-missing)
const closeAuditCycle = asyncHandler(async (req, res) => {
  const cycle = await AuditCycle.findByPk(req.params.id, { include: [{ model: AuditItem, as: 'items' }] });
  if (!cycle) throw new ApiError(404, 'Audit cycle not found.');
  if (cycle.status === 'Closed') throw new ApiError(400, 'Audit cycle is already closed.');

  const missingItems = cycle.items.filter((i) => i.result === 'Missing');
  const damagedItems = cycle.items.filter((i) => i.result === 'Damaged');

  for (const item of missingItems) {
    const asset = await Asset.findByPk(item.assetId);
    if (asset && (Asset.ALLOWED_TRANSITIONS[asset.status] || []).includes('Lost')) {
      asset.status = 'Lost';
      asset.currentHolderEmployeeId = null;
      asset.currentHolderDepartmentId = null;
      await asset.save();
    }
  }

  for (const item of damagedItems) {
    const asset = await Asset.findByPk(item.assetId);
    if (asset) {
      asset.condition = 'Damaged';
      await asset.save();
    }
  }

  cycle.status = 'Closed';
  cycle.closedAt = new Date();
  await cycle.save();

  await logActivity(req.user.id, 'AUDIT_CYCLE_CLOSED', 'AuditCycle', cycle.id, {
    missingCount: missingItems.length,
    damagedCount: damagedItems.length,
  });

  res.json({
    success: true,
    auditCycle: cycle,
    assetsMarkedLost: missingItems.length,
    assetsMarkedDamaged: damagedItems.length,
  });
});

module.exports = { createAuditCycle, listAuditCycles, getAuditCycle, markAuditItem, closeAuditCycle };
