# Troubleshooting

## Install

**`ares-install` says “connection refused” or times out**
- Developer Mode may have expired. Open the Developer Mode app on the TV and restart/extend the session.
- Confirm the TV IP has not changed. Update the device entry:
  `ares-setup-device -m "Office TV" -i "host=192.168.x.x" -i "port=9922" -i "username=prisoner"`.
- Both devices must be on the same network; guest Wi-Fi or AP isolation blocks port 9922.

**SSH from a modern OpenSSH client fails with “no matching host key type”**
webOS 22 offers only `ssh-rsa`. The CLI handles this itself; a manual SSH needs:
`-o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa`.

**Install succeeds but the app is not in the launcher**
Refresh the app list (`ares-install -l`). If missing, reinstall and check the IPK with `node scripts/check-ipk.js`.

## Playback

**Black screen, “Connecting…” never clears**
- Select another channel to confirm the network and player work.
- In **Setup → Diagnostics**, run **Check current stream**. If it reports CORS, that is expected for some hosts and does not block `<video>` playback.
- Broadcaster feeds change. Re-check `npm run verify:streams`; remove or replace dead entries.

**“The TV could not decode this stream” (media error 3)**
The feed is not H.264/AAC or uses an unsupported HLS feature. Do not add a proxy or transcode server; choose another authorized feed.

**Plays briefly then stops**
Use **Reconnect**. If a playlist supplies `backup-url`, the app tries it first. Increase **Setup → Playback → Automatic reconnect attempts** for transient network drops.

**No sound**
- Press **SOUND** in the player controls; the label should read `SOUND`, not `MUTED`.
- Check the TV's own volume and any external audio device.
- The app cannot verify speaker output programmatically; see the audio note in [STREAM-COMPATIBILITY.md](STREAM-COMPATIBILITY.md).

## Playlists

**“Could not load this URL … CORS”**
The host does not allow browser-origin fetches from the TV. Download the M3U, use **Choose file**, or paste its text. Playback of an already-added channel is unaffected.

**“No playable HTTP/HTTPS channels found”**
The list must contain `#EXTINF` entries followed by `http(s)` URLs. Credentials in URLs (`user:pass@`) and non-HTTP schemes are rejected.

**Imported channels duplicate**
Duplicates use `tvg-id|url`; identical entries are collapsed. Different URLs for the same channel are intentionally kept.

## Guide

**“Guide loaded, but no entries matched your channel IDs”**
XMLTV `<channel id="…">` and `<programme channel="…">` must match the playlist's `tvg-id`. Check both sources; ids are case-sensitive.

**Times are wrong**
XMLTV values are converted from their declared offset to the TV's local timezone. The guide header names the active zone (for example `America/Los_Angeles`). A guide without offsets is treated as UTC; prefer sources that include `+0000`/`-0500`.

**Guide disappears after a while**
Guide refresh only runs when a guide **URL** is saved and the TV is online. Pasted/file guides have no URL to refresh.

## Remote and focus

**Focus is hard to see**
Focus uses a mint outline and glow. Move with arrows; OK activates. If focus seems stuck in a dialog, press Back once.

**Back exits the app**
At the root screen Back arms exit and a second press exits (via `webOS.platformBack`). Inside the guide or settings, Back closes the dialog first.

**Typing in search moves focus**
Arrow and letter handling is suppressed inside inputs so the on-screen keyboard works. Press Back to leave the field.

## Diagnostics and logs

`ares-inspect -d "Office TV" com.nader.freewavelive` prints a DevTools URL. Console lines beginning `[freewave] stats` contain playback evidence. URLs are redacted; query strings and credentials never appear.

## Reset

Uninstall/reinstall clears app storage. There is no cloud copy. Export any custom playlist first.
