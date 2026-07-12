const { Op } = require('sequelize');
const { Booking, Asset, User, Department } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity, notify } = require('../utils/activityLogger');

// Two bookings overlap if: existingStart < newEnd AND existingEnd > newStart
async function hasOverlap(assetId, startTime, endTime, excludeBookingId = null) {
  const where = {
    assetId,
    status: { [Op.in]: ['Upcoming', 'Ongoing'] },
    startTime: { [Op.lt]: endTime },
    endTime: { [Op.gt]: startTime },
  };
  if (excludeBookingId) where.id = { [Op.ne]: excludeBookingId };

  const conflict = await Booking.findOne({ where });
  return conflict;
}

// Recomputes a booking's display status based on current time (does not touch Cancelled)
function computeLiveStatus(booking) {
  if (booking.status === 'Cancelled') return booking.status;
  const now = new Date();
  if (now < booking.startTime) return 'Upcoming';
  if (now >= booking.startTime && now < booking.endTime) return 'Ongoing';
  return 'Completed';
}

// POST /api/bookings
const createBooking = asyncHandler(async (req, res) => {
  const { assetId, startTime, endTime, purpose, bookedForDepartmentId } = req.body;
  if (!assetId || !startTime || !endTime) throw new ApiError(400, 'assetId, startTime and endTime are required.');

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start) || isNaN(end) || start >= end) throw new ApiError(400, 'Invalid time range.');

  const asset = await Asset.findByPk(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found.');
  if (!asset.isBookable) throw new ApiError(400, `${asset.name} is not a bookable resource.`);

  const conflict = await hasOverlap(assetId, start, end);
  if (conflict) {
    throw new ApiError(409, `Resource is already booked from ${conflict.startTime.toISOString()} to ${conflict.endTime.toISOString()}.`, {
      conflictingBookingId: conflict.id,
    });
  }

  const booking = await Booking.create({
    assetId,
    bookedByEmployeeId: req.user.id,
    bookedForDepartmentId: bookedForDepartmentId || null,
    purpose: purpose || null,
    startTime: start,
    endTime: end,
    status: 'Upcoming',
  });

  await logActivity(req.user.id, 'BOOKING_CREATED', 'Booking', booking.id, { assetId, startTime, endTime });
  await notify(req.user.id, 'Booking Confirmed', `Your booking for ${asset.name} is confirmed.`, 'Booking', booking.id);

  res.status(201).json({ success: true, booking });
});

// GET /api/bookings?assetId=&status=&from=&to=   (calendar view of a resource's bookings)
const listBookings = asyncHandler(async (req, res) => {
  const { assetId, status, from, to } = req.query;
  const where = {};
  if (assetId) where.assetId = assetId;
  if (status) where.status = status;
  if (from || to) {
    where.startTime = {};
    if (from) where.startTime[Op.gte] = new Date(from);
    if (to) where.startTime[Op.lte] = new Date(to);
  }

  const bookings = await Booking.findAll({
    where,
    include: [
      { model: Asset, as: 'asset', attributes: ['id', 'name', 'assetTag', 'location'] },
      { model: User, as: 'bookedBy', attributes: ['id', 'name', 'email'] },
      { model: Department, as: 'bookedForDepartment', attributes: ['id', 'name'] },
    ],
    order: [['startTime', 'ASC']],
  });

  const withLiveStatus = bookings.map((b) => {
    const json = b.toJSON();
    json.status = computeLiveStatus(b);
    return json;
  });

  res.json({ success: true, bookings: withLiveStatus });
});

// PATCH /api/bookings/:id/reschedule
const rescheduleBooking = asyncHandler(async (req, res) => {
  const { startTime, endTime } = req.body;
  if (!startTime || !endTime) throw new ApiError(400, 'startTime and endTime are required.');

  const booking = await Booking.findByPk(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.status === 'Cancelled') throw new ApiError(400, 'Cannot reschedule a cancelled booking.');

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start) || isNaN(end) || start >= end) throw new ApiError(400, 'Invalid time range.');

  const conflict = await hasOverlap(booking.assetId, start, end, booking.id);
  if (conflict) throw new ApiError(409, 'New time slot overlaps with an existing booking.');

  booking.startTime = start;
  booking.endTime = end;
  booking.status = 'Upcoming';
  await booking.save();

  await logActivity(req.user.id, 'BOOKING_RESCHEDULED', 'Booking', booking.id, { startTime, endTime });
  res.json({ success: true, booking });
});

// PATCH /api/bookings/:id/cancel
const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await Booking.findByPk(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.status === 'Cancelled') throw new ApiError(400, 'Booking is already cancelled.');

  booking.status = 'Cancelled';
  booking.cancelledById = req.user.id;
  booking.cancelReason = reason || null;
  await booking.save();

  await logActivity(req.user.id, 'BOOKING_CANCELLED', 'Booking', booking.id, { reason });
  await notify(booking.bookedByEmployeeId, 'Booking Cancelled', 'Your booking has been cancelled.', 'Booking', booking.id);

  res.json({ success: true, booking });
});

module.exports = { createBooking, listBookings, rescheduleBooking, cancelBooking };
