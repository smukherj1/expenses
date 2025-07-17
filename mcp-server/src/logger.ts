// logger.ts
import { createLogger, format, transports } from "winston";
import * as path from "path";

const logDir = "/home/suvanjan/expenses_mcp";

// Ensure the log directory exists
import * as fs from "fs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = createLogger({
  level: "info", // Default log level
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }), // Log stack traces for errors
    format.splat(), // For string interpolation (e.g., logger.info('User %s', userName))
    format.printf(({ level, message, timestamp, stack }) => {
      // If there's a stack (from an error), append it
      if (stack) {
        return `${timestamp} ${level}: ${message}\n${stack}`;
      }
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error", // Only log errors to this file
    }),
    new transports.File({
      filename: path.join(logDir, "combined.log"), // All logs (info and above)
    }),
    new transports.File({
      filename: path.join(logDir, "debug.log"),
      level: "debug", // Log debug messages and above
    }),
  ],
  exceptionHandlers: [
    // Catch uncaught exceptions
    new transports.File({ filename: path.join(logDir, "exceptions.log") }),
  ],
  rejectionHandlers: [
    // Catch unhandled promise rejections
    new transports.File({ filename: path.join(logDir, "rejections.log") }),
  ],
});

export default logger;
