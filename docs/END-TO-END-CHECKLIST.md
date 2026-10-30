# End-to-end TV checklist — 1.2.0

Target: **LG 24LQ520S-PU**, webOS 22, package `com.nader.freewavelive_1.2.0_all.ipk`.

Checked on 2026-10-29/30 through the paired Developer Mode connection and the on-device DevTools session. `[x]` means observed on the TV; `[ ]` means not verified.

## Install and launch

- [x] `ares-device -i` reported `modelName 24LQ520S-PU`, `sdkVersion 7.6.0`.
- [x] `ares-install` returned `Success` for 1.2.0.
- [x] `ares-install -l` lists `com.nader.freewavelive`.
- [x] `ares-launch` reported the app launched.
- [x] The UI rendered at the 1280×720 app canvas (screenshot captured).
- [x] Channel list, player, now card, and guide fit without clipped controls.
- [x] Installed app reports `v1.2.0`.

## Remote navigation — 1.2.0 fix

- [x] Launch focus is a channel card, not `BODY`; computed outline is `solid 3px`.
- [x] ArrowDown moved focus from CGTN English to DW English using raw `Unidentified` key code 40.
- [x] OK/Enter code 13 selected DW English, started the HLS stream, and kept focus on the card.
- [x] Right from the channel card entered `prevButton`; a second Right reached `playToggle`.
- [x] OK on Play/Pause paused (`paused: true`, label `PLAY`); OK again resumed (`PAUSE`).
- [x] ChannelDown 428 switched CNA → CBS News 24/7; ChannelUp 427 returned to CNA.
- [x] Back 461 closed the TV Guide and restored focus to the current channel card.
- [x] Back 461 closed Setup and restored focus to the opener.
- [x] Down in the Setup playlist URL field moved focus to the pasted M3U textarea.
- [x] Blue 406 opened Setup; Info 457 opened Guide.
- [x] Yellow 405 changed favorites from 1 to 2; repeat removed it.
- [x] Magic Remote pointer click selected and focused DW Arabic.
- [x] Diagnostics overlay showed key `ArrowDown (40)`, action `down`, handled `YES`, screen `settings` (previous `home`), and channel `DW Arabic`.
- [x] No runtime exceptions were raised during the 1.2.0 remote pass.
- [ ] Physical remote presses (human) — **NOT TESTED**; device key injection was used.

## Live playback

- [x] CGTN English — 1280×720, playing, unmuted.
- [x] DW English — 480×270, playing.
- [x] DW Arabic — 480×270, playing.
- [x] CBS News 24/7 — 320×180, playing.
- [x] CNA — 480×270, playing.
- [x] Bloomberg Television US — 1280×720, playing.
- [x] Bloomberg Television Europe — 1280×720, playing.
- [x] Red Bull TV — 320×180, playing.
- [x] Arirang TV — 640×360, playing.
- [x] Time advanced and `readyState` reached 4 on every channel.
- [ ] Audible sound confirmed by a human listener (audio track present, player unmuted, volume 1; not instrumented).
- [ ] 15-minute continuous soak per channel.
- [ ] Channel switching while backgrounded / memory pressure.

## Guide

- [x] Pasted XMLTV produced `Loaded 1 guide channels and 2 schedule entries`.
- [x] Guide dialog listed 9 channels with imported entries and local times.
- [x] Channels without data showed “Guide data unavailable”.
- [x] Description panel updated on focus.
- [ ] A real public XMLTV URL import over the network (CORS varies by host).
- [x] Guide state survived reload.
- [x] Guide rows remained focusable after opening and closing with the remote.

## Favorites and persistence

- [x] Favorite survived reload.
- [x] Recent list held 9 channels.
- [x] Last channel resumed playback after reload.
- [x] Playback preferences persisted, including the optional diagnostics flag.

## Packaging and release

- [x] IPK built with `ares-package` 3.2.5.
- [x] `scripts/check-ipk.js` verified id, version 1.2.0, resolution, 18 entries, and no secrets.
- [x] SHA-256 `1b1421a8039de067c830c36a04f372cedd0a763cbe1644c299d4ee1a2f058e9f` recorded in [VERIFICATION.md](VERIFICATION.md).
- [x] Installed bytes are the verified IPK.
- [x] 48 automated tests pass; lint passes for 12 JavaScript and 2 JSON files.
- [ ] GitHub Actions runner — **BLOCKED** at account level (see VERIFICATION.md).

## Remaining device checks

- [ ] Press every control with the physical remote (procedure in [REMOTE-CONTROL.md](REMOTE-CONTROL.md)).
- [ ] Listen for audio on each channel.
- [ ] Leave one channel running 15+ minutes and watch for stutter, drift, or a crash.
- [ ] Import a real M3U URL and a real XMLTV URL from the TV UI.
- [ ] Re-run after a TV reboot to confirm Developer Mode persistence.
