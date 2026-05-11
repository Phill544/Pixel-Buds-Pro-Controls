param(
    [Parameter(Mandatory=$true)]
    [string]$DeckIP
)

$ErrorActionPreference = "Stop"

$DeckUser = "deck"
$PluginName = "pixel-buds-decky"
$Dest = "/home/$DeckUser/homebrew/plugins/$PluginName"

if (-not (Test-Path "bin/pbpctrl")) {
    Write-Error "bin/pbpctrl not found. Build it first (see README)."
    exit 1
}

Write-Host "Building plugin..." -ForegroundColor Cyan
& node "node_modules/rollup/dist/bin/rollup" -c
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed."
    exit 1
}

if (-not (Test-Path "dist/index.js")) {
    Write-Error "dist/index.js missing after build."
    exit 1
}

Write-Host ""
Write-Host "Deploying to ${DeckUser}@${DeckIP}:${Dest}" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 1: Creating directories and setting permissions..."
# Delete plugin.json before scp — plugin_loader sometimes reclaims it as root
# on restart, and `chown -R` alone can race against that. Removing it lets scp
# recreate it under the deck user cleanly.
ssh -t "${DeckUser}@${DeckIP}" "sudo mkdir -p ${Dest}/dist ${Dest}/bin && sudo chown -R ${DeckUser}:${DeckUser} ${Dest} && sudo rm -f ${Dest}/plugin.json"

Write-Host ""
Write-Host "Step 2: Copying all files..."
scp "dist/index.js" "${DeckUser}@${DeckIP}:${Dest}/dist/"
scp "bin/pbpctrl" "${DeckUser}@${DeckIP}:${Dest}/bin/"
scp "main.py" "plugin.json" "package.json" "${DeckUser}@${DeckIP}:${Dest}/"

Write-Host ""
Write-Host "Step 3: Setting binary permissions and restarting Decky..."
ssh -t "${DeckUser}@${DeckIP}" "chmod +x ${Dest}/bin/pbpctrl && sudo systemctl restart plugin_loader"

Write-Host ""
Write-Host "Done! Plugin deployed to ${Dest}" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
