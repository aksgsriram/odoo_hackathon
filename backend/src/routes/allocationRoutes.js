const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');
const {
  allocateAsset, listAllocations, listOverdueAllocations, returnAsset,
  createTransferRequest, listTransferRequests, decideTransferRequest,
} = require('../controllers/allocationController');

router.get('/overdue', authenticate, listOverdueAllocations);
router.get('/', authenticate, listAllocations);
router.post('/', authenticate, allowRoles('Admin', 'AssetManager', 'DepartmentHead'), allocateAsset);
router.post('/:id/return', authenticate, allowRoles('Admin', 'AssetManager', 'DepartmentHead'), returnAsset);

// Transfer requests: any authenticated holder can initiate; Asset Manager / Department Head decide
router.post('/transfer-requests', authenticate, createTransferRequest);
router.get('/transfer-requests', authenticate, listTransferRequests);
router.patch(
  '/transfer-requests/:id/decision',
  authenticate,
  allowRoles('Admin', 'AssetManager', 'DepartmentHead'),
  decideTransferRequest
);

module.exports = router;
