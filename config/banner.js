const figlet = require("figlet");
const chalk = require("chalk");

function displayBanner() {
  const banner = figlet.textSync("Teno Neu V2", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  console.log(chalk.magentaBright(banner));
  console.log(
    chalk.cyan(
      "  ╔══════════════════════════════════════════════════════════╗"
    )
  );
  console.log(
    chalk.cyan("  ║") +
      chalk.yellowBright("   Teneo Node - Multi-Account WebSocket Bot V2           ") +
      chalk.cyan("║")
  );
  console.log(
    chalk.cyan("  ║") +
      chalk.white(
        "   Auto-reconnect | Proxy support | Points tracker        "
      ) +
      chalk.cyan("║")
  );
  console.log(
    chalk.cyan(
      "  ╚══════════════════════════════════════════════════════════╝"
    )
  );
  console.log();
}

module.exports = displayBanner;
