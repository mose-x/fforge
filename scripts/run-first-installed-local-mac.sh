#!/usr/bin/env bash
# First-launch fix for locally-built macOS DMG installs of fforge.
#
# After dragging fforge to /Applications from a LOCALLY-built DMG (especially
# under strict MDM), macOS may block it ("damaged" or SIGKILL 137). This script:
#   1. strips the .app bundle's ad-hoc signature
#   2. strips the inner binary's ad-hoc signature
#   3. clears all xattrs (incl. browser-download quarantine)
#   4. re-stamps a fresh com.apple.quarantine (routes through Gatekeeper's
#      right-click -> Open bypass, the correct path for unsigned apps)
#
# Usage (after dragging the app to /Applications from the DMG):
#   chmod +x scripts/run-first-installed-local-mac.sh
#   ./scripts/run-first-installed-local-mac.sh
#
# - Run once on first install; afterwards double-click the .app directly.
# - NOT needed for CI-release DMGs downloaded via browser (the browser adds the
#   correct quarantine automatically).
# - macOS only (needs codesign + xattr, both bundled with macOS).
set -euo pipefail

APP="/Applications/fforge.app"

if [ ! -d "$APP" ]; then
    echo "Error: $APP not found. Drag fforge to /Applications from the DMG first." >&2
    exit 1
fi

echo "1/4 Stripping bundle signature..."
codesign --remove-signature "$APP" 2>/dev/null || true

echo "2/4 Stripping inner binary signature..."
codesign --remove-signature "$APP/Contents/MacOS/fforge" 2>/dev/null || true

echo "3/4 Clearing all xattrs..."
xattr -cr "$APP"

echo "4/4 Re-stamping quarantine..."
xattr -w com.apple.quarantine "0083;00000000;fforge;|com.mose-x.fforge" "$APP"

echo
echo "Done! Launching app..."
open "$APP"
