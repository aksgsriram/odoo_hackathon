const jwt = require('jsonwebtoken');

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function signResetToken(user) {
  return jwt.sign(
    { id: user.id, purpose: 'password_reset' },
    process.env.JWT_RESET_SECRET,
    { expiresIn: process.env.JWT_RESET_EXPIRES_IN || '15m' }
  );
}

function verifyResetToken(token) {
  return jwt.verify(token, process.env.JWT_RESET_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken, signResetToken, verifyResetToken };
