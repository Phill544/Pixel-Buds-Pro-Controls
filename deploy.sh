#!/bin/bash
set -e

# Deploy Pixel Buds Pro Decky plugin to Steam Deck
# Usage: ./deploy.sh <STEAM_DECK_IP> [DECK_PASSWORD]
#
# Prerequisites:
#   - SSH enabled on Steam Deck
#   - Decky Loader installed on Steam Deck
#   - bin/pbpctrl built (see README)
#   - pnpm run build completed

DECK_IP="${1:?Usage: ./deploy.sh <STEAM_DECK_IP> [DECK_PASSWORD]}"
DECK_USER="deck"
PLUGIN_NAME="pixel-buds-decky"
DEST="/home/${DECK_USER}/homebrew/plugins/${PLUGIN_NAME}"

if [ ! -f "dist/index.js" ]; then
    echo "Error: dist/index.js not found. Run 'pnpm run build' first."
    exit 1
fi

if [ ! -f "bin/pbpctrl" ]; then
    echo "Error: bin/pbpctrl not found. Build it first (see README)."
    exit 1
fi

echo "Deploying to ${DECK_USER}@${DECK_IP}:${DEST}"

ssh "${DECK_USER}@${DECK_IP}" "mkdir -p ${DEST}/dist ${DEST}/bin"

scp dist/index.js "${DECK_USER}@${DECK_IP}:${DEST}/dist/"
scp bin/pbpctrl "${DECK_USER}@${DECK_IP}:${DEST}/bin/"
scp main.py plugin.json package.json "${DECK_USER}@${DECK_IP}:${DEST}/"

ssh "${DECK_USER}@${DECK_IP}" "chmod +x ${DEST}/bin/pbpctrl"

echo "Restarting Decky Loader..."
ssh "${DECK_USER}@${DECK_IP}" "sudo systemctl restart plugin_loader"

echo "Done! Plugin deployed to ${DEST}"
