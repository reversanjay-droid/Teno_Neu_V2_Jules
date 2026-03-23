const WebSocket = require("ws");
const { HttpsProxyAgent } = require("https-proxy-agent");
const logger = require("../config/logger");
const colors = require("../config/colors");

const WS_URL = "wss://secure.ws.teneo.pro/websocket";
const WS_VERSION = "v0.2";
const WS_HEADERS = {
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://emcclcoaglgcpoognfiggmhnhgabppkm",
  Pragma: "no-cache",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const PING_INTERVAL_MS = 10000;
const MAX_RECONNECT_ATTEMPTS = 20;
const RECONNECT_BASE_DELAY_MS = 30000;
const RECONNECT_MAX_DELAY_MS = 120000;
const RECONNECT_JITTER_MS = 5000;

/**
 * Returns a formatted account prefix string used in log messages.
 * @param {number} index - 1-based account index.
 * @returns {string}
 */
function accountPrefix(index) {
  const padded = String(index).padStart(2, "0");
  return colors.accountName(`Account ${padded}`);
}

/**
 * Returns a formatted points string.
 * @param {number|string} pts
 * @returns {string}
 */
function fmtPoints(pts) {
  return colors.brightGreen(String(pts).padStart(8, " "));
}

/**
 * Returns the current local time as HH:MM:SS.
 * @returns {string}
 */
function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

/**
 * Normalizes a proxy URL so it always has an http(s) scheme.
 * @param {string} proxy
 * @returns {string}
 */
function normalizeProxy(proxy) {
  if (!proxy.startsWith("http://") && !proxy.startsWith("https://")) {
    return `http://${proxy}`;
  }
  return proxy;
}

class TeneoBot {
  /**
   * @param {string}  token        - Bearer / JWT access token.
   * @param {number}  accountIndex - 1-based account index.
   * @param {string|null} proxy    - Optional proxy URL string.
   */
  constructor(token, accountIndex, proxy = null) {
    this.token = token;
    this.accountIndex = accountIndex;
    this.proxy = proxy;

    this.ws = null;
    this.pingInterval = null;
    this.reconnectAttempts = 0;
    this.isRestarting = false;

    // Stats
    this.pointsTotal = 0;
    this.pointsToday = 0;
    this.lastMessage = "";
  }

  // ─── Connection ──────────────────────────────────────────────────────────────

  connect() {
    if (this.isRestarting) return;

    const wsUrl =
      `${WS_URL}?accessToken=${encodeURIComponent(this.token)}` +
      `&version=${encodeURIComponent(WS_VERSION)}`;

    const wsOptions = { headers: WS_HEADERS };
    if (this.proxy) {
      wsOptions.agent = new HttpsProxyAgent(normalizeProxy(this.proxy));
    }

    try {
      this.ws = new WebSocket(wsUrl, wsOptions);
      this._attachListeners();
    } catch (err) {
      logger.error(this._fmt(`Failed to create WebSocket: ${err.message}`));
      this._scheduleReconnect();
    }
  }

  disconnect() {
    this._cleanup();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  _attachListeners() {
    this.ws.on("open", () => {
      this.reconnectAttempts = 0;
      logger.success(this._fmt("Connected to Teneo WebSocket server"));
      if (this.proxy) {
        logger.info(this._fmt(`Proxy: ${colors.proxy(this.proxy)}`));
      }
      this._startPing();
    });

    this.ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw);
        this._handleMessage(data);
      } catch (err) {
        logger.error(this._fmt(`Message parse error: ${err.message}`));
      }
    });

    this.ws.on("close", (code, reason) => {
      logger.warn(
        this._fmt(
          `Connection closed (code=${code}${reason ? ", reason=" + reason : ""})`
        )
      );
      this._cleanup();
      this._scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      logger.error(this._fmt(`WebSocket error: ${err.message}`));
      this._cleanup();
      this._scheduleReconnect();
    });
  }

  _handleMessage(data) {
    const time = nowTime();

    if (data.pointsTotal !== undefined) {
      this.pointsTotal = data.pointsTotal;
    }
    if (data.pointsToday !== undefined) {
      this.pointsToday = data.pointsToday;
    }
    if (data.message) {
      this.lastMessage = data.message;
    }

    if (data.message === "Connected successfully") {
      logger.success(this._fmt(`Connected at ${time}`));
      logger.info(this._fmt(`Points Today : ${fmtPoints(this.pointsToday)}`));
      logger.info(this._fmt(`Points Total : ${fmtPoints(this.pointsTotal)}`));
    } else if (data.message === "Pulse from server") {
      logger.info(this._fmt(`Server pulse  [${time}]`));
      logger.info(this._fmt(`Points Today : ${fmtPoints(this.pointsToday)}`));
      logger.info(this._fmt(`Points Total : ${fmtPoints(this.pointsTotal)}`));
    } else if (data.message) {
      logger.info(this._fmt(`Message: ${data.message} [${time}]`));
    }
  }

  _startPing() {
    this._clearPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "PING" }));
        logger.info(this._fmt(`Ping sent [${nowTime()}]`));
      }
    }, PING_INTERVAL_MS);
  }

  _clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _cleanup() {
    this._clearPing();
  }

  _scheduleReconnect() {
    if (this.isRestarting) return;

    this.reconnectAttempts += 1;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._initiateRestart();
      return;
    }

    const exponential = RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1);
    const delay =
      Math.min(exponential, RECONNECT_MAX_DELAY_MS) +
      Math.floor(Math.random() * RECONNECT_JITTER_MS);

    logger.warn(
      this._fmt(
        `Reconnecting in ${Math.floor(delay / 1000)}s ` +
          `(attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
      )
    );
    setTimeout(() => this.connect(), delay);
  }

  _initiateRestart() {
    if (this.isRestarting) return;
    this.isRestarting = true;
    logger.warn(
      this._fmt(
        `Max reconnect attempts reached. Restarting process in 10s…`
      )
    );
    this.disconnect();
    setTimeout(() => {
      const { spawn } = require("child_process");
      const child = spawn(process.execPath, process.argv.slice(1), {
        stdio: "inherit",
        detached: true,
      });
      child.unref();
      process.exit(0);
    }, 10000);
  }

  /** Returns a prefixed log message string. */
  _fmt(msg) {
    return `${accountPrefix(this.accountIndex)} > ${msg}`;
  }
}

module.exports = TeneoBot;
