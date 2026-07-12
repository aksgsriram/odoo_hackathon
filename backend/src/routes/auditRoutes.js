const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');
const {
  createAuditCycle, listAuditCycles, getAuditCycle, markAuditItem, closeAuditCycle,
} = require('../controllers/auditController');

router.get('/', authenticate, listAuditCycles);
router.get('/:id', authenticate, getAuditCycle);
router.post('/', authenticate, allowRoles('Admin', 'AssetManager'), createAuditCycle);
router.patch('/:cycleId/items/:itemId', authenticate, markAuditItem); // auditor-only check done in controller
router.patch('/:id/close', authenticate, allowRoles('Admin', 'AssetManager'), closeAuditCycle);

module.exports = router;
