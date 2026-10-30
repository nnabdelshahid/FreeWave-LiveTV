# FreeWave Live TV

A small, local-first live TV app for **LG webOS 22** televisions. It plays free, broadcaster-published HLS streams with the TV's native video pipeline, imports M3U playlists and XMLTV guides, and needs no account, backend, proxy, subscription, or paid service.

Built, installed, and checked on the target **LG 24LQ520S-PU** (webOS 22, 1366 × 768) on 2026-10-29/30.

## Is this a free YouTube TV?

**No.** FreeWave is not a free copy of YouTube TV, Sling, Hulu + Live TV, or cable. It ships **13 verified public feeds**, mostly news, business, weather, and sports news.

- Exact free feeds of subscription-only networks (ESPN, TNT, USA, FX, Discovery, HGTV, Food Network, Comedy Central, MTV, TCM, and the rest of the YouTube TV cable lineup): **0**.
- ABC, CBS, NBC, FOX, PBS, and local stations are free over the air, but webOS gives third-party apps no supported tuner API. Use the TV's own antenna input.
- Pluto TV, Plex, LG Channels, Tubi, and Samsung TV Plus remain in their own apps; their tokenized internal endpoints are not copied or counted.

The full network-by-network comparison is in **[docs/NETWORK-PARITY.md](docs/NETWORK-PARITY.md)**.

## Status at a glance

