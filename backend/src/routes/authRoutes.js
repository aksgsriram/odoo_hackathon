const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  signup, login, forgotPassword, resetPassword, me,
} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, me);

module.exports = router;
