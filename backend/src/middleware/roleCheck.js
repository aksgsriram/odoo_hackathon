const ApiError = require('../utils/ApiError');

// Usage: allowRoles('Admin', 'AssetManager')
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required.'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Access denied. Requires role: ${roles.join(' or ')}.`));
    }
    next();
  };
}

module.exports = allowRoles;
