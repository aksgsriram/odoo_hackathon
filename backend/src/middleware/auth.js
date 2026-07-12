const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the JWT, loads the user, attaches to req.user (session validation)
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw new ApiError(401, 'Authentication required. No token provided.');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired session. Please log in again.');
  }

  const user = await User.findByPk(payload.id);
  if (!user) throw new ApiError(401, 'User no longer exists.');
  if (user.status !== 'Active') throw new ApiError(403, 'Account is inactive. Contact your administrator.');

  req.user = user;
  next();
});

module.exports = authenticate;
