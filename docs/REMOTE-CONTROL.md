# Remote control and focus architecture

FreeWave 1.2.0 repairs the remote-control path from the TV key event to the visible focus ring. The application id, layout, streams, M3U/XMLTV import, favorites, and persistence are unchanged.

## Status

| Check | Status |
| --- | --- |
| Launch focus on a channel card | **VERIFIED** on the LG 24LQ520S-PU |
| Visible focus ring, including programmatic focus | **VERIFIED** on the TV; 3 px computed outline |
| Raw webOS-style D-pad codes (37–40) | **VERIFIED** on the TV with `Unidentified` key names |
| OK/Enter (13) activation | **VERIFIED** on the TV |
| Back (461) closes Guide/Settings and restores focus | **VERIFIED** on the TV |
| Settings field escape | **VERIFIED** on the TV (`playlistUrl` → `playlistText`) |
| Player controls and Play/Pause | **VERIFIED** on the TV (`Right` → `prevButton` → `playToggle`) |
| Channel Up/Down (427/428) | **VERIFIED** on the TV |
| Favorites (405) and pointer selection | **VERIFIED** on the TV |
| Diagnostics overlay | **VERIFIED** on the TV |
| Physical remote actuation | **NOT TESTED** — the agent cannot press the physical remote |

Device-level key injection is stronger than a desktop browser test, but it is **not** the same as a human pressing the physical remote.

## Root causes found

1. **No launch focus.** `document.activeElement` was `BODY` after launch. The first D-pad press picked the first focusable element in DOM order, the top-bar Guide button, instead of the channel list.
2. **Focus was styled only with `:focus-visible`.** Programmatic and remote-driven focus did not reliably match it in the TV Chromium build, so the user could not see where focus was.
3. **OK depended on native button activation.** The key handler returned for `select`, which works on a desktop button but is not a dependable activation path for the TV remote.
4. **Text fields swallowed the D-pad.** `moveFocus` returned immediately for any `INPUT`, `TEXTAREA`, or `SELECT`, so focus could not leave the Setup URL field.
5. **Back used two incompatible models.** The app pushed browser history in Setup, listened for `popstate`, handled code 461, and armed a two-press exit. With `disableBackHistoryAPI: false`, the platform could consume Back before the app saw it.
6. **Guide/list rebuilds lost focus.** Rows were recreated without restoring the focused row, and returning from a dialog left focus on `BODY`.
7. **No way to see what the TV delivered.** There was no key/focus diagnostic, so a physical event problem could not be distinguished from an app handling problem.

## Architecture

```text
LG remote / Magic Remote
        │
        ▼
webOS 22 key event
  key: ArrowUp/OK/GoBack/Unidentified/...
  keyCode: 37/38/39/40/13/461/405/406/427/428/...
        │
        ▼
window keydown (capture) ──▶ core.remoteAction(key, keyCode, editable)
        │                              │
        │                              └─ normalizes names + raw codes
        ▼
handleRemoteKey
  ├─ Back 461 ──▶ Guide open? close Guide
  │               Settings open? close Settings
  │               home? webOS.platformBack()
  ├─ text field
  │    ├─ Up/Down ──▶ leave the field through the focus engine
  │    ├─ Left/Right ──▶ native caret movement
  │    └─ OK on checkbox/select ──▶ explicit toggle/open
  ├─ D-pad ──▶ focused scope (dialog or home) ──▶ geometric focus engine
  ├─ OK 13 ──▶ activateFocused() ──▶ element.click()
  └─ media/color/channel ──▶ player, favorites, guide, settings
        │
        ▼
focusElement()
  ├─ focus({preventScroll:true})
  ├─ scrollIntoView({block:'nearest'})
  └─ updateDiagOverlay()
        │
        ▼
visible 3 px focus ring + optional local diagnostics
```

## Focus scope and navigation

- **Home scope:** top bar, sidebar/categories, search, channel cards, player controls, now-card. Only visible, enabled, non-`[inert]`, non-`[hidden]` controls are candidates.
- **Dialog scope:** while Guide or Setup is open, candidates come only from that dialog. D-pad cannot wander into the dimmed page behind it.
- **No trap:** Up/Down leaves a Setup text field; Left/Right remains native for caret movement. Back always leaves the dialog.
- **Spatial choice:** candidates are scored by movement in the requested direction plus perpendicular distance. A deterministic DOM-order fallback prevents dead ends at the edge of the layout.
- **Restoration:** Setup remembers its opener and restores it on close. Guide returns to the current channel card. A channel-list rebuild restores the focused channel by `data-channel-key`.
- **Pointer:** a `pointerdown` on a control focuses it before the click, so Magic Remote selection and D-pad selection share the same focus model without fighting.

