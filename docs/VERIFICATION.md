# Verification record — 2026-10-29

This file records what was actually executed and observed. Implementation claims are not substituted for evidence. Host-side and on-device results are kept separate.

## Environment

| Item | Value |
| --- | --- |
| Host OS | Windows 11, Git Bash |
| Node.js / npm | v24.19.0 / 11.17.0 |
| webOS CLI | `ares-package` 3.2.5 |
| FFmpeg `ffprobe` | 9.0.2-full_build |
| TV | LG **24LQ520S-PU** |
| webOS / SDK | 22 · `sdkVersion 7.6.0` |
| Firmware / board | `04.60.92` · `K8AP_ATSC_US` |
| Connection | Existing Developer Mode pairing, `prisoner@192.168.1.175:9922` |

## 1. Recovered 1.0.0 build

The previous workspace was found at `outputs/FreeWave-Live-TV` (not a Git repository). It contained the app source, 10 tests, docs, and `com.nader.freewavelive_1.0.0_all.ipk`.

The 1.0.0 package is a valid Debian `ar` archive, not a zip:

```text
debian-binary      4 bytes
control.tar.gz   284 bytes
data.tar.gz    24804 bytes
Package: com.nader.freewavelive
Version: 1.0.0
Architecture: all
```

`data.tar.gz` contains `usr/palm/applications/com.nader.freewavelive/` with `appinfo.json`, `index.html`, `styles.css`, `default-playlist.js`, `icon.png`, `largeIcon.png`, `js/app.js`, `js/core.js`, `data/public-channels.m3u`, plus `packageinfo.json`.

The recovered source was preserved and extended; the app id, visual design, 1280×720 canvas, and parser behavior were retained.

## 2. Automated checks

```text
npm test
ℹ tests 37
ℹ pass 37
ℹ fail 0
```

Coverage includes: M3U metadata/URL safety/entities, XMLTV parsing and timezone offsets, guide windows and now/next, missing guide data, favorites/recent pure logic, channel wrap, backup/primary retry exhaustion, media-error mapping, HLS master/media/PDT/encryption detection, URL redaction, remote-key mapping, ID/HTML consistency, version synchronization, lineup rights/evidence, rejected-source exclusion, generated-lineup equality, package contents, and secret scanning.

`npm run lint` passed for 11 JavaScript files and 2 JSON files.

## 3. Package

```text
node scripts/check-ipk.js
IPK: com.nader.freewavelive_1.1.0_all.ipk
Size: 33090 bytes
Control: Package com.nader.freewavelive · Version 1.1.0 · Architecture all
App: FreeWave Live TV · id com.nader.freewavelive · version 1.1.0 · 1280x720
Files: 18 entries
SHA-256: ec53bfd13c3ec25cc6144f1edd910cc4ef01e6aca5f4ded922cb4116f1e684ef
Package verification passed.
```

The verifier parses the `ar` container and both gzip tarballs, checks required app files, rejects development/secret files, and scans packaged text for credential patterns.

## 4. Installation on the TV

```text
ares-device -d "Office TV" -i
modelName : 24LQ520S-PU
sdkVersion : 7.6.0
firmwareVersion : 04.60.92

ares-install -d "Office TV" com.nader.freewavelive_1.1.0_all.ipk
Success

ares-launch -d "Office TV" com.nader.freewavelive
Launched application com.nader.freewavelive
```

The installed app list contains `com.nader.freewavelive`. A real DevTools session (`ares-inspect`) was used to drive and measure the running app.

## 5. Live playback on the TV

Each channel was selected through the app, then measured 9 seconds later through the running page:

| Channel | TV video | `readyState` | Playing | Error |
| --- | --- | --- | --- | --- |
| CGTN English | 1280×720 | 4 | yes | 0 |
| DW English | 480×270 | 4 | yes | 0 |
| DW Arabic | 480×270 | 4 | yes | 0 |
| CBS News 24/7 | 320×180 | 4 | yes | 0 |
| CNA | 480×270 | 4 | yes | 0 |
| Bloomberg Television US | 1280×720 | 4 | yes | 0 |
| Bloomberg Television Europe | 1280×720 | 4 | yes | 0 |
| Red Bull TV | 320×180 | 4 | yes | 0 |
| Arirang TV | 640×360 | 4 | yes | 0 |

