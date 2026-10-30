# FreeWave Live TV

A small, local-first live TV app for **LG webOS 22** televisions. It plays free, broadcaster-published HLS streams with the TV's native video pipeline, imports M3U playlists and XMLTV guides, and needs no account, backend, proxy, subscription, or paid service.

Built and installed on the target **LG 24LQ520S-PU** (webOS 22, 1366 × 768) on 2026-10-29.

## Status at a glance

| Area | Status | Evidence |
| --- | --- | --- |
| Build and install on TV | **VERIFIED** | `ares-install` reported `Success`; app launched and rendered on the 24LQ520S-PU |
| Live playback, 9 channels | **VERIFIED (video)** | All 9 channels reached `readyState 4`, advanced `currentTime`, and reported decoded video dimensions on the TV |
| Audible sound | **NOT TESTED** | Video reports one enabled audio track, unmuted, volume 1. webOS does not expose an audio-byte counter and its hardware pipeline returned silence through Web Audio, so audible output was not instrumented |
| Remote key handling on the TV | **VERIFIED (device input)** | Launch focus on a channel card with a 3 px ring; raw `Unidentified` codes 37–40/13/461; Back closes Settings/Guide; favorites, pointer selection, player pause/resume, ChannelUp/Down. See [REMOTE-CONTROL.md](docs/REMOTE-CONTROL.md) |
| Physical remote actuation | **NOT TESTED** | The agent cannot press the physical remote. Device-level key injection is not the same as a human pressing it |
| TV guide import | **VERIFIED** | A pasted XMLTV document produced 2 schedule entries in the on-TV guide with local-time labels |
| Favorites, recent, resume | **VERIFIED** | Favorites and 9 recent channels persisted; after reload the last channel resumed playing |
| M3U import | **VERIFIED (automated + on-device search/lineup)** | Parsing covered by tests; imported lineup rendered on the TV. A URL import is subject to the source's CORS policy |
| 1.2.0 IPK | **VERIFIED** | `scripts/check-ipk.js` validates 18 entries, archive structure, package metadata, required files, and absence of secrets. SHA-256 `1b1421a8…` |
| GitHub repository + release | **VERIFIED** | `nnabdelshahid/FreeWave-LiveTV`, release [v1.2.0](https://github.com/nnabdelshahid/FreeWave-LiveTV/releases/tag/v1.2.0); the downloaded asset re-hashed to `1b1421a8…` |
| GitHub Actions CI | **BLOCKED** | Run `41011623571` failed with `runner_id: 0`, zero steps, in 4 s while GitHub status is operational. The same pipeline passes locally (48/48) |
| Pull request | **BLOCKED (open)** | [PR #2](https://github.com/nnabdelshahid/FreeWave-LiveTV/pull/2) contains the 1.2.0 fix; it is intentionally not merged because its required checks cannot start |

The original 1.0.0 IPK was recovered and inspected (valid Debian `ar` archive containing `control.tar.gz` and `data.tar.gz`). It is superseded by 1.2.0, which fixes launch focus, visible focus, OK activation, Back handling, and navigation out of Setup fields.

## Channel lineup

Nine broadcaster-published, unencrypted HLS feeds were validated from a US network and then played on the TV:

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

Rights evidence, codecs, HLS notes, and rejected sources are in [CHANNELS.md](docs/CHANNELS.md). Sources that failed validation (Al Jazeera, NHK World, TRT World, France 24, NASA TV, ABC News Live, Euronews, PBS Kids) are **not shipped**.

There are currently no verified free linear **movies, kids, or music** channels that publish a stable public HLS endpoint and permit embedding. The app does not scrape private FAST service endpoints or premium catalogs.

## Features

- Native webOS HLS playback with H.264 video and AAC audio expectations.
- Channel categories, search, favorites, recently watched, and last-channel resume.
- Automatic backup-feed failover when an M3U entry supplies `backup-url`, plus configurable reconnect attempts.
- Full-screen TV guide with per-channel current/next entries, local-time conversion, descriptions, and explicit “guide data unavailable” states.
- M3U/M3U8 import from URL, file, or pasted text; XMLTV import from URL, file, or pasted text.
- Remote support: deterministic launch focus, visible 3 px focus ring, explicit OK activation, D-pad escape from text fields, focus restoration, Back via key 461, color keys, number tuning, channel up/down, play/pause/stop, seek, guide/info.
- Optional local-only remote diagnostics overlay: key, action, handled state, focus, screen, previous screen, and channel.
- Local diagnostics: network state, player state, video size, decoded audio bytes when exposed, dropped frames, storage use, guide size, last error, and a live manifest check.
- No telemetry, ads, accounts, secrets, or third-party runtime libraries.

## Install

```text
com.nader.freewavelive_1.2.0_all.ipk
```

Use webOS Dev Manager or the official CLI. Full steps: [INSTALL.md](docs/INSTALL.md).

```bash
ares-install -d "Office TV" com.nader.freewavelive_1.2.0_all.ipk
ares-launch  -d "Office TV" com.nader.freewavelive
```

An unsigned package requires an active Developer Mode session and Key Server pairing.

## Build and test

Requires Node.js 20+ and the webOS CLI (`npm install -g @webos-tools/cli`).

```bash
npm ci                 # clean install, including the jsdom test dependency
npm run build:lineup   # regenerate M3U + starter script from data/channels.json
npm run lint           # syntax + JSON + package metadata checks
npm run package        # ares-package app -o .
npm test               # 48 tests
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

- Only streams a broadcaster publishes publicly for free playback are included.
- No DRM circumvention, geoblock bypass, credential scraping, restreaming, or premium-channel access.
- Free feeds may carry the publisher's own advertising; this app cannot remove it.
- The TV's OTA tuner is not accessible to webOS apps; use the TV's built-in Live TV input for antenna channels.
- Broadcaster feeds can change or geo-block without notice. `npm run verify:streams` re-checks them.

## Project layout

```text
app/                 installable webOS app (appinfo.json, HTML, CSS, JS, bundled playlist)
data/channels.json   canonical verified channel manifest
scripts/             lineup build, lint, package verifier, stream verifier
tests/               48 automated tests, including jsdom remote-navigation integration tests
docs/                architecture, channels, build, install, troubleshooting, verification
.github/workflows/   CI and tagged-release packaging
```
