# GrabHeader

A Chromium browser extension for web developers. Click the toolbar icon to instantly copy HTTP response header values from the current page (or any recent request made by that page) to your clipboard.

## Features

- Captures response headers from page loads **and** XHR/fetch API calls (last 50 requests per tab)
- Configurable buttons — each one targets a specific header by name
- Optional **regex filter** per button to transform the value before copying (e.g. strip `Bearer ` from an Authorization token)
- Ships with two default buttons; easily add/edit/remove via the Options page

## Default Buttons

| Button | Header | Regex | Result |
|---|---|---|---|
| Grab Auth Token | `Authorization` | `^Bearer\s+(.+)$` | Copies just the token, without the `Bearer ` prefix |
| Grab Org ID | `X-Org-Id` | *(none)* | Copies the raw header value |

## Installation (Load Unpacked)

1. Clone or download this repository.
2. Open Chrome (or any Chromium browser) and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `GrabHeader` folder.
5. The GrabHeader icon will appear in your toolbar.

> Pin the extension to your toolbar via the Extensions puzzle-piece menu for quick access.

## Usage

1. Open a website and let it load (or trigger the API calls you're interested in).
2. Click the **GrabHeader** toolbar icon.
3. Click a **Grab …** button — the value is copied to your clipboard instantly.
   - ✓ Green flash = copied successfully.
   - ✗ Red flash = header not found in any recent request for this tab.

## Configuration

Click **⚙ Options** at the bottom of the popup (or right-click the icon → *Options*).

Each button has three fields:

| Field | Description |
|---|---|
| **Button Name** | Label shown in the popup (e.g. `Auth Token`) |
| **Header Name** | HTTP response header to look for, case-insensitive (e.g. `Authorization`) |
| **Regex Filter** | Optional. Applied to the raw header value before copying. |

### Regex Filter details

- Leave blank to copy the raw value as-is.
- If the regex contains a **capture group**, group 1 of the first match is copied.
- If the regex has **no capture group**, the full match is copied.
- If the regex doesn't match, the raw value is copied unchanged.

**Examples:**

| Goal | Header | Regex |
|---|---|---|
| Strip `Bearer ` prefix | `Authorization` | `^Bearer\s+(.+)$` |
| Extract a UUID from a composite value | `X-Request-Id` | `([0-9a-f-]{36})` |
| Copy everything after a colon | `X-Custom` | `:\s*(.+)$` |

## Permissions

| Permission | Why |
|---|---|
| `webRequest` | Read response headers from network requests |
| `storage` | Store captured headers (session) and your config (sync) |
| `tabs` | Identify which tab is currently active |
| `clipboardWrite` | Write the copied value to the clipboard |
| `<all_urls>` | Observe requests on any website |

This extension is designed for **local development use only** and is not published to the Chrome Web Store.
