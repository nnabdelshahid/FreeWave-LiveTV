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
| NASA TV | **SUPERSEDED** | Host manifest later passed, but the TV player raised media error 4; removed from 1.3.0 (see section 17) |
| ABC News Live / Euronews | **DEAD ENDPOINT** | HTTP 404 |
| Movies / kids / music channels | **NOT AVAILABLE** | No verified public HLS feeds that permit embedding were found; private FAST endpoints were not scraped |
| Audible audio | **NOT TESTED** | Instrumentation unavailable on webOS; human listening required |
| Real M3U/XMLTV URL import | **NOT TESTED** | CORS varies by host; file/paste paths were tested |
| 15-minute soak | **NOT TESTED** | Channels were sampled for 9 s each |
| SSH key login | **BLOCKED** | webOS offers `ssh-rsa` and requires an encrypted key/password; the webOS CLI and DevTools were used instead |

## 10. Delivery

### Repository

- URL: https://github.com/nnabdelshahid/FreeWave-LiveTV
- Visibility: public
- Default branch: `main`
- `main` HEAD: `4b5a87c78386b0a7e486b5db212c079c0b25f007` ("Record the 1.1.0 verification evidence")
- Remote refs read back with `git ls-remote`: `refs/heads/main` and `refs/tags/v1.1.0` both at `4b5a87c`.

### Release

- URL: https://github.com/nnabdelshahid/FreeWave-LiveTV/releases/tag/v1.1.0
- Asset: `com.nader.freewavelive_1.1.0_all.ipk`, 33,090 bytes
- GitHub asset digest: `sha256:ec53bfd13c3ec25cc6144f1edd910cc4ef01e6aca5f4ded922cb4116f1e684ef`
- The asset was downloaded again with `gh release download` and independently hashed locally; it matched the installed package byte-for-byte.

### GitHub Actions — BLOCKED

Both the push-triggered CI run (`41009036824`), its rerun, and the manual `workflow_dispatch` run (`41009204864`) failed in 3–5 seconds with:

```text
steps: []
runner_id: 0
runner_name: ""
conclusion: failure
```

No job step executed, so this is not a source or test failure. `githubstatus.com` reported “All Systems Operational” and “Actions: operational”; the repository reports `actions/permissions.enabled = true` and `allowed_actions = all`. The failure is an account/runner-start restriction that cannot be fixed from repository code. The equivalent local pipeline (`lint` → lineup build → package → 37 tests → `check:ipk`) passed, and the release artifact was verified manually.

Pull request #1 (https://github.com/nnabdelshahid/FreeWave-LiveTV/pull/1) was opened and reviewed, then **closed unmerged** because its required CI checks cannot start. The correction was applied directly to `main` as documentation. Resolving the Actions runner restriction and re-running CI is the remaining step.

# 1.2.0 remote-control verification — 2026-10-30

This section records the release-blocking remote-control repair separately from the 1.1.0 playback baseline above.

## 11. Reproduction on the installed 1.1.0 build

Before changing code, the installed app was driven through `ares-inspect` with Chromium `Input.dispatchKeyEvent`:

| Probe | Observed |
| --- | --- |
| Launch focus | `BODY`, `outline: none 0px` |
| First ArrowDown | jumped to `guideButton` in the top bar |
| Settings open | focus `playlistUrl`; ArrowDown left focus on `playlistUrl` (field trap) |
| Back from Settings | dialog closed, focus returned to `BODY` |
| Guide open/close | guide row focused; Back returned to the selected channel row |
| OK on a channel | stream started; native Chromium activation worked |

This isolated four app defects: no deterministic launch focus, focus styling that did not reliably apply to remote/programmatic focus, a text-field D-pad trap, and mixed Back models. It did not prove that the TV fails to deliver key events; the same Chromium input reached the 1.1.0 app.

## 12. Automated checks

```text
npm run lint
Lint passed: 12 JavaScript files and 2 JSON files checked.

npm test
ℹ tests 48
ℹ pass 48
ℹ fail 0
```

The nine new jsdom tests build `app/index.html`, stub TV focus geometry and media, dispatch key events, and assert launch focus, D-pad movement, OK playback, focus survival across channel rebuilds, player-control activation, Back restoration without `pushState`, Setup field escape, Guide navigation, pointer selection, diagnostics, and platform exit.

## 13. Final package

```text
IPK: com.nader.freewavelive_1.2.0_all.ipk
Size: 34772 bytes
Control: Package com.nader.freewavelive · Version 1.2.0 · Architecture all
App: FreeWave Live TV · id com.nader.freewavelive · version 1.2.0 · 1280x720
Files: 18 entries
SHA-256: 1b1421a8039de067c830c36a04f372cedd0a763cbe1644c299d4ee1a2f058e9f
Package verification passed.
```

