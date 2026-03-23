# Teno Neu V2

Automated multi-account WebSocket client for [Teneo Community Node](https://dashboard.teneo.pro/) interaction with optional proxy support.

## Features

- **Multi-account support** – manage unlimited Teneo accounts in parallel
- **Proxy support** – assign proxies per account (round-robin) via `proxy.txt`
- **Auto-reconnection** – exponential back-off with jitter; auto-restarts process after max attempts
- **Live points tracking** – displays `pointsToday` and `pointsTotal` on every server pulse
- **Colorful console output** – easy-to-read, timestamped log lines
- **Graceful shutdown** – cleanly closes all WebSocket connections on `Ctrl+C`

## Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher
- npm (bundled with Node.js)
- A valid Teneo account and bearer/JWT token

## Installation

```bash
git clone https://github.com/reversanjay-droid/Teno_Neu_V2_Jules.git
cd Teno_Neu_V2_Jules
npm install
```

## Configuration

### 1 – Obtain your bearer token

1. Install the [Teneo Community Node](https://chromewebstore.google.com/detail/teneo-community-node/emcclcoaglgcpoognfiggmhnhgabppkm) browser extension.
2. Open the extension, right-click → **Inspect** → **Network** → **WS** tab.
3. Click **Disconnect** then **Connect**.
4. Copy the `accessToken` value from the WebSocket payload.

### 2 – Add tokens to `data.txt`

Create a `data.txt` file in the project root (see `data.txt.example` for reference):

```
jwt_token_account_1
jwt_token_account_2
jwt_token_account_3
```

One token per line. Lines starting with `#` are ignored.

### 3 – (Optional) Add proxies to `proxy.txt`

Create a `proxy.txt` file (see `proxy.txt.example` for reference):

```
http://user:pass@1.2.3.4:8080
socks5://1.2.3.5:1080
5.6.7.8:3128
```

One proxy per line. Proxies are assigned round-robin across accounts.  
Omit or leave the file empty to run without proxies.

## Usage

```bash
node main.js
# or
npm start
```

## Project Structure

```
Teno_Neu_V2/
├── config/
│   ├── banner.js       # ASCII art banner
│   ├── colors.js       # Chalk color helpers
│   └── logger.js       # Winston logger
├── src/
│   └── bot.js          # TeneoBot WebSocket client class
├── main.js             # Entry point
├── data.txt.example    # Token file template
├── proxy.txt.example   # Proxy file template
├── package.json
└── README.md
```

## Auto-Reconnection

| Setting | Value |
|---|---|
| Max reconnect attempts before restart | 20 |
| Base reconnect delay | 30 s |
| Max reconnect delay | 120 s |
| Jitter | 0–5 s |

After reaching the maximum attempts the process automatically restarts itself.

## Disclaimer

This tool is for **educational purposes only**.  
Using automation bots may violate Teneo's Terms of Service and could result in account suspension. Use at your own risk.

## License

MIT