| Area | Status | Evidence |
| --- | --- | --- |
| Build and install on TV | **VERIFIED** | `ares-install` returned `Success` for 1.3.0; `ares-launch` reported the app launched |
| Final lineup on TV | **VERIFIED** | On-device state: `v1.3.0`, **13 rows, 13 `FREE LIVE` labels** |
| Live playback, 13 channels | **VERIFIED (video)** | All 13 reached `readyState 4`, advanced `currentTime`, and reported decoded video dimensions; the four new feeds were sampled after install |
| Audible sound | **NOT TESTED** | One enabled audio track, unmuted, volume 1. webOS exposes no reliable decoded-audio counter; a human listening check is required |
| Remote key handling on the TV | **VERIFIED (device input)** | Launch focus, visible 3 px ring, raw 37–40/13/461, Back, favorites, pointer, player controls, ChannelUp/Down. See [REMOTE-CONTROL.md](docs/REMOTE-CONTROL.md) |
| Physical remote actuation | **NOT TESTED** | The agent cannot press the physical remote; device-level key injection is not the same test |
| TV guide import | **VERIFIED (1.2.0 build)** | Pasted XMLTV produced 2 entries with local-time labels; guide code is unchanged in 1.3.0, but not re-sampled after the lineup change |
| Favorites, recent, resume | **VERIFIED (1.2.0 build)** | Persisted across reload; storage keys unchanged |
| M3U import | **VERIFIED (automated + on-device search/lineup)** | Parser tests pass; an imported list rendered on the TV. URL import depends on the source's CORS policy |
| 1.3.0 IPK | **VERIFIED** | 35,846 bytes; 18 entries; app id/version/resolution valid; no secrets. SHA-256 `43a7777f…` |
| GitHub repository + release | **VERIFIED** | [v1.3.0](https://github.com/nnabdelshahid/FreeWave-LiveTV/releases/tag/v1.3.0); asset 35,846 bytes, SHA-256 `43a7777f…`; downloaded again and matched byte-for-byte |
| GitHub Actions CI | **BLOCKED** | Runs `41013905317` (PR) and `41013861357` (branch) failed with `runner_id: 0`, no steps; the same pipeline passes locally (49/49) |
| Pull request | **BLOCKED (open)** | [PR #3](https://github.com/nnabdelshahid/FreeWave-LiveTV/pull/3) is mergeable but `UNSTABLE`; required checks cannot start |

The 1.0.0 and 1.2.0 packages are superseded. The 1.2.0 remote-control repair — deterministic launch focus, visible focus, explicit OK activation, single Back model, field escape, focus restoration, and diagnostics — is retained in 1.3.0.

## Channel lineup

**13 broadcaster-published, unencrypted HLS feeds**, each labeled `FREE LIVE`:

| # | Channel | Category | Language |
| --- | --- | --- | --- |
| 1 | CGTN English | News | English |
| 2 | DW English | News | English |
| 3 | DW Arabic | News | Arabic |
| 4 | CBS News 24/7 | News | English |
| 5 | CNA | News | English |
| 6 | Bloomberg Television US | Business | English |
| 7 | Bloomberg Television Europe | Business | English |
| 8 | Red Bull TV | Sports | English |
| 9 | Arirang TV | International | English |
| 10 | Al Jazeera Arabic | News | Arabic |
| 11 | FOX Weather | Weather | English |
| 12 | CBS Sports HQ | Sports | English |
| 13 | CBS Sports Golazo | Sports | English |

Category totals: **6 news, 2 business, 3 sports, 1 weather, 1 international**. There are **no verified free linear movies, kids, music, documentary, general-entertainment, or premium-sports channels** that permit this kind of playback.

Rights evidence, codecs, HLS notes, playback dimensions, and rejected sources are in [CHANNELS.md](docs/CHANNELS.md). NASA TV passed host validation but failed on the TV with media error 4, so it was **removed** rather than shown as working.

## Features

- Native webOS HLS playback with H.264 video and AAC audio expectations.
- Channel categories, search, favorites, recently watched, last-channel resume, and a visible `FREE LIVE` access label.
- Automatic backup-feed failover when an M3U entry supplies `backup-url`, plus configurable reconnect attempts.
- Full-screen TV guide with current/next entries, local-time conversion, descriptions, and explicit “guide data unavailable” states.
- M3U/M3U8 import from URL, file, or pasted text; XMLTV import from URL, file, or pasted text.
- Remote support: deterministic launch focus, visible 3 px focus ring, explicit OK activation, D-pad escape from text fields, focus restoration, Back via key 461, color keys, number tuning, channel up/down, play/pause/stop, seek, guide/info.
- Optional local-only remote diagnostics overlay: key, action, handled state, focus, screen, previous screen, and channel.
- Local diagnostics: network state, player state, video size, decoded audio bytes when exposed, dropped frames, storage use, guide size, last error, and a live manifest check.
- No telemetry, ads, accounts, secrets, or third-party runtime libraries.

## Install

```text
com.nader.freewavelive_1.3.0_all.ipk
```

Use webOS Dev Manager or the official CLI. Full steps: [INSTALL.md](docs/INSTALL.md).

```bash
ares-install -d "Office TV" com.nader.freewavelive_1.3.0_all.ipk
ares-launch  -d "Office TV" com.nader.freewavelive
```

An unsigned package requires an active Developer Mode session and Key Server pairing.

Upgrading from 1.2.0 keeps the app id `com.nader.freewavelive` and replaces only the bundled starter source, preserving imported playlists, favorites, guide data, and recent history.

## Build and test

Requires Node.js 20+ and the webOS CLI (`npm install -g @webos-tools/cli`).

```bash
npm ci                 # clean install, including the jsdom test dependency
npm run build:lineup   # regenerate M3U + starter script from data/channels.json
npm run lint           # syntax + JSON + package metadata checks
npm run package        # ares-package app -o .
npm test               # 49 tests
npm run check:ipk      # archive, metadata, contents, secret scan
npm run verify:streams # host-side live endpoint/codec check (network required)
```

`npm test` expects the current-version IPK to exist, so package before running the full suite (the `ci` script does this in order).

## Architecture

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data flow, state model, and retry state machine, and [REMOTE-CONTROL.md](docs/REMOTE-CONTROL.md) for the key map, focus engine, Back model, diagnostics, and physical-remote acceptance steps.

```text
data/channels.json ──build-lineup──▶ app/default-playlist.js ──▶ app state ──▶ <video> (native HLS)
        │                                    ▲
        └────────── app/data/public-channels.m3u

M3U / XMLTV imports ──▶ app/js/core.js parsers ──▶ localStorage ──▶ guide + resume state
```

## Rights and limitations

- Only streams a broadcaster publishes publicly for free playback are included. FreeWave does not proxy, restream, decrypt, strip tokens, or bypass a geoblock.
- No DRM circumvention, credential scraping, premium-channel access, or provider-internal FAST endpoint copying.
- Free feeds may carry the publisher's own advertising; this app cannot remove it.
- The TV's OTA tuner is not accessible to webOS apps; use the TV's built-in Live TV input for antenna channels.
- Broadcaster feeds can change or geo-block without notice. `npm run verify:streams` re-checks them.
- The 300-channel target is not achieved; it requires a distribution licence or a provider API that does not exist for this app. See [NETWORK-PARITY.md](docs/NETWORK-PARITY.md).

## Project layout

```text
app/                 installable webOS app (appinfo.json, HTML, CSS, JS, bundled playlist)
data/channels.json   canonical verified channel manifest
scripts/             lineup build, lint, package verifier, stream verifier
tests/               49 automated tests, including jsdom remote-navigation integration tests
docs/                architecture, channels, network parity, build, install, troubleshooting, verification
.github/workflows/   CI and tagged-release packaging
```