`ares-install -d "Office TV" com.nader.freewavelive_1.2.0_all.ipk` returned `Success`; the launched app reported `v1.2.0`.

## 14. Remote evidence on the TV

All key events below were dispatched into the running TV app through its real DevTools session. `key: "Unidentified"` plus the raw `windowsVirtualKeyCode` was used for the D-pad/OK/Back/color/channel checks, which is the harder case than Chromium's named keys.

| Check | Observed on the LG 24LQ520S-PU |
| --- | --- |
| Launch focus | `BUTTON.channel-row.focusable.selected`, `outline: solid 3px` |
| Raw ArrowDown 40 | focus moved CGTN English → DW English |
| Raw Enter 13 | DW English selected; `currentChannelName` updated; `readyState 4`; video 480×270; playing |
| Blue 406 | Setup opened; focus `playlistUrl`; 3 px ring |
| Down 40 in Setup | focus left `playlistUrl` and landed on `playlistText` |
| Back 461 in Setup | Setup closed; focus returned to the selected channel row |
| Info 457 | Guide opened; focus `guide-row`; 3 px ring |
| Back 461 in Guide | Guide closed; focus returned to the selected channel row |
| Yellow 405 | favorite count changed 1 → 2; repeated press removed it |
| Right 39 | focus entered `prevButton`, then `playToggle` |
| Enter 13 on `playToggle` | paused: `paused: true`; label changed `PAUSE` → `PLAY` |
| Enter 13 again | resumed: `paused: false`; label `PLAY` → `PAUSE` |
| ChannelDown 428 / ChannelUp 427 | CNA → CBS News 24/7 → CNA |
| Magic Remote pointer click | DW Arabic focused and started; 480×270, playing |
| Diagnostics overlay | key `ArrowDown (40)`, action `down`, handled `YES`, screen `settings`, previous `home`, channel `DW Arabic` |
| Runtime exceptions | 0 |

Final pass report: `.work/device-remote-report.json`; player pass: `.work/device-player-report.json`. Both are excluded from Git by `.gitignore`; the evidence is summarized here.

### Physical remote — NOT TESTED

The agent cannot actuate the physical LG remote. The device-level input path is verified, but human button presses remain **NOT TESTED**. The acceptance checklist in [REMOTE-CONTROL.md](REMOTE-CONTROL.md) is the exact manual test to run.

## 15. Screenshots

Captured from the running TV app through DevTools. The hardware video plane is not composited, so white areas are the video surface, not a UI failure.

| File | Contents |
| --- | --- |
| `07-remote-launch.png` | Launch focus ring on CGTN English, 3 px outline |
| `08-remote-settings.png` | Setup with field focus after Down |
| `09-remote-guide.png` | Guide row focus, imported XMLTV and unavailable rows |
| `10-remote-diagnostics.png` | Diagnostics overlay with key, action, handled, focus, screen, channel |
| `11-remote-player-pause.png` | Paused stream and focused Play control (`PLAY` label) |

## 16. 1.2.0 delivery readback

| Item | Value |
| --- | --- |
| Branch | `fix/remote-control-1.2.0` |
| Commit | `c0ed17c` — Fix remote navigation and focus across FreeWave |
| Pull request | https://github.com/nnabdelshahid/FreeWave-LiveTV/pull/2 |
| Release | https://github.com/nnabdelshahid/FreeWave-LiveTV/releases/tag/v1.2.0 |
| Asset | `com.nader.freewavelive_1.2.0_all.ipk`, 34,772 bytes |
| GitHub asset digest | `sha256:1b1421a8039de067c830c36a04f372cedd0a763cbe1644c299d4ee1a2f058e9f` |
| Re-download hash | `1b1421a8039de067c830c36a04f372cedd0a763cbe1644c299d4ee1a2f058e9f` |
| Merge status | **BLOCKED** — required CI cannot start; PR remains open |

GitHub Actions run `41011623571` (pull request) and `41011617299` (branch push) both completed as `failure` in 3–4 seconds. The job record shows `runner_id: 0`, `runner_name: ""`, and `steps: []`; no checkout, install, or test step ran. This is the same account-level runner-start restriction observed on 1.1.0, not a source failure. The equivalent local pipeline passed after the final code change.

The release asset was downloaded again with `gh release download` into `.work/release-readback/` and independently hashed; it matches the installed package byte-for-byte. Physical remote presses remain **NOT TESTED**; the procedure is in [REMOTE-CONTROL.md](REMOTE-CONTROL.md).

