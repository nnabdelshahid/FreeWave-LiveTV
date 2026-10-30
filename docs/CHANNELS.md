# Channel lineup, rights, and validation

Validated from a US network on **2026-10-29/30** and played on the **LG 24LQ520S-PU**. Only channels whose manifests were fetched, whose codecs were probed, and which reached `readyState 4` with advancing playback time on the TV are shipped. Every bundled channel is labeled **FREE LIVE** in the app.

**Shipped total: 13 channels.**

## Verified channels

| # | Channel | Category | Language | Official source | Stream endpoint | Rights / authorization evidence | US availability | Codecs (host probe) | HLS notes | TV playback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | CGTN English | News | English | https://www.cgtn.com/tv | `https://english-livetx.cgtn.com/hls/yypdyyctzb_hd.m3u8` | CGTN publishes this HLS feed on its own free live TV page; no login, no DRM | Reachable 2026-10-29 | H.264 Constrained Baseline 1280×720; AAC LC 2ch | 3 × `EXT-X-PROGRAM-DATE-TIME`; still plays | **Verified** 1280×720 |
| 2 | DW English | News | English | https://www.dw.com/en/live-tv/channel-english | `https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/master.m3u8` | DW links this feed from its official English live-TV page | Reachable 2026-10-29 | H.264 Main 640×360; AAC LC 2ch | No PDT tag in master | **Verified** 480×270 |
| 3 | DW Arabic | News | Arabic | https://www.dw.com/ar/live-tv/channel-arabic | `https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/master.m3u8` | DW links this feed from its official Arabic live-TV page | Reachable 2026-10-29 | H.264 480×270; AAC 2ch | WebVTT subtitles + A/V renditions | **Verified** 480×270 |
| 4 | CBS News 24/7 | News | English | https://www.cbsnews.com/live/ | `https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8` | CBS News publishes this feed for its free 24/7 stream | Reachable 2026-10-29 | H.264 Main up to 1280×720; AAC LC 2ch | SCTE-35 + timed ID3 | **Verified** 320×180 |
| 5 | CNA | News | English | https://www.channelnewsasia.com/watch | `https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f43aeb4a48ec97f66ebbe/index.m3u8` | CNA publishes this feed for its free live watch page | Reachable 2026-10-29 | H.264 Main up to 1920×1080; AAC | 5 renditions | **Verified** 480×270 |
| 6 | Bloomberg Television US | Business | English | https://www.bloomberg.com/live/us | `https://www.bloomberg.com/media-manifest/streams/us.m3u8` | Bloomberg publishes this manifest for its free live player | Reachable 2026-10-29 | H.264 High 1280×720; AAC LC 2ch | 4 renditions | **Verified** 1280×720 |
| 7 | Bloomberg Television Europe | Business | English | https://www.bloomberg.com/live/eu | `https://www.bloomberg.com/media-manifest/streams/eu.m3u8` | Bloomberg publishes this manifest for its free live player | Reachable 2026-10-29 | H.264 High 1280×720; AAC LC 2ch | 4 renditions, DVB teletext | **Verified** 1280×720 |
| 8 | Red Bull TV | Sports | English | https://www.redbull.com/tv | `https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8` | Red Bull publishes this feed for its free linear channel | Reachable 2026-10-29 | H.264 Main up to 1920×1080; AAC | 6 renditions | **Verified** 320×180 |
| 9 | Arirang TV | International | English | https://www.arirang.com/live | `https://amdlive-ch01-ctnd-com.akamaized.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8` | Arirang publishes this feed for its official free live stream | Reachable 2026-10-29 | H.264 High up to 1920×1080; AAC LC 2ch | 4 renditions, timed ID3 | **Verified** 640×360 |
| 10 | Al Jazeera Arabic | News | Arabic | https://www.aljazeera.net/live | `https://live-hls-web-aja.getaj.net/AJA/index.m3u8` | Al Jazeera publishes this HLS feed from its own free Arabic live page; no login, no DRM | Reachable 2026-10-30 | H.264 High up to 1920×1080; AAC LC 2ch | Multi-rendition; no encryption | **Verified** 1280×720 |
| 11 | FOX Weather | Weather | English | https://www.foxweather.com/live | `https://content.uplynk.com/db88cebb80ea46269a1b2691871f3660.m3u8` | FOX Weather publishes this free live stream on its own site; no login, no DRM | Reachable 2026-10-30 | H.264 up to 960×540; AAC 2ch; closed captions | Uplynk manifest; no encryption | **Verified** 992×558 |
| 12 | CBS Sports HQ | Sports | English | https://www.cbssports.com/watch/live | `https://dai.google.com/linear/hls/event/9Lq0ERvoSR-z9AwvFS-xYA/master.m3u8` | CBS Sports publishes this free sports-news stream on its own watch page | Reachable 2026-10-30 | H.264 480×270; AAC 2ch | DAI manifest; no encryption | **Verified** 480×270 |
| 13 | CBS Sports Golazo | Sports | English | https://www.cbs.com/live-tv/stream/golazo/ | `https://dai.google.com/linear/hls/event/7f3Wv6f7QEKfQna22jHqLQ/master.m3u8` | CBS Sports publishes this free soccer channel on its own live stream page | Reachable 2026-10-30 | H.264 480×270; AAC 2ch | DAI manifest; no encryption | **Verified** 480×270 |

