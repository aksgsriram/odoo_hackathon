const { User, Department } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLogger');

// GET /api/employees  (Employee Directory - Tab C)
const listEmployees = asyncHandler(async (req, res) => {
  const { departmentId, role, status } = req.query;
  const where = {};
  if (departmentId) where.departmentId = departmentId;
  if (role) where.role = role;
  if (status) where.status = status;

  const employees = await User.findAll({
    where,
    attributes: ['id', 'name', 'email', 'role', 'departmentId', 'status', 'createdAt'],
    include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });

  res.json({ success: true, employees });
});

// PATCH /api/employees/:id/role
// This is the ONLY endpoint in the system that changes a user's role.
// Admin-only (enforced via route middleware). Promotes Employee -> DepartmentHead / AssetManager,
// or can also be used to move someone back to Employee.
const changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ['Employee', 'DepartmentHead', 'AssetManager', 'Admin'];
  if (!allowedRoles.includes(role)) throw new ApiError(400, `role must be one of: ${allowedRoles.join(', ')}`);

  const employee = await User.findByPk(req.params.id);
  if (!employee) throw new ApiError(404, 'Employee not found.');

  const previousRole = employee.role;
  employee.role = role;
  await employee.save();

  await logActivity(req.user.id, 'ROLE_CHANGED', 'User', employee.id, { previousRole, newRole: role });

  res.json({ success: true, employee: sanitize(employee) });
});

// PATCH /api/employees/:id/status
const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Active', 'Inactive'].includes(status)) throw new ApiError(400, 'status must be Active or Inactive.');

  const employee = await User.findByPk(req.params.id);
  if (!employee) throw new ApiError(404, 'Employee not found.');

  employee.status = status;
  await employee.save();

  await logActivity(req.user.id, 'EMPLOYEE_STATUS_CHANGED', 'User', employee.id, { status });
  res.json({ success: true, employee: sanitize(employee) });
});

// PUT /api/employees/:id  (update name/department, admin only)
const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findByPk(req.params.id);
  if (!employee) throw new ApiError(404, 'Employee not found.');

  const { name, departmentId } = req.body;
  if (name !== undefined) employee.name = name;
  if (departmentId !== undefined) employee.departmentId = departmentId;

  await employee.save();
  await logActivity(req.user.id, 'EMPLOYEE_UPDATED', 'User', employee.id, req.body);
  res.json({ success: true, employee: sanitize(employee) });
});

function sanitize(user) {
  const { id, name, email, role, departmentId, status, createdAt } = user;
  return { id, name, email, role, departmentId, status, createdAt };
}

module.exports = { listEmployees, changeRole, changeStatus, updateEmployee };
