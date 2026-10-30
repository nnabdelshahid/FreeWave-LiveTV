# Channel lineup, rights, and validation

Validated from a US network on **2026-10-29** and played on the **LG 24LQ520S-PU**. Only channels whose manifests were fetched, whose codecs were probed, and which reached `readyState 4` on the TV are shipped.

## Verified channels

| # | Channel | Category | Language | Official source | Stream endpoint | Rights / authorization evidence | US availability | Codecs (host probe) | HLS notes | TV playback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | CGTN English | News | English | https://www.cgtn.com/tv | `https://english-livetx.cgtn.com/hls/yypdyyctzb_hd.m3u8` | CGTN publishes this HLS feed on its own free live TV page; no login, no DRM | Reachable 2026-10-29 | H.264 Constrained Baseline 1280×720; AAC LC 2ch | 3 × `EXT-X-PROGRAM-DATE-TIME` | **Verified** 1280×720 |
| 2 | DW English | News | English | https://www.dw.com/en/live-tv/channel-english | `https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/master.m3u8` | DW links this feed from its official English live-TV page | Reachable 2026-10-29 | H.264 Main 640×360; AAC LC 2ch | No PDT tag in master | **Verified** 480×270 |
| 3 | DW Arabic | News | Arabic | https://www.dw.com/ar/live-tv/channel-arabic | `https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/master.m3u8` | DW links this feed from its official Arabic live-TV page | Reachable 2026-10-29 | H.264 480×270; AAC 2ch | WebVTT subtitles + A/V renditions | **Verified** 480×270 |
| 4 | CBS News 24/7 | News | English | https://www.cbsnews.com/live/ | `https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8` | CBS News publishes this feed for its free 24/7 stream | Reachable 2026-10-29 | H.264 Main up to 1280×720; AAC LC 2ch | SCTE-35 + timed ID3 | **Verified** 320×180 |
| 5 | CNA | News | English | https://www.channelnewsasia.com/watch | `https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index.m3u8` | CNA publishes this feed for its free live watch page | Reachable 2026-10-29 | H.264 Main up to 1920×1080; AAC | 5 renditions | **Verified** 480×270 |
| 6 | Bloomberg Television US | Business | English | https://www.bloomberg.com/live/us | `https://www.bloomberg.com/media-manifest/streams/us.m3u8` | Bloomberg publishes this manifest for its free live player | Reachable 2026-10-29 | H.264 High 1280×720; AAC LC 2ch | 4 renditions | **Verified** 1280×720 |
| 7 | Bloomberg Television Europe | Business | English | https://www.bloomberg.com/live/eu | `https://www.bloomberg.com/media-manifest/streams/eu.m3u8` | Bloomberg publishes this manifest for its free live player | Reachable 2026-10-29 | H.264 High 1280×720; AAC LC 2ch | 4 renditions, DVB teletext | **Verified** 1280×720 |
| 8 | Red Bull TV | Sports | English | https://www.redbull.com/tv | `https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8` | Red Bull publishes this feed for its free linear channel | Reachable 2026-10-29 | H.264 Main up to 1920×1080; AAC | 6 renditions | **Verified** 320×180 |
| 9 | Arirang TV | International | English | https://www.arirang.com/live | `https://amdlive-ch01-ctnd-com.akamaized.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8` | Arirang publishes this feed for its official free live stream | Reachable 2026-10-29 | H.264 High up to 1920×1080; AAC LC 2ch | 4 renditions, timed ID3 | **Verified** 640×360 |

TV dimensions are the rendition the TV chose at the moment of the check; all reported `readyState 4` with advancing playback time.

## Rejected or blocked sources

These were investigated and **deliberately excluded**. They are not in `data/channels.json`, are not visible in the app, and a test fails if their hosts reappear.

| Source | URL tested | Result | Classification |
| --- | --- | --- | --- |
| Al Jazeera English | `https://live-hls-web-aje.getaj.net/AJE/index.m3u8` | Manifest reachable once, then DNS `ENOTFOUND` from this network | BLOCKED (DNS) |
| Al Jazeera Documentary | `https://live-hls-web-ajd.getaj.net/AJD/index.m3u8` | HTTP 403 via edge cache | BLOCKED |
| NHK World Japan | `https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8` | DNS `ENOTFOUND` | BLOCKED (DNS) |
| TRT World | `https://tv-trtworld.live.trt.com.tr/master.m3u8` | TLS handshake failure (`SEC_E_ILLEGAL_MESSAGE`); HTTP returns 403 | BLOCKED (TLS/geo) |
| TRT Belgesel / Müzik / Çocuk / Arabi / 1 | `https://tv-trt*.live.trt.com.tr/master.m3u8` | Same TLS failure | BLOCKED — no Turkish channel could be verified |
| France 24 English/French/Spanish/Arabic | `https://static.france24.com/live/F24_*_LO_HLS/live_web.m3u8` | Master returns HTTP variants that answer 400 | BROKEN SOURCE |
| NASA TV | `https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8` | Master lists renditions that return 404 | BROKEN SOURCE |
| ABC News Live | `https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8` | HTTP 404 | DEAD ENDPOINT |
| Euronews English | `https://euronews.alteox.app/hls/en_stream.m3u8` | HTTP 404 | DEAD ENDPOINT |
| PBS Kids | https://pbskids.org/ | No public HLS manifest on the page | NOT AVAILABLE |
| LiveNOW from FOX | Akamai endpoint | HTTP 403 | BLOCKED |

## Coverage gaps

The current free, verifiable catalog has **no** linear movies, kids, music, or documentary channels. Most such services (Pluto TV, Tubi, Samsung TV Plus, Plex FAST) publish only private service endpoints intended for their own players; scraping them is out of scope. Dedicated broadcaster apps remain the correct route for those catalogs.

## Re-validation

```bash
npm run verify:streams
```

This fetches every verified manifest, checks HLS structure and encryption, probes H.264/AAC with `ffprobe` when installed, and writes `docs/stream-report.json`. It is a host-side check, not proof of TV playback. To repeat the TV verification, see [VERIFICATION.md](VERIFICATION.md).
