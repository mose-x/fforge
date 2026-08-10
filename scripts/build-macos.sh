#!/usr/bin/env bash
# Build the macOS .app, DMG (first-install), and self-update .bin for fforge.
#
# Usage:   ./scripts/build-macos.sh <version> [arch]
#   version:  release version, e.g. 1.2.0
#   arch:     amd64 | arm64  (default: native GOARCH)
#
# Produces in build/bin/:
#   fforge-<ver>-macos-<x64|arm64>.dmg   (first-install)
#   fforge-<ver>-macos-<x64|arm64>.bin   (in-app self-update bare inner binary)
#
# Prereqs: Go 1.25+, Node 20+, Wails CLI, jq, create-dmg (brew), Pillow (pip3),
#   Xcode Command Line Tools (codesign/sips/iconutil/hdiutil). macOS-only.
#
# This script is the single source of truth for the macOS packaging steps;
# .github/workflows/build.yml calls it so CI and local builds produce identical
# artifacts. Run on macOS only.
set -euo pipefail

VERSION="${1:?version required, e.g. 1.2.0}"
ARCH="${2:-$(go env GOARCH)}"
case "$ARCH" in
  amd64) ASSET_ARCH="x64" ;;
  arm64) ASSET_ARCH="arm64" ;;
  *) echo "unsupported arch: $ARCH (want amd64|arm64)" >&2; exit 1 ;;
esac

APP="build/bin/fforge.app"

# --- Bump about.json so the binary reports the correct version to CheckUpdate.
jq --arg v "$VERSION" '.version = $v' about.json > about.json.tmp && mv about.json.tmp about.json
echo "about.json version bumped to $VERSION"

# --- Download static FFmpeg binaries (osxexperts.net; version-pinned, may drift).
# Each zip contains a single binary (ffmpeg or ffprobe).
case "$ARCH" in
  amd64)
    curl -L "https://www.osxexperts.net/ffmpeg80intel.zip" -o /tmp/ffmpeg.zip
    curl -L "https://www.osxexperts.net/ffprobe80intel.zip" -o /tmp/ffprobe.zip
    ;;
  arm64)
    curl -L "https://www.osxexperts.net/ffmpeg81arm.zip" -o /tmp/ffmpeg.zip
    curl -L "https://www.osxexperts.net/ffprobe81arm.zip" -o /tmp/ffprobe.zip
    ;;
esac
mkdir -p /tmp/ffmpeg_extract
unzip -o /tmp/ffmpeg.zip -d /tmp/ffmpeg_extract >/dev/null
unzip -o /tmp/ffprobe.zip -d /tmp/ffmpeg_extract >/dev/null
FFMPEG_BIN=$(find /tmp/ffmpeg_extract -type f -name 'ffmpeg' | head -1)
FFPROBE_BIN=$(find /tmp/ffmpeg_extract -type f -name 'ffprobe' | head -1)
echo "FFmpeg: $(ls -la "$FFMPEG_BIN" "$FFPROBE_BIN")"

# --- Build the .app. FFORGE_SKIP_BINDINGS=1 (set by scripts/build-macos-local.sh)
# passes -skipbindings so Wails does not run the ad-hoc-signed binding-generator
# binary (amfid kills it under MDM). CI leaves it unset -> bindings are
# regenerated each build (catches drift). When skipping, frontend/wailsjs/ must
# be current.
WAILS_FLAGS=""
[ "${FFORGE_SKIP_BINDINGS:-0}" = "1" ] && WAILS_FLAGS="-skipbindings"
wails build $WAILS_FLAGS -platform "darwin/$ARCH" -o fforge

# --- Copy FFmpeg into the .app bundle so the app resolves them at runtime.
RES="$APP/Contents/Resources"
mkdir -p "$RES"
cp "$FFMPEG_BIN" "$RES/ffmpeg"
cp "$FFPROBE_BIN" "$RES/ffprobe"
chmod +x "$RES/ffmpeg" "$RES/ffprobe"

