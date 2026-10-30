# Architecture

## Goals

FreeWave is a single-page webOS app with no server component. Everything it needs ships inside the IPK: HTML, CSS, JavaScript, icons, and the verified starter lineup. User state lives in the app's `localStorage`.

## Runtime pieces

| File | Responsibility |
| --- | --- |
| `app/appinfo.json` | webOS identity (`com.nader.freewavelive`), version, 1280×720 canvas |
| `app/index.html` | Three-column layout, player, now/next card, settings dialog, guide dialog |
| `app/styles.css` | 1280×720 design system, focus states, guide and diagnostics styling |
| `app/js/core.js` | Pure logic: M3U, XMLTV, timezone conversion, filtering, retries, manifest analysis, remote-key mapping |
| `app/js/app.js` | UI controller, state, persistence, playback, diagnostics, remote handling |
| `app/default-playlist.js` | Generated starter lineup (no network required at first launch) |
| `app/data/public-channels.m3u` | Same lineup as M3U for inspection/import |

`core.js` is UMD-style: it attaches `FreewaveCore` to `window` in the app and exports the same API through `module.exports` for Node tests.

## Data flow

```text
data/channels.json
      │  scripts/build-lineup.js
      ├──────────────▶ app/data/public-channels.m3u
      └──────────────▶ app/default-playlist.js
                                   │
first launch / reset              ▼
                        state.sources[].channels
                                   │
             ┌─────────────────────┼──────────────────────┐
             ▼                     ▼                      ▼
     sidebar categories     channel list + search     <video src=HLS>
                                                              │
XMLTV URL/file/text ──▶ core.parseXmltv ──▶ state.guide ──▶ now/next + guide dialog
                                                              │
                          localStorage('freewave.live.v1') ◀──┘
```

## State and persistence

One key, `freewave.live.v1`, stores:

```js
{
  sources: [{ id, name, url, channels: [...] }],
  favorites: [channelKey],
  recent: [channelKey],          // newest first, max 12
  prefs: { resume, startMuted, retries },
  guide: { channels, programs }, // already filtered to matching tvg-ids
  guideUrl,
  guideUpdatedAt,
  lastKey
}
```

- A channel key is `tvg-id|url` (or `name|url` when no id), so the same stream imported twice deduplicates.
- Saves are wrapped in `try/catch`; a full quota shows a user-facing message instead of breaking playback.
- Version 1.0 state loads unchanged; missing fields get defaults.
- Last channel, favorites, recent list, and guide survive relaunch (verified on device).

## Playback

`startPlayback(channel, url, isRetry)`:

1. Pauses the previous stream.
2. Assigns `video.src` and calls `load()`.
3. Calls `play()`; a rejected promise shows a “Press PLAY” message rather than a silent failure.

The `error` event drives recovery:

```text
error
  │
  ├─ retryable and channel.backupUrl and first failure ──▶ backup feed (0.9 s)
  ├─ retryable and attempts <= prefs.retries ────────────▶ primary feed (1.5 s, 3 s, 4.5 s)
  └─ otherwise ─────────────────────────────────────────▶ specific message for code 2/3/4
```

`planRetry` is pure and unit-tested. Backup is attempted only once, so the app cannot loop between two dead URLs. Manual **Reconnect** resets the counter and returns to the primary.

### Codec expectations

webOS 22 natively supports HLS with H.264 video and AAC audio. The app does not transcode or repackage; incompatible feeds surface a decode error instead of being silently mislabeled.

### PROGRAM-DATE-TIME

LG's streaming documentation lists `EXT-X-PROGRAM-DATE-TIME` as unsupported. CGTN's current manifest contains three such tags, and it played on the 24LQ520S-PU on 2026-10-29. The tag is therefore a documented risk, not a proven blocker on this firmware. The app cannot strip tags from a broadcaster's manifest, and no proxy is used. See [STREAM-COMPATIBILITY.md](STREAM-COMPATIBILITY.md).

## Guide

- `parseXmltv` accepts `YYYYMMDDHHMMSS ±HHMM` and converts every entry to a UTC epoch.
- Display always uses the TV's local timezone via `Intl.DateTimeFormat`; the guide header names that zone.
- Entries are filtered to the ids present in the loaded lineup (`tvg-id` ↔ XMLTV `channel`), capped at 120 programs per channel, and limited to a −6 h/+48 h window.
- `guideRows` returns `hasData: false` when nothing matches. The UI prints “Guide data unavailable” rather than inventing programs.
- The guide dialog lists every channel with NOW/NEXT cells; focusing a row shows the available description.
- If a guide URL is saved and the TV is online, it refreshes 5 s after launch and every 6 hours.

## Remote-control map

Centralized in `core.remoteAction(key, keyCode, isEditable)`:

| Input | Action |
| --- | --- |
| Arrows | Spatial focus movement, scoped to the open dialog |
| OK / Enter | Native button activation |
| Back / Escape | Close guide → close settings → arm exit (second Back exits via `webOS.platformBack`) |
| Red / Green | All channels / Favorites |
| Yellow / `y` | Toggle favorite for the focused or current channel |
| Blue | Settings |
| Channel Up/Down, Page Up/Down | Next/previous visible channel |
| Play / Pause / Stop | Playback control |
| Info / Guide | Open TV guide |
| Digits | Channel-number tuning after 900 ms |

Text inputs suppress arrow/letter handling so the on-screen keyboard and search field work normally.

## Diagnostics

The settings dialog reports local-only values: app version, network, current channel, redacted stream URL, player state, video dimensions, decoded audio bytes when the platform exposes them, dropped frames, guide entry count, guide update time, storage use, and the last error. “Check current stream” fetches the manifest and reports HLS type, renditions, encryption, discontinuity, and PROGRAM-DATE-TIME presence. A CORS block is reported as such.

Every 10 seconds while playing, the app logs a `[freewave] stats` line with redacted URLs, playback time, dimensions, decode counters, dropped frames, and mute state for on-device inspection.

## Packaging and CI

`ares-package app -o .` produces `com.nader.freewavelive_<version>_all.ipk` (an `ar` archive containing `control.tar.gz` and `data.tar.gz`). `scripts/check-ipk.js` parses both layers without external tools, checks the app id/version/resolution, confirms required files, and scans packaged text for secret patterns.

CI runs lint → lineup build → package → tests → IPK verification, then uploads the package artifact. Tagged releases attach the IPK to a GitHub Release.

## Security and privacy

- No server, account, API key, analytics, or ad SDK.
- Playlist URLs are stored locally; stream URLs in logs are stripped of query strings and credentials.
- Only `http:`/`https:` URLs without embedded credentials are accepted.
- No DRM handling, key extraction, or geoblock bypass.
- The TV tuner is not touched; webOS exposes no supported API for it.
