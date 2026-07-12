const { Op } = require('sequelize');
const { Asset, AssetCategory, Department, User, AllocationHistory, MaintenanceRequest } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const generateAssetTag = require('../utils/generateAssetTag');
const { logActivity } = require('../utils/activityLogger');

// POST /api/assets  (Asset Manager / Admin)
const registerAsset = asyncHandler(async (req, res) => {
  const {
    name, categoryId, serialNumber, qrCode, acquisitionDate, acquisitionCost,
    condition, location, photoUrl, documentUrls, isBookable, departmentId,
  } = req.body;

  if (!name || !categoryId) throw new ApiError(400, 'name and categoryId are required.');

  const category = await AssetCategory.findByPk(categoryId);
  if (!category) throw new ApiError(400, 'Invalid categoryId.');

  const assetTag = await generateAssetTag();

  const asset = await Asset.create({
    name,
    categoryId,
    assetTag,
    serialNumber: serialNumber || null,
    qrCode: qrCode || null,
    acquisitionDate: acquisitionDate || null,
    acquisitionCost: acquisitionCost || null,
    condition: condition || null,
    location: location || null,
    photoUrl: photoUrl || null,
    documentUrls: JSON.stringify(documentUrls || []),
    isBookable: !!isBookable,
    departmentId: departmentId || null,
    status: 'Available',
  });

  await logActivity(req.user.id, 'ASSET_REGISTERED', 'Asset', asset.id, { assetTag, name });
  res.status(201).json({ success: true, asset });
});

// GET /api/assets  (search/filter by tag, serial, QR, category, status, department, location)
const listAssets = asyncHandler(async (req, res) => {
  const { q, categoryId, status, departmentId, location, isBookable } = req.query;
  const where = {};

  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (location) where.location = { [Op.like]: `%${location}%` };
  if (isBookable !== undefined) where.isBookable = isBookable === 'true';

  if (q) {
    where[Op.or] = [
      { assetTag: { [Op.like]: `%${q}%` } },
      { serialNumber: { [Op.like]: `%${q}%` } },
      { qrCode: { [Op.like]: `%${q}%` } },
      { name: { [Op.like]: `%${q}%` } },
    ];
  }

  const assets = await Asset.findAll({
    where,
    include: [
      { model: AssetCategory, as: 'category', attributes: ['id', 'name'] },
      { model: Department, as: 'homeDepartment', attributes: ['id', 'name'] },
      { model: User, as: 'currentHolderEmployee', attributes: ['id', 'name', 'email'] },
      { model: Department, as: 'currentHolderDepartment', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json({ success: true, assets });
});

// GET /api/assets/:id  (with allocation + maintenance history)
const getAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findByPk(req.params.id, {
    include: [
      { model: AssetCategory, as: 'category' },
      { model: Department, as: 'homeDepartment', attributes: ['id', 'name'] },
      { model: User, as: 'currentHolderEmployee', attributes: ['id', 'name', 'email'] },
      { model: Department, as: 'currentHolderDepartment', attributes: ['id', 'name'] },
      {
        model: AllocationHistory,
        as: 'allocationHistory',
        include: [
          { model: User, as: 'employee', attributes: ['id', 'name', 'email'] },
          { model: Department, as: 'department', attributes: ['id', 'name'] },
        ],
        order: [['allocatedAt', 'DESC']],
      },
      {
        model: MaintenanceRequest,
        as: 'maintenanceRequests',
        include: [{ model: User, as: 'raisedBy', attributes: ['id', 'name'] }],
        order: [['createdAt', 'DESC']],
      },
    ],
  });

  if (!asset) throw new ApiError(404, 'Asset not found.');
  res.json({ success: true, asset });
});

// PUT /api/assets/:id  (update details, not status - use /status endpoint for lifecycle)
const updateAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findByPk(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found.');

  const editable = [
    'name', 'categoryId', 'serialNumber', 'qrCode', 'acquisitionDate', 'acquisitionCost',
    'condition', 'location', 'photoUrl', 'isBookable', 'departmentId',
  ];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) asset[field] = req.body[field];
  });
  if (req.body.documentUrls !== undefined) asset.documentUrls = JSON.stringify(req.body.documentUrls);

  await asset.save();
  await logActivity(req.user.id, 'ASSET_UPDATED', 'Asset', asset.id, req.body);
  res.json({ success: true, asset });
});

// PATCH /api/assets/:id/status  (explicit lifecycle transition, validated against state machine)
const transitionStatus = asyncHandler(async (req, res) => {
  const { status: newStatus, reason } = req.body;
  if (!Asset.STATUSES.includes(newStatus)) {
    throw new ApiError(400, `status must be one of: ${Asset.STATUSES.join(', ')}`);
  }

  const asset = await Asset.findByPk(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found.');

  const allowed = Asset.ALLOWED_TRANSITIONS[asset.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      400,
      `Cannot transition asset from "${asset.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none (terminal state)'}`
    );
  }

  const previousStatus = asset.status;
  asset.status = newStatus;

  // Clear holder if the asset becomes free/terminal again
  if (['Available', 'Lost', 'Retired', 'Disposed'].includes(newStatus)) {
    asset.currentHolderEmployeeId = null;
    asset.currentHolderDepartmentId = null;
  }

  await asset.save();
  await logActivity(req.user.id, 'ASSET_STATUS_CHANGED', 'Asset', asset.id, { previousStatus, newStatus, reason });
  res.json({ success: true, asset });
});

module.exports = { registerAsset, listAssets, getAsset, updateAsset, transitionStatus };
