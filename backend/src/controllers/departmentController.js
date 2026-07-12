const { Department, User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLogger');

// GET /api/departments
const listDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.findAll({
    include: [
      { model: User, as: 'head', attributes: ['id', 'name', 'email'] },
      { model: Department, as: 'parentDepartment', attributes: ['id', 'name'] },
    ],
    order: [['name', 'ASC']],
  });
  res.json({ success: true, departments });
});

// POST /api/departments
const createDepartment = asyncHandler(async (req, res) => {
  const { name, headId, parentDepartmentId, status } = req.body;
  if (!name) throw new ApiError(400, 'name is required.');

  if (headId) {
    const head = await User.findByPk(headId);
    if (!head) throw new ApiError(400, 'Invalid headId.');
  }
  if (parentDepartmentId) {
    const parent = await Department.findByPk(parentDepartmentId);
    if (!parent) throw new ApiError(400, 'Invalid parentDepartmentId.');
  }

  const dept = await Department.create({
    name,
    headId: headId || null,
    parentDepartmentId: parentDepartmentId || null,
    status: status || 'Active',
  });

  await logActivity(req.user.id, 'DEPARTMENT_CREATED', 'Department', dept.id, { name });
  res.status(201).json({ success: true, department: dept });
});

// PUT /api/departments/:id
const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findByPk(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found.');

  const { name, headId, parentDepartmentId, status } = req.body;

  if (parentDepartmentId && Number(parentDepartmentId) === dept.id) {
    throw new ApiError(400, 'A department cannot be its own parent.');
  }

  if (name !== undefined) dept.name = name;
  if (headId !== undefined) dept.headId = headId;
  if (parentDepartmentId !== undefined) dept.parentDepartmentId = parentDepartmentId;
  if (status !== undefined) dept.status = status;

  await dept.save();
  await logActivity(req.user.id, 'DEPARTMENT_UPDATED', 'Department', dept.id, req.body);
  res.json({ success: true, department: dept });
});

// DELETE /api/departments/:id  (soft delete -> deactivate)
const deactivateDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findByPk(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found.');

  dept.status = 'Inactive';
  await dept.save();

  await logActivity(req.user.id, 'DEPARTMENT_DEACTIVATED', 'Department', dept.id, {});
  res.json({ success: true, department: dept });
});

module.exports = { listDepartments, createDepartment, updateDepartment, deactivateDepartment };
