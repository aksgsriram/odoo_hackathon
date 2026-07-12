const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');

const {
  listDepartments, createDepartment, updateDepartment, deactivateDepartment,
} = require('../controllers/departmentController');
const { listCategories, createCategory, updateCategory } = require('../controllers/categoryController');
const {
  listEmployees, changeRole, changeStatus, updateEmployee,
} = require('../controllers/employeeController');

// Tab A: Department Management (Admin only for writes)
router.get('/departments', authenticate, listDepartments);
router.post('/departments', authenticate, allowRoles('Admin'), createDepartment);
router.put('/departments/:id', authenticate, allowRoles('Admin'), updateDepartment);
router.delete('/departments/:id', authenticate, allowRoles('Admin'), deactivateDepartment);

// Tab B: Asset Category Management (Admin only for writes)
router.get('/categories', authenticate, listCategories);
router.post('/categories', authenticate, allowRoles('Admin'), createCategory);
router.put('/categories/:id', authenticate, allowRoles('Admin'), updateCategory);

// Tab C: Employee Directory (Admin only - this is the ONLY place roles get assigned)
router.get('/employees', authenticate, allowRoles('Admin'), listEmployees);
router.patch('/employees/:id/role', authenticate, allowRoles('Admin'), changeRole);
router.patch('/employees/:id/status', authenticate, allowRoles('Admin'), changeStatus);
router.put('/employees/:id', authenticate, allowRoles('Admin'), updateEmployee);

module.exports = router;
