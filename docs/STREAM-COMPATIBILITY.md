# Stream compatibility

Checked from a US network and on an **LG 24LQ520S-PU** (webOS 22, sdk 7.6.0, firmware 04.60.92) on 2026-10-29.

## What the TV supports

webOS 22 plays HLS through the native `<video>` pipeline with H.264 video and AAC audio. FreeWave uses that pipeline directly; it does not ship hls.js, MSE shims, transcoders, or a proxy. An unsupported manifest or codec surfaces as a playback error instead of being hidden.

## EXT-X-PROGRAM-DATE-TIME: the original concern

LG's streaming documentation lists `EXT-X-PROGRAM-DATE-TIME` among tags its native player does not support. The previous build flagged this as a possible cause of failure for CGTN and DW.

Measured facts:

| Channel | PDT tags in manifest | Result on the 24LQ520S-PU |
| --- | --- | --- |
| CGTN English | 3 | **Played**: 1280×720, `readyState 4`, time advancing, unmuted |
| DW English | 0 in master | **Played**: 480×270 |
| DW Arabic | 0 | **Played**: 480×270 |
| CBS News 24/7 | 0 | **Played**: 320×180 |
| CNA | 0 | **Played**: 480×270 |
| Bloomberg US/EU | 0 | **Played**: 1280×720 |
| Red Bull TV | 0 | **Played**: 320×180 |
| Arirang TV | 0 | **Played**: 640×360 |

**Conclusion:** on this firmware, the tag alone does **not** break playback. It remains a documented compatibility risk for other models/firmware, and the app cannot remove tags from a broadcaster's manifest without a proxy (which would violate the zero-backend constraint). The tag is reported in diagnostics rather than treated as a fatal error.

## Other checks

| Check | Result |
| --- | --- |
| H.264 video | Host `ffprobe` confirms H.264 on all 9; TV decoded video on all 9 |
| AAC audio | Host `ffprobe` confirms AAC on all 9; TV exposes 1 audio track per stream |
| HLS master/media | 7 masters + 2 media playlists; all parsed by the app |
| Segment retrieval | All 9 advanced `currentTime` on the TV for at least 6–9 s |
| TLS | All shipped URLs are HTTPS; certificates validated by the host and TV |
| Redirects/content types | Followed by `verify-streams`; manifests served as HLS MIME types |
| Encryption/DRM | No `EXT-X-KEY` other than `METHOD=NONE`; encrypted manifests are rejected by tests |
| CORS | Not required for `<video>` playback. Playlist/guide **URL imports** do require permissive CORS; file/paste paths are the fallback |
| A/V sync | Not instrumented; no drift observed during the 6–9 s per-channel checks |
| Buffering/recovery | `waiting` shows a message; error path retries backup/primary per preferences |
| Discontinuities | No `EXT-X-DISCONTINUITY` in shipped manifests on the check date |
| Live edge | All feeds are live; no DVR seek UI is offered |
| Startup latency | Most channels produced video within the 9 s sampling window; no precise startup metric is claimed |
| Memory | Not instrumented; the app loads one stream at a time and pauses on background |

## Audible audio

The TV reported `audioTracks: 1`, `muted: false`, `volume: 1` for playing channels. webOS leaves `webkitAudioDecodedByteCount` at 0, and routing the hardware HLS pipeline through Web Audio returned an all-zero analyser buffer. **Audible output is therefore NOT TESTED**; only the presence of an enabled audio track and unmuted player state is verified.

## Repeating the check

```bash
npm run verify:streams   # host side: HTTP, HLS, ffprobe, PDT detection
ares-inspect -d "Office TV" com.nader.freewavelive   # on-device console/stats
```

Do not treat a reachable manifest or a successful `ffprobe` as proof that a particular TV rendered the stream.
