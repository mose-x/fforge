#!/usr/bin/env bash
# Build the Linux bare binary (self-update) + .deb + .rpm for fforge.
#
# Usage:   ./scripts/build-linux.sh <version> [arch]
#   version:  release version, e.g. 1.2.0
#   arch:     amd64 | arm64  (default: native GOARCH)
#
# Produces in build/bin/:
#   fforge-<ver>-linux-<x64|arm64>          (self-update bare binary)
#   fforge-<ver>-linux-<x64|arm64>.deb      (first-install, bundles FFmpeg)
#   fforge-<ver>-linux-<x64|arm64>.rpm
#
# Prereqs: Go 1.25+, Node 20+, Wails CLI, jq, fpm (ruby gem),
#   libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev,
#   python3-pil. Wails v2 targets webkit2gtk-4.0 (ubuntu-22.04/jammy); 4.1 is
#   Wails v3 only. Linux ARM64 cannot be cross-compiled (webkit2gtk CGO), so run
#   this script on a native arm64 host for arm64.
#
# This script is the single source of truth for the Linux packaging steps;
# .github/workflows/build.yml calls it so CI and local builds produce identical
# artifacts.
set -euo pipefail

VERSION="${1:?version required, e.g. 1.2.0}"
ARCH="${2:-$(go env GOARCH)}"
case "$ARCH" in
  amd64) ASSET_ARCH="x64" ;;
  arm64) ASSET_ARCH="arm64" ;;
  *) echo "unsupported arch: $ARCH (want amd64|arm64)" >&2; exit 1 ;;
esac
DEB_ARCH="$ARCH"
if [ "$ARCH" = "amd64" ]; then
  RPM_ARCH="x86_64"
else
  RPM_ARCH="aarch64"
fi

# --- System dependencies (idempotent; safe to re-run). Requires sudo.
# Install webkit2gtk if neither 4.0 nor 4.1 is present.
if ! pkg-config --exists webkit2gtk-4.0 2>/dev/null && ! pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
  echo "Installing webkit2gtk dependencies (requires sudo)..."
  sudo apt-get update
  sudo apt-get install -y \
    libgtk-3-dev libwebkit2gtk-4.0-dev \
    libayatana-appindicator3-dev librsvg2-dev
fi
# ruby + python3-pil are needed for fpm and icon generation regardless of
# webkit2gtk installation status — install them unconditionally if missing.
command -v ruby >/dev/null 2>&1 || sudo apt-get install -y ruby ruby-dev
command -v fpm >/dev/null 2>&1 || sudo gem install fpm
python3 -c "from PIL import Image" 2>/dev/null || sudo apt-get install -y python3-pil

# --- Bump about.json so the binary reports the correct version to CheckUpdate.
jq --arg v "$VERSION" '.version = $v' about.json > about.json.tmp && mv about.json.tmp about.json
echo "about.json version bumped to $VERSION"

# --- Download static FFmpeg binaries (bundled into .deb/.rpm under /usr/lib/fforge).
case "$ARCH" in
  amd64) FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz" ;;
  arm64) FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz" ;;
esac
curl -fL "$FFMPEG_URL" -o /tmp/ffmpeg.tar.xz || { echo "ERROR: failed to download FFmpeg" >&2; exit 1; }
mkdir -p /tmp/ffmpeg_extract
tar -xf /tmp/ffmpeg.tar.xz -C /tmp/ffmpeg_extract
FFMPEG_BIN=$(find /tmp/ffmpeg_extract -type f -name ffmpeg -path '*/bin/*' | head -1)
FFPROBE_BIN=$(find /tmp/ffmpeg_extract -type f -name ffprobe -path '*/bin/*' | head -1)
echo "FFmpeg: $(ls -la "$FFMPEG_BIN" "$FFPROBE_BIN")"