# 1.3.0 legal-lineup verification — 2026-10-30

This section covers the legal-parity audit and the final 13-channel lineup. The 1.2.0 remote-control fix is retained without code changes to the focus engine.

## 17. Lineup changes and device results

Four verified feeds were added, and one rejected feed was removed:

| Channel | Host validation | On-TV result | Decision |
| --- | --- | --- | --- |
| Al Jazeera Arabic | H.264/AAC, HTTPS, no encryption | `readyState 4`, 1280×720, time advancing | **Shipped** |
| FOX Weather | H.264/AAC, HTTPS, no encryption | `readyState 4`, 992×558, time advancing | **Shipped** |
| CBS Sports HQ | H.264/AAC, HTTPS, no encryption | `readyState 4`, 480×270 at final check, time advancing | **Shipped** |
| CBS Sports Golazo | H.264/AAC, HTTPS, no encryption | `readyState 4`, 480×270, time advancing | **Shipped** |
| NASA TV | Host manifest passed | **Media error 4** on the TV | **Removed** |

NASA TV was not left visible as a broken channel. Its host is now in the rejected-source test. The shipped manifest has **13** verified entries, contiguous channel numbers 1–13, and no duplicate URLs or IDs.

A migration bug was found during the 1.2.0 → 1.3.0 install: the saved starter source kept the old 9-channel bundle. `syncStarterSource()` now replaces only the `starter-public` source with the bundled lineup while preserving imported playlists, favorites, recent channels, guide data, and preferences. The remote-navigation suite asserts that behavior.

## 18. Final automated checks

```text
npm run lint
Lint passed: 12 JavaScript files and 2 JSON files checked.

npm test
ℹ tests 49
ℹ pass 49
ℹ fail 0
```

The suite now covers the 13-channel rights manifest, rejected NASA host, access labels, starter migration, remote navigation, guide parsing, retries, packaging, and secret scanning.

## 19. Final package

```text
IPK: com.nader.freewavelive_1.3.0_all.ipk
Size: 35846 bytes
Control: Package com.nader.freewavelive · Version 1.3.0 · Architecture all
App: FreeWave Live TV · id com.nader.freewavelive · version 1.3.0 · 1280x720
Files: 18 entries
SHA-256: 43a7777fa19a835796af904a97d07869c0598490a208e4cb0f597c6f74665706
Package verification passed.
```

```text
ares-install -d "Office TV" com.nader.freewavelive_1.3.0_all.ipk
Success

ares-launch -d "Office TV" com.nader.freewavelive
Launched application com.nader.freewavelive
```

## 20. Final on-TV render

Captured from the running TV app after a hard reload through the DevTools session:

```json
{
  "version": "v1.3.0",
  "rows": 13,
  "access": 13,
  "names": [
    "CGTN English", "DW English", "DW Arabic", "CBS News 24/7", "CNA",
    "Bloomberg Television US", "Bloomberg Television Europe", "Red Bull TV",
    "Arirang TV", "Al Jazeera Arabic", "FOX Weather", "CBS Sports HQ",
    "CBS Sports Golazo"
  ]
}
```

A final CBS Sports HQ selection produced:

```json
{"channel":"CBS Sports HQ","readyState":4,"paused":false,"time":50.27,"width":480,"height":270,"error":0,"message":""}
```

All 13 channels reached `readyState 4` with advancing playback time during the device pass. Video decoding is **VERIFIED**; audible output remains **NOT TESTED**.

## 21. Network-parity result

The audit is in [NETWORK-PARITY.md](NETWORK-PARITY.md). It classifies every named YouTube TV network and separates exact free access, OTA, free alternatives, and subscription-only feeds.

- Exact free feeds of subscription-only premium networks: **0**.
- Free alternatives shipped and playable: **13 channels**, none branded as a premium network.
- OTA ABC/CBS/NBC/FOX/PBS: available only through the TV tuner; **not integrated**, because webOS exposes no supported tuner API.
- Subscription-authenticated streams: **0** integrated; no provider login, DRM, or trial was added.
- Movies/kids/music/general entertainment: **0 verified** public feeds.

The 300-channel target is **BLOCKED** by distribution rights and provider endpoint policy, not by the parser or player.

## 22. Screenshot

`docs/screenshots/12-lineup-1.3.0.png` was captured from the running app after the final state probe and cropped to the 1280×720 app canvas. It shows the 13-channel count, the `FREE LIVE` labels, and CBS Sports HQ selected. The hardware video plane is not composited into DevTools captures, so the video region may appear blank/white; playback evidence is the measured state above.

## 23. GitHub delivery readback

