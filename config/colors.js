const chalk = require("chalk");

const colors = {
  reset: chalk.reset(""),
  bright: chalk.bold,
  dim: chalk.dim,

  // Account / label
  accountName: chalk.cyan.bold,

  // Point values
  brightGreen: chalk.greenBright,

  // Status messages
  success: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  info: chalk.white,

  // Misc
  banner: chalk.magentaBright,
  separator: chalk.gray,
  proxy: chalk.hex("#FFA500"),
};

module.exports = colors;
