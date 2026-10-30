# End-to-end TV checklist

Target: **LG 24LQ520S-PU**, webOS 22, package `com.nader.freewavelive_1.1.0_all.ipk`.

Checked on 2026-10-29 through the paired Developer Mode connection and the on-device DevTools session. `[x]` means observed on the TV; `[ ]` means not yet verified.

## Install and launch

- [x] `ares-device -i` reported `modelName 24LQ520S-PU`, `sdkVersion 7.6.0`.
- [x] `ares-install` returned `Success`.
- [x] `ares-install -l` lists `com.nader.freewavelive`.
- [x] `ares-launch` reported the app launched.
- [x] The UI rendered at the 1280×720 app canvas (screenshot captured).
- [x] Channel list, player, now card, and guide fit without clipped controls.

## Remote navigation

- [x] ArrowDown moved focus from CGTN English to DW English.
- [x] ChannelDown switched the playing channel from CNA to CBS News 24/7.
- [x] Back closed the TV guide.
- [x] OK/click selected channels (all 9 were tuned).
- [x] Yellow/★ toggled a favorite (persisted).
- [x] Search input filtered the list to the two DW channels.
- [ ] Every control verified individually with a physical remote (physical key presses were simulated through the app's key handler).

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
- [x] Guide dialog listed 9 channels with the imported CGTN entries and local times (`10:15 PM`, `11:15 PM` in `America/Los_Angeles`).
- [x] Channels without data showed “Guide data unavailable”.
- [x] Description panel updated on focus.
- [ ] A real public XMLTV URL import over the network (CORS varies by host).
- [x] Guide state survived reload.

## Favorites and persistence

- [x] Favorite survived reload.
- [x] Recent list held 9 channels.
- [x] Last channel resumed playback after reload (DW English, 480×270).
- [x] Playback preferences persisted.

## Packaging

- [x] IPK built with `ares-package` 3.2.5.
- [x] `scripts/check-ipk.js` verified id, version, resolution, 18 entries, and no secrets.
- [x] SHA-256 recorded in [VERIFICATION.md](VERIFICATION.md).
- [x] Installed bytes are the verified IPK.

## Remaining device checks

- [ ] Listen for audio on each channel.
- [ ] Leave one channel running 15+ minutes and watch for stutter, drift, or a crash.
- [ ] Import a real M3U URL and a real XMLTV URL from the TV UI.
- [ ] Re-run after a TV reboot to confirm Developer Mode persistence.
