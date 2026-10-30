# Install on the LG TV

Verified on an **LG 24LQ520S-PU**, webOS 22 (`sdkVersion 7.6.0`, firmware `04.60.92`), using an existing Developer Mode pairing.

Package: `com.nader.freewavelive_1.2.0_all.ipk`

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
4. Open the TV's **Apps** view → **Install** → select `com.nader.freewavelive_1.2.0_all.ipk`.
5. Launch **FreeWave Live TV** from the installed app list.

## 3. Option B — official CLI

```bash
npm install -g @webos-tools/cli
ares-setup-device            # add the TV: host, port 9922, user prisoner, passphrase
ares-install -d "Office TV" com.nader.freewavelive_1.2.0_all.ipk
ares-launch  -d "Office TV" com.nader.freewavelive
ares-install -d "Office TV" -l   # confirm com.nader.freewavelive is listed
```

The verified install used exactly this flow and returned `Success`.

## 4. First run

- The verified lineup appears immediately; no network import is required for the channel list.
- Highlight a channel and press **OK**. The TV's native player starts the HLS stream.
- **Setup** manages playlists, XMLTV, playback preferences, favorites, and diagnostics.
- **Guide** opens the full schedule; without XMLTV it explicitly shows “Guide data unavailable”.
- The first channel card has focus and a visible ring at launch. Press **OK** to play; **Right** enters the player controls; **Back** closes a dialog or exits at home.
- In Setup, **Down** leaves a text field instead of trapping focus. The field’s **Left/Right** remain caret movement.
- Setup → Diagnostics → **Show remote diagnostics overlay** displays the key code, action, focus, screen, and handled state. Leave it off for normal viewing.

Upgrading from 1.1.0 keeps the app id `com.nader.freewavelive`, so compatible favorites, recent channels, guide, and preferences remain. The package is unsigned and requires Developer Mode.

## 5. Logs and debugging

```bash
ares-inspect -d "Office TV" com.nader.freewavelive
```

Open the printed DevTools URL to see console output. Playback statistics are logged as:

```text
[freewave] stats {"version":"1.2.0","channel":"CGTN English","readyState":4,...}
```

## 6. Uninstall

```bash
ares-install -d "Office TV" --remove com.nader.freewavelive
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for install, CORS, guide, and playback failures.
