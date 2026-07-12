// Wraps async route handlers so thrown errors are forwarded to Express's error middleware
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
