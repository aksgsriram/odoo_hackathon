const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/roleCheck');
const {
  registerAsset, listAssets, getAsset, updateAsset, transitionStatus,
} = require('../controllers/assetController');

router.get('/', authenticate, listAssets);
router.get('/:id', authenticate, getAsset);
router.post('/', authenticate, allowRoles('Admin', 'AssetManager'), registerAsset);
router.put('/:id', authenticate, allowRoles('Admin', 'AssetManager'), updateAsset);
router.patch('/:id/status', authenticate, allowRoles('Admin', 'AssetManager'), transitionStatus);

module.exports = router;
