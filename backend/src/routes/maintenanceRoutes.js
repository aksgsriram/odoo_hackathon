const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');
const {
  raiseRequest, listRequests, decideRequest, assignTechnician, startProgress, resolveRequest,
} = require('../controllers/maintenanceController');

router.get('/', authenticate, listRequests);
router.post('/', authenticate, raiseRequest); // any holder can raise
router.patch('/:id/decision', authenticate, allowRoles('Admin', 'AssetManager'), decideRequest);
router.patch('/:id/assign-technician', authenticate, allowRoles('Admin', 'AssetManager'), assignTechnician);
router.patch('/:id/start', authenticate, allowRoles('Admin', 'AssetManager'), startProgress);
router.patch('/:id/resolve', authenticate, allowRoles('Admin', 'AssetManager'), resolveRequest);

module.exports = router;
