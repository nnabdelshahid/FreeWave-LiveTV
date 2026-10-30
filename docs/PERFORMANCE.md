# On-device performance — 1.3.0

Measured on the installed **LG 24LQ520S-PU** through its real DevTools session on 2026-10-30. The app was `v1.3.0`, with **13 channel rows** and one HTML video element.

## Environment

| Item | Value |
| --- | --- |
| App / package | 1.3.0 / `com.nader.freewavelive_1.3.0_all.ipk` |
| User agent | Chrome/87.0.4280.88, `WebAppManager` |
| App canvas | 1280 × 720 (TV screen 1366 × 768) |
| CPU reported to the page | 4 cores |
| Device memory reported to the page | 1 GB |
| Runtime dependencies | None; no Node.js/npm process or bundled library |
| Test stream | CBS Sports HQ (after CGTN and a guide open/close) |

`ares-shell` is rejected for the TV CLI profile, so **system RSS, whole-TV CPU, and swap were not measured**. The previously supplied baseline (1,374,616 KiB total RAM, ~237,508 KiB available, no sustained swapping) is treated as user-provided context, not as evidence from this run.

## Measurements

| Measurement | Result |
| --- | --- |
| App reload to `document.readyState === complete` and version element | **876 ms** |
| Navigation timing | DOMContentLoaded **651 ms**, load **702 ms** |
| CGTN English click to first decoded frame (`readyState >= 3`, time advancing) | **3,351 ms** |
| CBS Sports HQ click to first decoded frame | **3,553 ms** |
| TV Guide open to 13 rendered rows | **343 ms** |
| Raw ArrowDown dispatch through CDP to focus change | **315 ms** including the DevTools round trip; one event moved focus |
| JS heap after load | **1.90 MB** |
| JS heap after CBS Sports HQ started | **1.08 MB** |
| JS heap after the 45 s soak | **1.48 MB** |
| Renderer CPU time during the 45 s soak | **1.75 s**, about **3.9% of one core** |
| DOM nodes after CBS Sports HQ started | 1,507 |
| DOM nodes at the end | 3,091 |
| JS event listeners after CBS Sports HQ started | 83 |
| JS event listeners at the end | 187 |
| Layout objects | 763 |
| Video elements | **1** at every sample |

The page's `performance.memory` property reported a clamped 10 MB value, so the heap figures above come from CDP `Performance.getMetrics().JSHeapUsedSize`, not that property.

## 45-second soak

Nine samples were taken five seconds apart while CBS Sports HQ played. The TV guide had been opened and closed before the soak began.

| Check | Result |
| --- | --- |
| Samples | 9 |
| `readyState === 4` | **9 / 9** |
| Playback time | 58.82 s → 99.76 s (**+40.94 s**) |
| Media errors | **0** |
| Paused | No |
| Video elements | 1 |
| Dropped-frame counter | 0, but `totalVideoFrames` was also 0; webOS does not expose a usable frame counter |
| Runtime exceptions | 0 |

This is a **45-second** sample, not a 15-minute soak. It establishes low JS heap and no observed stall on the 13-row lineup; it does not establish long-session stability.

## Interpretation and limits

- The app heap stayed under **2 MB**; that is small relative to the TV's available memory. No swapping or memory-pressure conclusion is drawn because system metrics were unavailable.
- The 13-row list is not virtualized. That is appropriate at this size, but **300-channel performance is not tested** and would require virtualization before claiming it.
- The guide's hidden rows remained in the DOM after closing, which explains the node/listener increase from 1,507/83 to 3,091/187. This is a retained-DOM cost, not proof of an unbounded leak. For a future long-session release, clearing `guideList` on close or virtualizing it is the first optimization to test.
- Startup and first-frame times include live network and live-edge latency; they are not a cold-boot benchmark.
- The remote figure is a DevTools dispatch measurement, not a physical-remote latency measurement. Physical button presses remain **NOT TESTED**.
- Audible output remains **NOT TESTED**; only the presence of an unmuted audio track is known.

## Reproducing

```bash
ares-inspect -d "Office TV" com.nader.freewavelive
# open the printed DevTools URL, then run a CDP Performance.getMetrics /
# Memory.getDOMCounters sample while one channel plays
```

The raw run is in `.work/perf-report.json` on the build machine; it is intentionally excluded from Git. This document records the measured values.
