// File: middlewares/validation.middleware.js
const Joi = require("joi");

function validate(schema) {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Report all errors
      allowUnknown: true, // Allow unknown keys that are not in schema
      stripUnknown: true, // Remove unknown keys from the validated data
    };

    const { error, value } = schema.validate(req.body, validationOptions);

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({
        error: "Validation error",
        details: errors,
      });
    }

    req.body = value; // Use the sanitized values
    next();
  };
}

module.exports = validate;
