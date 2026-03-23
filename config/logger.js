const { createLogger, format, transports } = require("winston");
const chalk = require("chalk");

const customFormat = format.printf(({ level, message }) => {
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false });

  switch (level) {
    case "error":
      return chalk.red(`[${ts}] ERROR  | ${message}`);
    case "warn":
      return chalk.yellow(`[${ts}] WARN   | ${message}`);
    case "info":
      return chalk.white(`[${ts}] INFO   | ${message}`);
    case "success":
      return chalk.green(`[${ts}] OK     | ${message}`);
    default:
      return `[${ts}] ${level.toUpperCase()} | ${message}`;
  }
});

const logger = createLogger({
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
  },
  level: "info",
  format: format.combine(format.errors({ stack: true }), customFormat),
  transports: [new transports.Console()],
});

module.exports = logger;