| Item | Value |
| --- | --- |
| Repository | https://github.com/nnabdelshahid/FreeWave-LiveTV |
| Branch | `feat/legal-lineup-1.3.0` |
| Release commit | `fdcde6daf3f1409fec7043578d5efdf118f257f6` |
| Tag | `v1.3.0` annotated tag `1dc9e90b0d1bee9ddc175dabd61af2a43a94c431`, dereferences to `fdcde6d` |
| Pull request | https://github.com/nnabdelshahid/FreeWave-LiveTV/pull/3 |
| PR state | `OPEN`, `MERGEABLE`, `UNSTABLE` |
| Release | https://github.com/nnabdelshahid/FreeWave-LiveTV/releases/tag/v1.3.0 |
| Asset | `com.nader.freewavelive_1.3.0_all.ipk`, 35,846 bytes |
| GitHub asset digest | `sha256:43a7777fa19a835796af904a97d07869c0598490a208e4cb0f597c6f74665706` |
| Re-download hash | `43a7777fa19a835796af904a97d07869c0598490a208e4cb0f597c6f74665706` — matched the installed package |
| Branch CI | Run `41013861357` failed with `runner_id: 0`, `runner_name: ""`, `steps: []` |
| PR CI | Run `41013905317` failed the same way; no checkout or test step executed |
| Release workflow | Run `41013864313` also failed at runner start with zero steps |
| Merge | **BLOCKED** — required checks cannot start; not merged |

The release tag remains on `fdcde6d`. A later docs-only commit records this readback on the branch; it does not change the released IPK. The asset was downloaded with `gh release download v1.3.0` and independently hashed against the installed file.

## 24. Final status summary

| Area | Status |
| --- | --- |
| 13-channel lineup, 1.3.0 package, install, TV render | **VERIFIED** |
| Remote-control repair retained and device-input tested | **VERIFIED** |
| GitHub release and asset readback | **VERIFIED** |
| GitHub Actions and PR merge | **BLOCKED** (account-level runner start) |
| Exact free premium networks / 300-channel target | **BLOCKED** (rights and provider policy) |
| Audible sound, physical remote, 15-minute soak, real URL imports | **NOT TESTED** |

## 25. Performance sample — 1.3.0

The installed build was measured through DevTools with one stream active. Full method and limits are in [PERFORMANCE.md](PERFORMANCE.md).

| Measurement | Result |
| --- | --- |
| Reload to app ready | **876 ms** |
| DOMContentLoaded / load | **651 / 702 ms** |
| CGTN / CBS Sports HQ first frame | **3,351 / 3,553 ms** |
| Guide open, 13 rows | **343 ms** |
| JS heap after load / after stream / end | **1.90 / 1.08 / 1.48 MB** |
| Renderer CPU during 45 s soak | **~3.9% of one core** |
| 45 s soak | **9/9 samples `readyState 4`**, +40.94 s, 0 errors, one `<video>` |
| System RSS / whole-TV CPU / swap | **NOT TESTED** — `ares-shell` rejected for the TV profile |
| 15-minute soak | **NOT TESTED** |
| 300-channel list performance | **NOT TESTED** — only 13 rows exist; virtualization not added |
| Physical remote input latency | **NOT TESTED** — CDP dispatch only |

## 26. Final 1.3.0 remote-device pass

Raw `Unidentified` key names with webOS-style codes were dispatched into the installed app through its live DevTools session. This exercises the app's key decoder and focus engine, not the hardware remote.

| Step | Observed |
| --- | --- |
| Launch | 13 rows; focus on CBS Sports HQ with the 3 px selected ring |
| ArrowDown 40 | focus moved to CBS Sports Golazo |
| OK 13 | Golazo selected; after 3 s `readyState 4`, playing |
| Right 39 × 2 | focus moved to `prevButton`, then `playToggle` |
| OK 13 pause | `paused: true`; label `PLAY` |
| OK 13 resume | `paused: false`; label `PAUSE` |
| Info 457 | Guide opened; 13 rows; focus on a guide row |
| Back 461 | Guide closed; focus returned to the selected channel row |
| Blue 406 | Setup opened; focus on `playlistUrl` |
| Down 40 | focus left the URL field for `playlistText` |
| Back 461 | Setup closed; focus restored to the channel row |
| Green 404 / Red 403 | Favorites showed 1 row; All returned to 13 rows |
| Yellow 405 | favorite count changed 1 → 2 |
| ChannelDown 428 | channel changed to CBS Sports HQ |
| Runtime exceptions | **0** |

Physical button presses remain **NOT TESTED**. The acceptance procedure in [REMOTE-CONTROL.md](REMOTE-CONTROL.md) is still the required final check.