TV dimensions are the rendition the TV chose at the moment of the check; all reported `readyState 4` with advancing playback time. **Audible output remains NOT TESTED** (an audio track is present and the player is unmuted; webOS does not expose a reliable decoded-audio counter).

## Access labels

Every bundled channel carries `access: "FREE LIVE"` and displays that label in the channel row. It means "a public feed the broadcaster offers for free," not "a free copy of a paid network." See [NETWORK-PARITY.md](NETWORK-PARITY.md) for the premium-network comparison.

## Rejected or blocked sources

These were investigated and **deliberately excluded**. They are not in `data/channels.json`, are not visible in the app, and a test fails if their hosts reappear.

| Source | URL tested | Result | Classification |
| --- | --- | --- | --- |
| NASA TV | `https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8` | Host manifest passed, but the TV player failed with media error 4; removed after device verification | BLOCKED — TV decode |
| Al Jazeera English | `https://live-hls-web-aje.getaj.net/AJE/index.m3u8` | Manifest reachable once, then DNS `ENOTFOUND` from this network | BLOCKED — DNS |
| Al Jazeera Documentary | `https://live-hls-web-ajd.getaj.net/AJD/index.m3u8` | HTTP 403 via edge cache | BLOCKED |
| NHK World Japan | `https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8` | DNS `ENOTFOUND` | BLOCKED — DNS |
| TRT World / TRT Turkish channels | `https://tv-trt*.live.trt.com.tr/master.m3u8` | TLS handshake failure (`SEC_E_ILLEGAL_MESSAGE`); HTTP 403 | BLOCKED — TLS/geo |
| France 24 English/French/Spanish/Arabic | `https://static.france24.com/live/F24_*_LO_HLS/live_web.m3u8` | Master variants answer HTTP 400 | BROKEN SOURCE |
| ABC News Live | `https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8` | HTTP 404 | DEAD ENDPOINT |
| Euronews English | `https://euronews.alteox.app/hls/en_stream.m3u8` | HTTP 404 | DEAD ENDPOINT |
| PBS Kids | https://pbskids.org/ | No public HLS manifest on the page | NOT AVAILABLE |
| LiveNOW from FOX | Akamai endpoint | HTTP 403 | BLOCKED |
| Pluto TV / Plex / LG Channels / Tubi / Samsung TV Plus | Provider-internal endpoints | Tokenized, app-bound, and not published for third-party playback; not scraped | NOT PERMITTED |
| ESPN, ESPN2, FS1, TNT, TBS, USA, FX, CNN, FOX News, Discovery, HGTV, Food Network, Comedy Central, MTV, TCM | n/a | No authorized free public linear feed; subscription required | REQUIRES SUBSCRIPTION |

## Coverage gaps

The verified free catalog has **no** linear movies, kids, music, documentary, general-entertainment, or premium-sports channels. The free channels that remain are news, business, weather, international, and sports-news/soccer. This is a rights and distribution limitation, not a parser limitation.

Provider FAST catalogs are excluded. Their terms do not permit copying internal stream URLs into a third-party player, and many require short-lived tokens. The correct way to watch those catalogs is the provider's own app.

## Re-validation

```bash
npm run verify:streams
```

This fetches every verified manifest, checks HLS structure and encryption, probes H.264/AAC with `ffprobe` when installed, and writes `docs/stream-report.json`. It is a host-side check, not proof of TV playback. To repeat the TV verification, see [VERIFICATION.md](VERIFICATION.md).
