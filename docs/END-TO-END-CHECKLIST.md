# End-to-end TV checklist — 1.3.0

Target: **LG 24LQ520S-PU**, webOS 22, package `com.nader.freewavelive_1.3.0_all.ipk`.

Checked on 2026-10-29/30 through the paired Developer Mode connection and the on-device DevTools session. `[x]` means observed on the TV; `[ ]` means not verified.

## Install and launch

- [x] `ares-device -i` reported `modelName 24LQ520S-PU`, `sdkVersion 7.6.0`.
- [x] `ares-install` returned `Success` for 1.3.0.
- [x] `ares-install -l` lists `com.nader.freewavelive`.
- [x] `ares-launch` reported the app launched.
- [x] Installed app reports `v1.3.0`.
- [x] Final state probe: **13 channel rows, 13 `FREE LIVE` labels**.
- [x] Names exactly match the manifest, in order, 1–13.

## Remote navigation (1.2.0 repair retained)

- [x] Launch focus is a channel card, not `BODY`; computed outline is `solid 3px`.
- [x] Raw ArrowDown 40 moved focus from CGTN English to DW English.
- [x] Raw Enter 13 selected DW English, started the HLS stream, and kept focus on the card.
- [x] Right entered the player controls; OK paused and resumed with `PLAY`/`PAUSE` feedback.
- [x] ChannelDown 428 / ChannelUp 427 changed the channel.
- [x] Back 461 closed Guide and Setup, restored focus, and exited at home.
- [x] Down escaped the Setup URL field; Down did not trap in a text field.
- [x] Blue opened Setup; Info opened Guide.
- [x] Yellow toggled a favorite; pointer click focused and selected a channel.
- [x] Diagnostics overlay showed key, action, handled flag, focus, screen, previous screen, and channel.
- [x] Magic Remote pointer and D-pad used the same focused element.
- [ ] Physical remote presses (human) — **NOT TESTED**; device key injection was used.

## Live playback

- [x] CGTN English — 1280×720, playing.
- [x] DW English — 480×270, playing.
- [x] DW Arabic — 480×270, playing.
- [x] CBS News 24/7 — 320×180, playing.
- [x] CNA — 480×270, playing.
- [x] Bloomberg Television US — 1280×720, playing.
- [x] Bloomberg Television Europe — 1280×720, playing.
- [x] Red Bull TV — 320×180, playing.
- [x] Arirang TV — 640×360, playing.
- [x] Al Jazeera Arabic — 1280×720, `readyState 4`, time advancing.
- [x] FOX Weather — 992×558, `readyState 4`, time advancing.
- [x] CBS Sports HQ — 480×270 at the final check, `readyState 4`, time 50.27, error 0.
- [x] CBS Sports Golazo — 480×270, `readyState 4`, time advancing.
- [x] NASA TV — host manifest passed; **TV media error 4**; removed from the shipped lineup.
- [ ] Audible sound confirmed by a human listener (one audio track present, unmuted, volume 1; not instrumented).
- [ ] 15-minute continuous soak per channel.
- [ ] Channel switching while backgrounded / memory pressure.

## Guide

- [x] Pasted XMLTV produced `Loaded 1 guide channels and 2 schedule entries` on the 1.2.0 build.
- [x] Channels without data showed “Guide data unavailable”.
- [x] Guide state survived reload.
- [x] Guide rows remained focusable after opening and closing with the remote.
- [ ] Guide re-sampled after the 1.3.0 lineup addition (code unchanged; no final on-device guide test).
- [ ] A real public XMLTV URL import over the network (CORS varies by host).

## Favorites and persistence

- [x] Favorite survived reload (1.2.0 build).
- [x] Recent list persisted (1.2.0 build).
- [x] Last channel resumed playback after reload (1.2.0 build).
- [x] Playback preferences persisted, including the optional diagnostics flag.
- [x] Starter-source migration replaced the old 9-channel bundle without deleting imported sources, favorites, recent, or guide state.

## Packaging

- [x] IPK built with `ares-package` 3.2.5.
- [x] `scripts/check-ipk.js` verified id, version 1.3.0, 1280×720, 18 entries, and no secrets.
- [x] SHA-256 `43a7777fa19a835796af904a97d07869c0598490a208e4cb0f597c6f74665706`, 35,846 bytes.
- [x] Installed bytes are the verified IPK.
- [x] 49 automated tests pass; lint passes for 12 JavaScript and 2 JSON files.
- [ ] GitHub Actions runner — **BLOCKED** at account level (see VERIFICATION.md).
- [ ] Pull request merge — blocked until required CI can run.

## Performance sample

- [x] Reload to app ready: 876 ms; DOMContentLoaded 651 ms; load 702 ms.
- [x] CGTN English first frame: 3,351 ms; CBS Sports HQ: 3,553 ms.
- [x] Guide open to 13 rows: 343 ms.
- [x] JS heap after load/stream/end: 1.90/1.08/1.48 MB.
- [x] 45-second soak: 9/9 `readyState 4`, +40.94 s, 0 errors, one video element.
- [x] Renderer CPU during soak: about 3.9% of one core.
- [ ] System RSS, whole-TV CPU, and swap — `ares-shell` rejected for the TV profile.
- [ ] 15-minute soak.
- [ ] 300-channel/virtualized-list performance — only 13 rows exist.
- [ ] Physical-remote input latency.

## Remaining device checks

- [ ] Press every control with the physical remote (procedure in [REMOTE-CONTROL.md](REMOTE-CONTROL.md)).
- [ ] Listen for audio on each channel.
- [ ] Leave one channel running 15+ minutes and watch for stutter, drift, or a crash.
- [ ] Import a real M3U URL and a real XMLTV URL from the TV UI.
- [ ] Re-run after a TV reboot to confirm Developer Mode persistence.
