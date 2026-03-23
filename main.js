/**
 * Teno Neu V2 – Automated multi-account WebSocket client for Teneo node
 * interaction with optional proxy support.
 *
 * Usage:
 *   1. Add one JWT/bearer token per line to data.txt
 *   2. (Optional) Add one proxy per line to proxy.txt
 *   3. node main.js
 */

const fs = require("fs");
const path = require("path");

const displayBanner = require("./config/banner");
const logger = require("./config/logger");
const TeneoBot = require("./src/bot");

const TOKEN_FILE = path.join(__dirname, "data.txt");
const PROXY_FILE = path.join(__dirname, "proxy.txt");

/**
 * Reads a text file and returns trimmed, non-empty lines.
 * Returns an empty array if the file does not exist.
 * @param {string} filePath
 * @returns {string[]}
 */
function readLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

/**
 * Entry point – loads tokens & proxies, then starts one bot per token.
 */
async function main() {
  displayBanner();

  // ── Load tokens ────────────────────────────────────────────────────────────
  const tokens = readLines(TOKEN_FILE);
  if (tokens.length === 0) {
    logger.error(
      `No tokens found in ${TOKEN_FILE}. ` +
        "Add one JWT/bearer token per line and restart."
    );
    process.exit(1);
  }
  logger.info(`Loaded ${tokens.length} token(s) from ${TOKEN_FILE}`);

  // ── Load proxies (optional) ────────────────────────────────────────────────
  const proxies = readLines(PROXY_FILE);
  if (proxies.length > 0) {
    logger.info(`Loaded ${proxies.length} proxy(ies) from ${PROXY_FILE}`);
  } else {
    logger.info("No proxy file found – running without proxies.");
  }

  // ── Start bots ─────────────────────────────────────────────────────────────
  logger.info(`Starting ${tokens.length} bot instance(s)…`);

  const bots = tokens.map((token, i) => {
    const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
    const bot = new TeneoBot(token, i + 1, proxy);
    bot.connect();
    return bot;
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  process.on("SIGINT", () => {
    logger.warn("Shutting down – closing all connections…");
    bots.forEach((bot, i) => {
      logger.warn(
        `Account ${String(i + 1).padStart(2, "0")} > Closing connection`
      );
      bot.disconnect();
    });
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
