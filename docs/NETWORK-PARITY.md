# YouTube TV network parity and legal availability

Audit date: **2026-10-30**. Target: LG 24LQ520S-PU, webOS 22, US network.

This document answers one question per network: can its **actual linear feed** be watched free and legally inside FreeWave, and if not, what free programming is available instead?

## Bottom line

| Measure | Result |
| --- | --- |
| Exact free feeds of subscription-only YouTube TV networks | **0** |
| Networks available free through an antenna (OTA), but not through FreeWave | **ABC, CBS, NBC, FOX, PBS, local stations** |
| Subscription-authenticated networks integrated in FreeWave | **0** |
| Comparable free FAST/broadcaster alternatives shipped and playable | **13 channels** |
| Exact replacements for ESPN, TNT, USA, FX, Discovery, HGTV, Food Network, Comedy Central, MTV, or TCM | **0** |

**FreeWave is not a free YouTube TV. It is a free live-TV app with 13 verified public feeds, mostly news, business, and sports news.** No amount of channel-count inflation changes that. The premium networks below require a subscription or a licensing agreement that does not exist for this project.

## Classification

| Label | Meaning |
| --- | --- |
| **EXACT FREE** | The same network's live linear feed is legally free and can be embedded here. |
| **PARTIALLY FREE** | Some events or programs are free, or the network is free over the air, but the full linear feed is not available in FreeWave. |
| **FREE ALTERNATIVE** | A different, clearly branded free channel covers a similar genre. It is never presented as the premium network. |
| **REQUIRES SUBSCRIPTION** | The linear network is sold through a pay-TV service and has no authorized free public feed. |
| **UNAVAILABLE** | No lawful public endpoint or comparable free channel was verified. |

"Publicly reachable" is not the same as "licensed for redistribution." FreeWave does not proxy, restream, decrypt, or strip tokens from any feed. It points the TV's player at the broadcaster's own public HLS URL, as a browser would. Provider-internal FAST endpoints (Pluto, Plex, LG Channels, Tubi, Samsung TV Plus) are not copied because they are app-bound, tokenized, and not published for third-party playback.

## Network matrix

YouTube TV carriage and local-network availability vary by ZIP and by current carriage contracts. This matrix audits the named networks, not a ZIP-specific channel count or price.

| YouTube TV network | Exact free live feed? | Comparable free alternative | Available in FreeWave? | Playback verified | Subscription required? | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| ESPN | No | CBS Sports HQ, CBS Sports Golazo, Red Bull TV — sports news and non-ESPN events | Yes, the alternatives | Yes | Yes | REQUIRES SUBSCRIPTION |
| ESPN2 | No | Same sports alternatives; no ESPN2 games | Yes, the alternatives | Yes | Yes | REQUIRES SUBSCRIPTION |
| FS1 | No | CBS Sports HQ, Red Bull TV; no FS1 events | Yes, the alternatives | Yes | Yes | REQUIRES SUBSCRIPTION |
| TNT | No | None verified for general entertainment or NBA/NHL games | No | — | Yes | UNAVAILABLE |
| TBS | No | None verified for comedy, baseball, or general entertainment | No | — | Yes | UNAVAILABLE |
| USA | No | None verified for general entertainment or WWE | No | — | Yes | UNAVAILABLE |
| FX | No | None verified for scripted drama | No | — | Yes | UNAVAILABLE |
| CNN | No | CBS News 24/7, DW English, CNA, Bloomberg TV; not CNN programming | Yes, the alternatives | Yes | Yes for CNN | FREE ALTERNATIVE |
| FOX News | No | CBS News 24/7, DW English, CNA; not FOX News programming | Yes, the alternatives | Yes | Yes for FOX News | FREE ALTERNATIVE |
| Discovery | No | None verified for factual/real-life programming | No | — | Yes | UNAVAILABLE |
| HGTV | No | None verified for home programming | No | — | Yes | UNAVAILABLE |
| Food Network | No | None verified for food programming | No | — | Yes | UNAVAILABLE |
| Comedy Central | No | None verified for comedy programming | No | — | Yes | UNAVAILABLE |
| MTV | No | None verified for music/reality programming | No | — | Yes | UNAVAILABLE |
| TCM | No | None verified for classic films | No | — | Yes | UNAVAILABLE |
| ABC | OTA only | CBS News 24/7 is a separate news service, not ABC | No for ABC; adjacent news is playable | OTA not tested | No for OTA; yes for cable-style access | PARTIALLY FREE |
| CBS | OTA only | CBS News 24/7 is a separate 24/7 service, not the CBS broadcast network | OTA no; CBS News 24/7 yes | CBS News 24/7 yes | No for OTA; yes for cable-style access | PARTIALLY FREE |
| NBC | OTA only | None verified | No | — | No for OTA; yes for cable-style access | PARTIALLY FREE |
| FOX | OTA only | FOX Weather is a separate weather service, not FOX broadcast | OTA no; FOX Weather yes | FOX Weather yes | No for OTA; yes for cable-style access | PARTIALLY FREE |
| PBS | OTA only | None verified as a public HLS feed | No | — | No for OTA | PARTIALLY FREE |
| Local ABC/CBS/NBC/FOX/PBS stations | OTA only | No station-specific feed verified | No | — | No for OTA | PARTIALLY FREE |
| Regional sports networks | No | None verified | No | — | Yes (RSN tier) | UNAVAILABLE |

