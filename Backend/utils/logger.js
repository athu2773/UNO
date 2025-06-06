// logger.js
const fs = require("fs");
const path = require("path");

// Create a write stream for logging to a file (append mode)
const logFilePath = path.join(__dirname, "../logs/server.log");
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

// Middleware to log all requests
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | ${duration}ms\n`;
    
    // Log to console
    process.stdout.write(log);
    
    // Log to file
    logStream.write(log);
  });

  next();
}

// Error logging middleware
function errorLogger(err, req, res, next) {
  const log = `${new Date().toISOString()} | ERROR | ${req.method} ${req.originalUrl} | Message: ${err.message}\nStack: ${err.stack}\n\n`;
  
  // Log to console
  process.stderr.write(log);

  // Log to file
  logStream.write(log);

  next(err);
}

module.exports = {
  requestLogger,
  errorLogger,
};