`currentTime` advanced on every channel. The player reported `audioTracks: 1`, `muted: false`, `volume: 1`.

### PROGRAM-DATE-TIME result

CGTN's manifest contains **3** `EXT-X-PROGRAM-DATE-TIME` tags. It played on this TV. The tag is therefore not a playback blocker on webOS 22 firmware `04.60.92`, though it remains a documented risk for other models.

### Audio limitation

- `webkitAudioDecodedByteCount` exists but stays `0` on webOS.
- `captureStream()` returned one audio track, but a Web Audio analyser measured RMS `0.00000` over 1.6 s on two different channels.
- Consequently **audible sound is NOT VERIFIED** by instrumentation. Only the presence of an enabled audio track and an unmuted player is verified. A human listening check is still required.

## 6. Guide on the TV

A valid XMLTV document was pasted through the on-TV importer:

```text
Loaded 1 guide channels and 2 schedule entries from pasted XMLTV.
```

Observed on the now-card for CGTN:

- Title: `FreeWave device guide test`
- Time: `10:19 PM – 11:19 PM`
- Remaining: `50 MIN LEFT`
- Up next: `11:19 PM · Next device test program`

The guide dialog listed 9 channels, reported `Guide entries: 2 · 1 channels · times in America/Los_Angeles`, and showed explicit “Guide data unavailable” rows for channels without entries. Back closed the guide.

## 7. Remote, search, favorites, persistence

- ArrowDown moved focus from **CGTN English** to **DW English**.
- ChannelDown switched playback from **CNA** to **CBS News 24/7**.
- Search `DW` reduced the list to 2 channels.
- Favorite toggle persisted 1 favorite.
- After a page reload: current channel **DW Arabic** resumed playing at 480×270, favorites `1`, recent `9`, guide entries `2`, version `v1.1.0`.

## 8. Screenshots

Captured from the TV app through DevTools (`docs/screenshots/`). The hardware video plane is not composited into these captures, so the video area appears blank/white; playback evidence is the measured state above.

| File | Contents |
| --- | --- |
| `01-launch.png` | Launch screen, 9 channels, online status |
| `02-playback.png` | Player while a channel is playing (video plane not captured) |
| `03-tv-guide.png` | Guide with imported XMLTV entries and local times |
| `04-now-card.png` | CGTN now-card with title, time range, 50 min left, next program |
| `05-diagnostics.png` | Settings with playback preferences and diagnostics |
| `06-relaunch.png` | State restored after reload |

## 9. Blockers and open items

| Item | Status | Detail |
| --- | --- | --- |
| Turkish-language channel | **BLOCKED** | TRT hosts fail TLS handshake from this network (`SEC_E_ILLEGAL_MESSAGE`); HTTP returns 403 |
| Al Jazeera English / NHK World | **BLOCKED** | DNS does not resolve from this network |
| France 24 | **BROKEN SOURCE** | Published master points to variants that return 400 |
| NASA TV | **BROKEN SOURCE** | Master renditions return 404 |
| ABC News Live / Euronews | **DEAD ENDPOINT** | HTTP 404 |
| Movies / kids / music channels | **NOT AVAILABLE** | No verified public HLS feeds that permit embedding were found; private FAST endpoints were not scraped |
| Audible audio | **NOT TESTED** | Instrumentation unavailable on webOS; human listening required |
| Real M3U/XMLTV URL import | **NOT TESTED** | CORS varies by host; file/paste paths were tested |
| 15-minute soak | **NOT TESTED** | Channels were sampled for 9 s each |
| SSH key login | **BLOCKED** | webOS offers `ssh-rsa` and requires an encrypted key/password; the webOS CLI and DevTools were used instead |

## 10. Delivery

Repository, CI run, pull request, merge, and release-asset readback are recorded in the final delivery section appended after publication.
