# Build and test

## Prerequisites

- Node.js 20 or newer (Node 24 used for the verified build).
- LG webOS CLI: `npm install -g @webos-tools/cli` (3.2.5 used).
- Optional: FFmpeg/`ffprobe` for codec verification.
- No npm dependencies are installed by this project.

## Commands

```bash
npm run build:lineup    # data/channels.json -> app/default-playlist.js + app/data/public-channels.m3u
npm run lint            # node --check + JSON + app metadata invariants
npm run package         # build lineup, then ares-package app -o .
npm test                # node --test tests/*.test.js
npm run check:ipk       # parse ar/tar, verify metadata, files, and secret scan
npm run verify:streams  # network check of verified channels
npm run ci              # lint -> tests -> lineup -> package -> check:ipk
```

`npm test` includes a check that the current-version IPK exists. Package before testing, or use `npm run package && npm test`.

## Versioning

The version must match in three places:

1. `package.json` → `version`
2. `app/appinfo.json` → `version`
3. `app/js/app.js` → `APP_VERSION`

`npm run lint` and `tests/package.test.js` fail if they drift. The IPK filename is derived by `ares-package`: `com.nader.freewavelive_<version>_all.ipk`.

## What the package contains

```text
usr/palm/applications/com.nader.freewavelive/
  appinfo.json  index.html  styles.css  default-playlist.js  icon.png  largeIcon.png
  js/app.js  js/core.js  data/public-channels.m3u
usr/palm/packages/com.nader.freewavelive/packageinfo.json
control.tar.gz -> control (Package, Version, Architecture: all)
debian-binary
```

`scripts/check-ipk.js` verifies the real bytes rather than trusting the build log:

```bash
node scripts/check-ipk.js com.nader.freewavelive_1.1.0_all.ipk
# IPK ... Control: Package com.nader.freewavelive · Version 1.1.0
# App: FreeWave Live TV · id ... · 1280x720
# SHA-256: ...
# Package verification passed.
```

## Reproducibility

The app has no compiled assets or dependency tree. `ares-package` embeds file timestamps, so IPK hashes are not byte-reproducible across runs; the **contents** are. `npm run build:lineup` is deterministic for a given `data/channels.json`, and CI fails if regeneration leaves a diff.

## CI

`.github/workflows/ci.yml` runs on every push and pull request: installs the webOS CLI, builds the lineup, packages, runs all tests, verifies the IPK, and uploads the artifact.

`.github/workflows/release.yml` runs on `v*` tags and attaches the IPK to a GitHub Release.

## Adding a channel

1. Verify the broadcaster publishes the stream publicly (official page, no login/DRM).
2. Fetch the manifest and confirm H.264/AAC, no `EXT-X-KEY` encryption, and a working rendition.
3. Check it in the target region and, ideally, on the TV.
4. Add an entry to `data/channels.json` with rights evidence, codecs, HLS notes, and `"status": "verified"`.
5. Run `npm run build:lineup`, `npm run lint`, `npm run package`, `npm test`, `npm run check:ipk`.

Do not add a channel merely because an IPTV directory lists it. Do not add a URL that requires credentials, DRM keys, or a region workaround.
