# Install on the LG TV

Verified on an **LG 24LQ520S-PU**, webOS 22 (`sdkVersion 7.6.0`, firmware `04.60.92`), using an existing Developer Mode pairing.

Package: `com.nader.freewavelive_1.1.0_all.ipk`

## 1. Keep Developer Mode active

On the TV, open the **Developer Mode** app and confirm:

- Dev Mode Status is **ON**.
- **Key Server** is enabled.
- The TV and the computer are on the same network.
- The session has not expired. Developer Mode apps are removed when the session ends or Developer Mode is disabled; extend the session before installing.

Note the TV's IP address from that screen. Do not reuse an IP from an old session unless the router still assigns it.

## 2. Option A — webOS Dev Manager

1. Install [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop/releases/latest).
2. **Add Device** → enter the TV IP, port `9922`, user `prisoner`.
3. Pair with the Key Server passphrase shown on the TV.
4. Open the TV's **Apps** view → **Install** → select `com.nader.freewavelive_1.1.0_all.ipk`.
5. Launch **FreeWave Live TV** from the installed app list.

## 3. Option B — official CLI

```bash
npm install -g @webos-tools/cli
ares-setup-device            # add the TV: host, port 9922, user prisoner, passphrase
ares-install -d "Office TV" com.nader.freewavelive_1.1.0_all.ipk
ares-launch  -d "Office TV" com.nader.freewavelive
ares-install -d "Office TV" -l   # confirm com.nader.freewavelive is listed
```

The verified install used exactly this flow and returned `Success`.

## 4. First run

- The verified lineup appears immediately; no network import is required for the channel list.
- Highlight a channel and press **OK**. The TV's native player starts the HLS stream.
- **Setup** manages playlists, XMLTV, playback preferences, favorites, and diagnostics.
- **Guide** opens the full schedule; without XMLTV it explicitly shows “Guide data unavailable”.

## 5. Logs and debugging

```bash
ares-inspect -d "Office TV" com.nader.freewavelive
```

Open the printed DevTools URL to see console output. Playback statistics are logged as:

```text
[freewave] stats {"version":"1.1.0","channel":"CGTN English","readyState":4,...}
```

## 6. Uninstall

```bash
ares-install -d "Office TV" --remove com.nader.freewavelive
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for install, CORS, guide, and playback failures.
