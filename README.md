# Pixel Buds Pro — Decky Loader Plugin

Monitor battery levels and control ANC for Google Pixel Buds Pro on Steam Deck.

## Features

- Battery levels for left bud, right bud, and case with charging indicators
- ANC mode switching: Off / Noise Cancellation / Transparency / Adaptive
- Auto-refresh every 30 seconds

## Prerequisites

- Steam Deck with [Decky Loader](https://decky.xyz) installed
- Pixel Buds Pro paired via SteamOS Bluetooth settings
- Docker Desktop (for building the pbpctrl binary)
- Node.js v16.14+ and pnpm v9+

## Setup

### 1. Enable SSH on Steam Deck

Switch to Desktop Mode, open Konsole:

```bash
passwd                          # set a password for the deck user
sudo systemctl start sshd       # start SSH
sudo systemctl enable sshd      # auto-start on boot
ip addr show                    # note your IP (wlan0)
```

### 2. Build pbpctrl

This plugin wraps [pbpctrl](https://github.com/qzed/pbpctrl), a Rust CLI for Pixel Buds Pro.

**Option A — Docker (from Windows/Linux):**

```bash
docker build -t pbpctrl-builder ./backend
docker run --rm -v "%cd%/bin:/backend/out" pbpctrl-builder
```

On Git Bash or WSL, use `$(pwd)` instead of `%cd%`.

**Option B — Build on Steam Deck directly:**

```bash
ssh deck@<DECK_IP>
sudo steamos-readonly disable
sudo pacman -S rust protobuf dbus pkg-config base-devel
git clone --branch v0.1.8 --depth 1 https://github.com/qzed/pbpctrl.git /tmp/pbpctrl
cd /tmp/pbpctrl && cargo build --release
cp target/release/pbpctrl ~/pbpctrl
```

### 3. Build the frontend

```bash
pnpm install
pnpm run build
```

### 4. Deploy to Steam Deck

```bash
./deploy.sh <STEAM_DECK_IP>
```

Or manually:

```bash
DECK_IP=<your_ip>
DEST="deck@${DECK_IP}:~/homebrew/plugins/pixel-buds-decky"
ssh deck@${DECK_IP} "mkdir -p ~/homebrew/plugins/pixel-buds-decky/{dist,bin}"
scp dist/index.js ${DEST}/dist/
scp bin/pbpctrl ${DEST}/bin/
scp main.py plugin.json package.json ${DEST}/
ssh deck@${DECK_IP} "chmod +x ~/homebrew/plugins/pixel-buds-decky/bin/pbpctrl"
ssh deck@${DECK_IP} "sudo systemctl restart plugin_loader"
```

## Troubleshooting

### pbpctrl can't connect to the buds

1. Make sure buds are out of the case and connected via SteamOS Bluetooth
2. Test manually via SSH: `~/homebrew/plugins/pixel-buds-decky/bin/pbpctrl show Battery`
3. If that fails, enable BlueZ experimental features:
   ```bash
   sudo steamos-readonly disable
   sudo sed -i 's/#Experimental = false/Experimental = true/' /etc/bluetooth/main.conf
   sudo systemctl restart bluetooth
   ```

### Plugin doesn't appear in Decky

Restart Decky Loader: `sudo systemctl restart plugin_loader`

## Credits

- [pbpctrl](https://github.com/qzed/pbpctrl) by qzed — Pixel Buds Pro Bluetooth protocol implementation
- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) — Steam Deck plugin framework

## License

GPL-3.0
