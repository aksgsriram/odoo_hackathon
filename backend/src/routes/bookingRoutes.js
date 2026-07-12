const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  createBooking, listBookings, rescheduleBooking, cancelBooking,
} = require('../controllers/bookingController');

router.get('/', authenticate, listBookings);
router.post('/', authenticate, createBooking); // Employees, Dept Heads can book
router.patch('/:id/reschedule', authenticate, rescheduleBooking);
router.patch('/:id/cancel', authenticate, cancelBooking);

module.exports = router;