**Result: no exact free premium feed exists among the audited networks.** The "FreeWave" column means a different free channel is present, not that the named network is free.

## What FreeWave actually plays

**13 channels, all `FREE LIVE`.** All reached `readyState 4`, advanced playback time, and reported decoded video on the LG 24LQ520S-PU.

| # | Channel | Category | Access | TV decoded size |
| --- | --- | --- | --- | --- |
| 1 | CGTN English | News | FREE LIVE | 1280×720 |
| 2 | DW English | News | FREE LIVE | 480×270 |
| 3 | DW Arabic | News | FREE LIVE | 480×270 |
| 4 | CBS News 24/7 | News | FREE LIVE | 320×180 |
| 5 | CNA | News | FREE LIVE | 480×270 |
| 6 | Bloomberg Television US | Business | FREE LIVE | 1280×720 |
| 7 | Bloomberg Television Europe | Business | FREE LIVE | 1280×720 |
| 8 | Red Bull TV | Sports | FREE LIVE | 320×180 |
| 9 | Arirang TV | International | FREE LIVE | 640×360 |
| 10 | Al Jazeera Arabic | News | FREE LIVE | 1280×720 |
| 11 | FOX Weather | Weather | FREE LIVE | 992×558 |
| 12 | CBS Sports HQ | Sports | FREE LIVE | 480×270 |
| 13 | CBS Sports Golazo | Sports | FREE LIVE | 480×270 |

Category totals: **6 news, 2 business, 3 sports, 1 weather, 1 international**. Movies, kids, music, general entertainment, and premium sports: **0 verified**.

NASA TV passed host validation but failed on the TV with media error 4. It was removed from the shipped lineup rather than displayed as working. Details are in [CHANNELS.md](CHANNELS.md).

## Local broadcast television

The 24LQ520S-PU has an ATSC tuner (`K8AP_ATSC_US`). The lawful way to watch local ABC/CBS/NBC/FOX/PBS stations is the TV's own antenna input and channel scan. webOS exposes **no supported API** for a third-party web app to tune or capture that internal tuner, and no network tuner is present. FreeWave therefore does not pretend to be an OTA receiver.

- OTA availability depends on the ZIP code, antenna, and terrain; those details were not supplied.
- Local-station integration: **BLOCKED** by the absence of a supported tuner API and network tuner hardware.
- No tuner hardware was purchased.

## Existing subscriptions

FreeWave does **not** ask for or store provider passwords, and does not embed provider streams or DRM. There is no official, generally available webOS OAuth/playback SDK through which this app can become YouTube TV, Sling, Hulu + Live TV, or a cable operator.

The permitted route is the provider's own LG TV app, using the user's existing subscription. FreeWave's optional import fields accept only public M3U/XMLTV sources supplied by the user; they do not authenticate to paid services.

- Subscription-authenticated integration: **BLOCKED** / not implemented.
- No subscription or trial was purchased.

## Why the lineup is 13 and not 300

The 300-channel target requires either (a) a licensed linear-TV distribution agreement, (b) a provider FAST API that permits third-party clients, or (c) unauthorized scraping of app-bound streams. None is available for a free, local, unsigned webOS app. The 13 feeds here are the ones that survived official-source review, host probes, and actual TV playback.

Pluto TV, Plex, LG Channels, Tubi, and Samsung TV Plus may be watched in their own apps. Their internal endpoints are not counted as FreeWave channels because they are not published for this use and often require provider tokens.

## Sources and method

- YouTube TV plan and network list: [tv.youtube.com](https://tv.youtube.com/welcome/) (carriage and local stations vary by ZIP and contract).
- Broadcaster free-stream pages: the official source link for every channel in [CHANNELS.md](CHANNELS.md).
- Local DTV reception: [FCC DTV reception maps](https://www.fcc.gov/media/engineering/dtvmaps).
- LG webOS platform documentation: [webostv.developer.lge.com](https://webostv.developer.lge.com/).

No network is called free because a third-party IPTV directory lists it. A channel is counted only after its official page, manifest, codec, and TV playback were checked.

## Re-validation

```bash
npm run verify:streams   # host manifest/codec check
npm test                 # rights, URL, lineup and package invariants
```

A host probe is not a licence and not proof of TV playback. Device results are recorded in [VERIFICATION.md](VERIFICATION.md). Feed availability can change without notice.
