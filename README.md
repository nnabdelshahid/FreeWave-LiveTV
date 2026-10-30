# FreeWave Live TV

A small, local-first live TV app for **LG webOS 22** televisions. It plays free, broadcaster-published HLS streams with the TV's native video pipeline, imports M3U playlists and XMLTV guides, and needs no account, backend, proxy, subscription, or paid service.

Built and installed on the target **LG 24LQ520S-PU** (webOS 22, 1366 × 768) on 2026-10-29.

## Status at a glance

| Area | Status | Evidence |
| --- | --- | --- |
| Build and install on TV | **VERIFIED** | `ares-install` reported `Success`; app launched and rendered on the 24LQ520S-PU |
| Live playback, 9 channels | **VERIFIED (video)** | All 9 channels reached `readyState 4`, advanced `currentTime`, and reported decoded video dimensions on the TV |
| Audible sound | **NOT TESTED** | Video reports one enabled audio track, unmuted, volume 1. webOS does not expose an audio-byte counter and its hardware pipeline returned silence through Web Audio, so audible output was not instrumented |
| Remote D-pad, channel keys, Back | **VERIFIED** | Focus moved CGTN → DW with ArrowDown; ChannelDown switched CNA → CBS News 24/7; Back closed the guide |
| TV guide import | **VERIFIED** | A pasted XMLTV document produced 2 schedule entries in the on-TV guide with local-time labels |
| Favorites, recent, resume | **VERIFIED** | Favorites and 9 recent channels persisted; after reload the last channel resumed playing |
| M3U import | **VERIFIED (automated + on-device search/lineup)** | Parsing covered by tests; imported lineup rendered on the TV. A URL import is subject to the source's CORS policy |
| 1.1.0 IPK | **VERIFIED** | `scripts/check-ipk.js` validates archive structure, package metadata, required files, and absence of secrets |
| GitHub repository + release | **VERIFIED** | `nnabdelshahid/FreeWave-LiveTV`, release `v1.1.0`; the downloaded asset re-hashed to `ec53bfd1…` |
| GitHub Actions CI | **BLOCKED** | Every job fails before a runner starts (`runner_id 0`, zero steps, 3–5 s) while GitHub status is operational. The same checks pass locally |
| Pull request | **BLOCKED (open)** | Delivery-evidence PR opened; it is intentionally not merged because its required checks cannot start |

The original 1.0.0 IPK was recovered and inspected (valid Debian `ar` archive containing `control.tar.gz` and `data.tar.gz`). It is superseded by 1.1.0.

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
- Remote support: arrows, OK, Back, color keys, number tuning, channel up/down, play/pause/stop, guide/info.
- Local diagnostics: network state, player state, video size, decoded audio bytes when exposed, dropped frames, storage use, guide size, last error, and a live manifest check.
- No telemetry, ads, accounts, secrets, or third-party runtime libraries.

## Install

```text
com.nader.freewavelive_1.1.0_all.ipk
```

Use webOS Dev Manager or the official CLI. Full steps: [INSTALL.md](docs/INSTALL.md).

```bash
ares-install -d "Office TV" com.nader.freewavelive_1.1.0_all.ipk
ares-launch  -d "Office TV" com.nader.freewavelive
```

An unsigned package requires an active Developer Mode session and Key Server pairing.

## Build and test

Requires Node.js 20+ and the webOS CLI (`npm install -g @webos-tools/cli`).

```bash
npm run build:lineup   # regenerate M3U + starter script from data/channels.json
npm run lint           # syntax + JSON + package metadata checks
npm run package        # ares-package app -o .
npm test               # 37 tests
npm run check:ipk      # archive, metadata, contents, secret scan
npm run verify:streams # host-side live endpoint/codec check (network required)
```

`npm test` expects the current-version IPK to exist, so package before running the full suite (the `ci` script does this in order).

## Architecture

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data flow, state model, retry state machine, and remote key map.

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
tests/               37 automated tests and deterministic fixtures
docs/                architecture, channels, build, install, troubleshooting, verification
.github/workflows/   CI and tagged-release packaging
```