## Key map

| Input | Key code | Action |
| --- | --- | --- |
| Left / Up / Right / Down | 37 / 38 / 39 / 40 | Spatial focus movement |
| OK / Enter | 13 | Activate the focused control explicitly |
| Back / GoBack / Escape | 461 | Close Guide → close Setup → `webOS.platformBack()` |
| Red / Green | 403 / 404 | All channels / Favorites |
| Yellow / `Y` | 405 | Toggle favorite for focused or current channel |
| Blue | 406 | Open Setup |
| Channel Up / Down | 427 / 428 | Next / previous visible channel |
| Play / Pause / Stop | 415 / 19 / 413 | Play / pause / stop |
| Rewind / Fast-forward | 412 / 417 | Seek −10 s / +10 s when the live buffer permits |
| Info / Guide | 457 / 458 / 459 | Open TV Guide |
| Digits | 48–57 | Channel-number tuning after 900 ms |

The decoder accepts both Chromium names (`ArrowDown`, `Enter`, `Escape`) and webOS-style names (`GoBack`, `Back`, `XF86Back`, `OK`, `Select`, `Up`, `Down`). Raw codes are the final fallback, so an event with `key: "Unidentified"` and `keyCode: 40` still navigates.

## Back-button model

Only one model is used:

- `app/appinfo.json` sets **`disableBackHistoryAPI: true`**.
- The app never calls `history.pushState` or depends on `popstate`.
- Key code **461** is handled directly.
- At home, Back calls `webOS.platformBack()`, which exits the app predictably.

This removes the previous race between platform history, browser history, and the two-press exit arm.

## Diagnostics

Setup → **Diagnostics** → **Show remote diagnostics overlay** enables a local-only overlay. It shows:

- received key name and raw code;
- normalized action;
- whether the app handled it;
- focused element;
- current and previous screen;
- current channel.

It is off by default and does not send or store anything outside the TV. The same key/focus state is printed to the DevTools console only while diagnostics are enabled.

## Verification evidence

Automated: `tests/remote-navigation.test.js` builds the real HTML in jsdom, stubs TV media/focus geometry, dispatches key events, and asserts:

- launch focus is a channel row;
- D-pad moves between cards;
- OK starts the focused stream and focus survives the list rebuild;
- the now-card leads into the player controls and OK pauses/resumes with state feedback;
- Back closes Setup, restores the opener, and makes zero `pushState` calls;
- Down escapes the Setup URL field;
- Guide navigation and Back restoration;
- pointer focus/selection;
- diagnostics key/focus/handling/screen values;
- home Back calls the webOS platform API.

Full pass: **48/48 tests**, lint clean.

On the TV, `ares-inspect` + Chromium `Input.dispatchKeyEvent` produced the results in [VERIFICATION.md](VERIFICATION.md). The installed package is `com.nader.freewavelive_1.2.0_all.ipk`, SHA-256 `1b1421a8039de067c830c36a04f372cedd0a763cbe1644c299d4ee1a2f058e9f`.

## Manual physical-remote acceptance

1. Launch FreeWave. The first channel card must already have a bright ring; no arrow press is needed to reveal focus.
2. Press **Down** repeatedly. The ring must move through channel cards and scroll the focused card into view.
3. Press **OK** on a channel. It must start playing and keep the focus ring on that card.
4. Press **Right**. Focus must enter the player controls. Press **Right** again to reach Play/Pause, then **OK** to pause; press **OK** again to resume. The button label must change `PAUSE` ↔ `PLAY`.
5. Use **Channel Up/Down**. The channel must change without leaving the player controls.
6. Press **Guide**, move through rows, then **Back**. The guide must close and focus must return to the current channel card.
7. Press **Setup**, press **Down** from the playlist URL field. Focus must leave the field and enter the pasted M3U area; the field must not trap navigation.
8. Press **Back** from Setup. It must close and restore the opener. Press **Back** at home once; the app must exit through webOS.
9. Press **Yellow** on a channel. The favorite count and star must update; repeat to remove it.
10. Point the Magic Remote at a channel and click. The card must focus and play; D-pad must continue from that card.

If any step fails on the physical remote, enable the diagnostics overlay and record the displayed key name/code, focus, screen, and handled flag before changing code.
