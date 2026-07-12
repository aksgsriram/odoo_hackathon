const { User, Department } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signResetToken, verifyResetToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLogger');

// POST /api/auth/signup
// Always creates a plain Employee account. No role selection at signup, ever.
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, departmentId } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email and password are required.');
  }
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }

  const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  if (departmentId) {
    const dept = await Department.findByPk(departmentId);
    if (!dept) throw new ApiError(400, 'Invalid departmentId.');
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'Employee', // hard-coded: signup can NEVER self-assign a role
    departmentId: departmentId || null,
    status: 'Active',
  });

  await logActivity(user.id, 'USER_SIGNUP', 'User', user.id, { email: user.email });

  const token = signAccessToken(user);
  res.status(201).json({
    success: true,
    message: 'Account created as Employee.',
    token,
    user: sanitizeUser(user),
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required.');

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (!user) throw new ApiError(401, 'Invalid email or password.');

  if (user.status !== 'Active') throw new ApiError(403, 'Account is inactive. Contact your administrator.');

  const match = await comparePassword(password, user.passwordHash);
  if (!match) throw new ApiError(401, 'Invalid email or password.');

  const token = signAccessToken(user);
  await logActivity(user.id, 'USER_LOGIN', 'User', user.id, {});

  res.json({ success: true, token, user: sanitizeUser(user) });
});

// POST /api/auth/forgot-password
// Issues a short-lived reset token. In production this would be emailed;
// for the hackathon build we return it directly in the response.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'email is required.');

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

  // Always respond the same way whether or not the user exists (avoid email enumeration)
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, a reset link has been generated.' });
  }

  const resetToken = signResetToken(user);
  res.json({
    success: true,
    message: 'If that email exists, a reset link has been generated.',
    resetToken, // NOTE: for demo purposes only; wire up an email provider in production.
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) throw new ApiError(400, 'resetToken and newPassword are required.');
  if (newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 characters long.');

  let payload;
  try {
    payload = verifyResetToken(resetToken);
  } catch (err) {
    throw new ApiError(400, 'Reset link is invalid or has expired.');
  }

  const user = await User.findByPk(payload.id);
  if (!user) throw new ApiError(400, 'Reset link is invalid or has expired.');

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  await logActivity(user.id, 'PASSWORD_RESET', 'User', user.id, {});
  res.json({ success: true, message: 'Password has been reset. Please log in.' });
});

// GET /api/auth/me  (session validation)
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

function sanitizeUser(user) {
  const { id, name, email, role, departmentId, status, createdAt } = user;
  return { id, name, email, role, departmentId, status, createdAt };
}

module.exports = { signup, login, forgotPassword, resetPassword, me };
