// File: middlewares/error.middleware.js

function errorHandler(err, req, res, next) {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // For validation errors, you can add special handling if using Joi or Mongoose validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.errors,
    });
  }

  res.status(statusCode).json({
    error: message,
  });
}

module.exports = errorHandler;
