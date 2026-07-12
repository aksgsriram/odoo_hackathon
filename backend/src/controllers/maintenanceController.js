const { MaintenanceRequest, Asset, User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity, notify } = require('../utils/activityLogger');

// POST /api/maintenance-requests  (any holder can raise)
const raiseRequest = asyncHandler(async (req, res) => {
  const { assetId, issueDescription, priority, photoUrl } = req.body;
  if (!assetId || !issueDescription) throw new ApiError(400, 'assetId and issueDescription are required.');

  const asset = await Asset.findByPk(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found.');
  if (['Retired', 'Disposed'].includes(asset.status)) {
    throw new ApiError(400, `Cannot raise maintenance for a ${asset.status} asset.`);
  }

  const request = await MaintenanceRequest.create({
    assetId,
    raisedById: req.user.id,
    issueDescription,
    priority: priority || 'Medium',
    photoUrl: photoUrl || null,
    status: 'Pending',
  });

  await logActivity(req.user.id, 'MAINTENANCE_REQUESTED', 'MaintenanceRequest', request.id, { assetId, priority });
  res.status(201).json({ success: true, request });
});

// GET /api/maintenance-requests?status=&assetId=&priority=
const listRequests = asyncHandler(async (req, res) => {
  const { status, assetId, priority } = req.query;
  const where = {};
  if (status) where.status = status;
  if (assetId) where.assetId = assetId;
  if (priority) where.priority = priority;

  const requests = await MaintenanceRequest.findAll({
    where,
    include: [
      { model: Asset, as: 'asset' },
      { model: User, as: 'raisedBy', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approvedBy', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json({ success: true, requests });
});

// PATCH /api/maintenance-requests/:id/decision  (Approve/Reject - Asset Manager)
// Approval flips asset to "Under Maintenance" immediately, per spec.
const decideRequest = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // 'Approved' | 'Rejected'
  if (!['Approved', 'Rejected'].includes(decision)) throw new ApiError(400, 'decision must be Approved or Rejected.');

  const request = await MaintenanceRequest.findByPk(req.params.id, { include: [{ model: Asset, as: 'asset' }] });
  if (!request) throw new ApiError(404, 'Maintenance request not found.');
  if (request.status !== 'Pending') throw new ApiError(400, 'Only pending requests can be approved/rejected.');

  request.approvedById = req.user.id;

  if (decision === 'Rejected') {
    request.status = 'Rejected';
    request.rejectionReason = note || null;
    await request.save();
    await logActivity(req.user.id, 'MAINTENANCE_REJECTED', 'MaintenanceRequest', request.id, { note });
    await notify(request.raisedById, 'Maintenance Rejected', `Your maintenance request for ${request.asset.name} was rejected.`, 'MaintenanceRequest', request.id);
    return res.json({ success: true, request });
  }

  request.status = 'Approved';
  await request.save();

  const asset = request.asset;
  const allowed = Asset.ALLOWED_TRANSITIONS[asset.status] || [];
  if (allowed.includes('Under Maintenance')) {
    asset.status = 'Under Maintenance';
    await asset.save();
  }

  await logActivity(req.user.id, 'MAINTENANCE_APPROVED', 'MaintenanceRequest', request.id, {});
  await notify(request.raisedById, 'Maintenance Approved', `Your maintenance request for ${asset.name} was approved.`, 'MaintenanceRequest', request.id);

  res.json({ success: true, request, asset });
});

// PATCH /api/maintenance-requests/:id/assign-technician
const assignTechnician = asyncHandler(async (req, res) => {
  const { technicianName } = req.body;
  if (!technicianName) throw new ApiError(400, 'technicianName is required.');

  const request = await MaintenanceRequest.findByPk(req.params.id);
  if (!request) throw new ApiError(404, 'Maintenance request not found.');
  if (request.status !== 'Approved') throw new ApiError(400, 'Technician can only be assigned to an Approved request.');

  request.status = 'Technician Assigned';
  request.technicianName = technicianName;
  await request.save();

  await logActivity(req.user.id, 'TECHNICIAN_ASSIGNED', 'MaintenanceRequest', request.id, { technicianName });
  res.json({ success: true, request });
});

// PATCH /api/maintenance-requests/:id/start   (-> In Progress)
const startProgress = asyncHandler(async (req, res) => {
  const request = await MaintenanceRequest.findByPk(req.params.id);
  if (!request) throw new ApiError(404, 'Maintenance request not found.');
  if (request.status !== 'Technician Assigned') throw new ApiError(400, 'Request must have a technician assigned first.');

  request.status = 'In Progress';
  await request.save();

  await logActivity(req.user.id, 'MAINTENANCE_IN_PROGRESS', 'MaintenanceRequest', request.id, {});
  res.json({ success: true, request });
});

// PATCH /api/maintenance-requests/:id/resolve   (-> Resolved, asset back to Available)
const resolveRequest = asyncHandler(async (req, res) => {
  const { resolutionNotes } = req.body;

  const request = await MaintenanceRequest.findByPk(req.params.id, { include: [{ model: Asset, as: 'asset' }] });
  if (!request) throw new ApiError(404, 'Maintenance request not found.');
  if (request.status !== 'In Progress') throw new ApiError(400, 'Request must be In Progress to resolve.');

  request.status = 'Resolved';
  request.resolutionNotes = resolutionNotes || null;
  request.resolvedAt = new Date();
  await request.save();

  const asset = request.asset;
  if (asset.status === 'Under Maintenance') {
    asset.status = 'Available';
    await asset.save();
  }

  await logActivity(req.user.id, 'MAINTENANCE_RESOLVED', 'MaintenanceRequest', request.id, {});
  await notify(request.raisedById, 'Maintenance Resolved', `Maintenance on ${asset.name} is resolved. Asset is Available again.`, 'Asset', asset.id);

  res.json({ success: true, request, asset });
});

module.exports = { raiseRequest, listRequests, decideRequest, assignTechnician, startProgress, resolveRequest };