# --- Strip the ad-hoc signature Wails/Go applies to the .app. An ad-hoc-signed
# .app under Gatekeeper (browser quarantine) shows "damaged" with no
# right-click -> Open bypass. Strip BOTH the bundle signature AND the inner
# executable's ad-hoc: removing only the bundle seal while leaving the inner
# binary ad-hoc-signed leaves a signature mismatch that Gatekeeper still
# rejects. The arm64 kernel re-applies an ad-hoc signature to the inner binary
# at exec time, so stripping it is safe (the binary still runs). See
# scripts/README.md + the macOS self-update signature caveat in AGENTS.md.
codesign --remove-signature "$APP" 2>/dev/null || true
codesign --remove-signature "$APP/Contents/MacOS/fforge" 2>/dev/null || true

# --- Create a drag-to-Applications DMG with a white background + install hints.
command -v create-dmg >/dev/null 2>&1 || brew install create-dmg
python3 -m venv /tmp/fforge-dmgvenv
/tmp/fforge-dmgvenv/bin/pip install --quiet Pillow
BG_PATH="build/bin/dmg_bg.png"
export BG_PATH
/tmp/fforge-dmgvenv/bin/python << 'PYEOF'
import os
from PIL import Image, ImageDraw, ImageFont
w, h = 660, 400
img = Image.new("RGBA", (w, h), (255, 255, 255, 255))
draw = ImageDraw.Draw(img)
def load_font(size):
    for path in [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()
title_font = load_font(24)
hint_font = load_font(14)
small_font = load_font(12)
cx = w / 2
RED = (200, 0, 0, 255)
draw.text((cx, 40), "fforge", fill=(30, 30, 46, 255), font=title_font, anchor="mm")
draw.text((cx, 130), "Drag the app icon to the Applications folder on the right",
          fill=(90, 90, 90, 255), font=hint_font, anchor="mm")
# Security hint in RED: the correct unsigned-app bypass is Right-click -> Open,
# NOT `xattr -cr` (which strips quarantine and routes MDM users back to the
# provenance path that SIGKILLs unsigned binaries).
draw.text((cx, 290), 'If macOS says "cannot be opened":',
          fill=RED, font=small_font, anchor="mm")
draw.text((cx, 320), 'Right-click the app  ->  Open  ->  "Open"',
          fill=RED, font=hint_font, anchor="mm")
img.save(os.environ["BG_PATH"])
PYEOF
DMG_NAME="fforge-${VERSION}-macos-${ASSET_ARCH}.dmg"
create-dmg \
  --volname "fforge" \
  --background "$BG_PATH" \
  --window-pos 200 120 \
  --window-size 660 400 \
  --icon-size 100 \
  --app-drop-link 480 200 \
  --icon "fforge.app" 180 200 \
  --no-internet-enable \
  "build/bin/${DMG_NAME}" \
  "$APP" || true
# create-dmg may fail on CI due to AppleScript; fallback to hdiutil.
if [ ! -f "build/bin/${DMG_NAME}" ]; then
  hdiutil create -volname "fforge" -srcfolder "$APP" -ov -format UDZO "build/bin/${DMG_NAME}"
fi

# --- Stamp the DMG with com.apple.quarantine so a drag-installed .app inherits
# it and launches via Gatekeeper (right-click -> Open), not the provenance path
# that SIGKILLs unsigned binaries under MDM. Browser-downloaded DMGs get
# quarantine automatically; this covers locally-built / non-browser DMGs.
xattr -w com.apple.quarantine "0083;00000000;fforge;|com.mose-x.fforge" \
  "build/bin/${DMG_NAME}" 2>/dev/null || true

# --- Extract the bare inner binary for in-app self-update (ApplyUpdate swaps
# the executable inside the existing .app bundle, not the bundle itself).
BIN_NAME="fforge-${VERSION}-macos-${ASSET_ARCH}.bin"
cp "$APP/Contents/MacOS/fforge" "build/bin/${BIN_NAME}"

echo
echo "Built:"
echo "  build/bin/${DMG_NAME}"
echo "  build/bin/${BIN_NAME}"