# --- Build the bare binary (self-update asset; ships WITHOUT ffmpeg).
# Auto-detect webkit2gtk version: Wails v2 supports 4.1 via -tags webkit2_41.
WAILS_TAGS=""
if pkg-config --exists webkit2gtk-4.1 2>/dev/null && ! pkg-config --exists webkit2gtk-4.0 2>/dev/null; then
  WAILS_TAGS="-tags webkit2_41"
fi
wails build $WAILS_TAGS -platform "linux/$ARCH" -o fforge
if [ -f "build/bin/fforge-$ARCH" ] && [ ! -f "build/bin/fforge" ]; then
  mv "build/bin/fforge-$ARCH" "build/bin/fforge"
fi
ASSET_NAME="fforge-${VERSION}-linux-${ASSET_ARCH}"
mv "build/bin/fforge" "build/bin/${ASSET_NAME}"

# --- Build .deb and .rpm with a .desktop entry + hicolor icons + the bundled
# FFmpeg under /usr/lib/fforge so the app resolves them at runtime.
DEB_NAME="fforge-${VERSION}-linux-${ASSET_ARCH}.deb"
RPM_NAME="fforge-${VERSION}-linux-${ASSET_ARCH}.rpm"
# Sanitize version for fpm: Debian uses ~ for pre-release suffixes, RPM rejects
# hyphens in the version field. Replace '-' with '~' (e.g. 1.2.0-rc1 -> 1.2.0~rc1).
FPM_VERSION="${VERSION/-/\~}"
STAGING="$(mktemp -d)"
mkdir -p "$STAGING/share/applications"
mkdir -p "$STAGING/lib/fforge"
cat > "$STAGING/share/applications/fforge.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=fforge
Comment=Cross-platform FFmpeg desktop GUI
Exec=/usr/bin/fforge
Icon=fforge
Terminal=false
Categories=AudioVideo;Video;
DESKTOP
cp "$FFMPEG_BIN" "$STAGING/lib/fforge/ffmpeg"
cp "$FFPROBE_BIN" "$STAGING/lib/fforge/ffprobe"
chmod +x "$STAGING/lib/fforge/ffmpeg" "$STAGING/lib/fforge/ffprobe"

# --- hicolor icons so the .desktop Icon=fforge resolves in application launchers.
SRC_ICON="build/appicon.png"
for sz in 16 32 48 64 128 256 512; do
  d="$STAGING/share/icons/hicolor/${sz}x${sz}/apps"
  mkdir -p "$d"
  python3 -c "from PIL import Image; Image.open('$SRC_ICON').resize(($sz,$sz), Image.LANCZOS).save('$d/fforge.png')"
done

fpm -s dir -t deb \
  -n fforge -v "${FPM_VERSION}" -a "${DEB_ARCH}" \
  --depends libgtk-3-0 \
  --depends libwebkit2gtk-4.0-37 \
  --depends libayatana-appindicator3-1 \
  --depends librsvg2-2 \
  --description "fforge - FFmpeg desktop GUI" \
  -p "build/bin/${DEB_NAME}" \
  "build/bin/${ASSET_NAME}=/usr/bin/fforge" \
  "$STAGING/share/=/usr/share/" \
  "$STAGING/lib/=/usr/lib/"

fpm -s dir -t rpm \
  -n fforge -v "${FPM_VERSION}" -a "${RPM_ARCH}" \
  --depends gtk3 \
  --depends webkit2gtk3 \
  --depends libayatana-appindicator3 \
  --depends librsvg2 \
  --description "fforge - FFmpeg desktop GUI" \
  -p "build/bin/${RPM_NAME}" \
  "build/bin/${ASSET_NAME}=/usr/bin/fforge" \
  "$STAGING/share/=/usr/share/" \
  "$STAGING/lib/=/usr/lib/"

echo
echo "Built:"
echo "  build/bin/${ASSET_NAME}"
echo "  build/bin/${DEB_NAME}"
echo "  build/bin/${RPM_NAME}"
