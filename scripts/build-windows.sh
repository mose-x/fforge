#!/usr/bin/env bash
# Build the Windows bare .exe (self-update) + NSIS installer for fforge.
#
# Usage:   ./scripts/build-windows.sh <version> [arch]
#   version:  release version, e.g. 1.2.0
#   arch:     amd64 | arm64  (default: native GOARCH)
#
# Produces in build/bin/:
#   fforge-<ver>-windows-<x64|arm64>.exe             (self-update bare binary)
#   fforge-<ver>-windows-<x64|arm64>-installer.exe   (NSIS first-install, bundles FFmpeg)
#
# Prereqs: Go 1.25+, Node 20+, Wails CLI, jq, NSIS (makensis).
# Wails Windows builds are CGO-free (WebView2 loaded at runtime via COM), so
# arm64 can be cross-compiled on an amd64 host.
#
# This script is the single source of truth for the Windows packaging steps;
# .github/workflows/build.yml calls it so CI and local builds produce identical
# artifacts. Run from Git Bash on Windows (the CI uses bash on windows-latest).
set -euo pipefail

VERSION="${1:?version required, e.g. 1.2.0}"
ARCH="${2:-$(go env GOARCH)}"
case "$ARCH" in
  amd64) ASSET_ARCH="x64" ;;
  arm64) ASSET_ARCH="arm64" ;;
  *) echo "unsupported arch: $ARCH (want amd64|arm64)" >&2; exit 1 ;;
esac

# --- Bump about.json so the binary reports the correct version to CheckUpdate.
jq --arg v "$VERSION" '.version = $v' about.json > about.json.tmp && mv about.json.tmp about.json
echo "about.json version bumped to $VERSION"

# --- Download static FFmpeg binaries (bundled into the NSIS installer; the bare
# self-update .exe ships WITHOUT ffmpeg so ApplyUpdate swaps only the app).
case "$ARCH" in
  amd64) FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" ;;
  arm64) FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-winarm64-gpl.zip" ;;
esac
curl -L "$FFMPEG_URL" -o /tmp/ffmpeg.zip
mkdir -p /tmp/ffmpeg_extract
unzip -o /tmp/ffmpeg.zip -d /tmp/ffmpeg_extract >/dev/null
FFMPEG_BIN=$(find /tmp/ffmpeg_extract -name ffmpeg.exe -path '*/bin/*' | head -1)
FFPROBE_BIN=$(find /tmp/ffmpeg_extract -name ffprobe.exe -path '*/bin/*' | head -1)
mkdir -p build/bin
cp "$FFMPEG_BIN" build/bin/ffmpeg.exe
cp "$FFPROBE_BIN" build/bin/ffprobe.exe
echo "FFmpeg downloaded: $(ls -la build/bin/ffmpeg.exe build/bin/ffprobe.exe)"

# --- Build the bare .exe (self-update asset; CGO-free).
wails build -nopackage -platform "windows/$ARCH" -o fforge.exe
# Wails appends the arch suffix when cross-compiling; normalize to the plain
# name first, then rename to the final asset name so amd64/arm64 don't clobber.
if [ -f "build/bin/fforge-$ARCH.exe" ] && [ ! -f "build/bin/fforge.exe" ]; then
  mv "build/bin/fforge-$ARCH.exe" "build/bin/fforge.exe"
fi
ASSET_NAME="fforge-${VERSION}-windows-${ASSET_ARCH}.exe"
mv "build/bin/fforge.exe" "build/bin/${ASSET_NAME}"

# --- Build the NSIS installer (first-install; bundles ffmpeg + ffprobe + the
# bare exe). makensis must be on PATH; on CI the build.yml "Setup NSIS" step
# adds it. Locally, install NSIS and ensure makensis is on PATH.
INSTALLER_NAME="fforge-${VERSION}-windows-${ASSET_ARCH}-installer.exe"
# MSYS_NO_PATHCONV=1 stops Git Bash from mangling makensis /D flags into Unix
# paths (e.g. /DVERSION -> D:/VERSION). CI sets it in the step env; set it here
# so local Git Bash runs match CI.
SRCDIR="$(pwd)/build/bin"
MSYS_NO_PATHCONV=1 makensis \
  /DVERSION="${VERSION}" /DASSET_ARCH="${ASSET_ARCH}" /DSRCDIR="${SRCDIR}" \
  build/windows/installer.nsi
mv "build/bin/${INSTALLER_NAME}" "build/bin/${INSTALLER_NAME}" 2>/dev/null || true

echo
echo "Built:"
echo "  build/bin/${ASSET_NAME}"
echo "  build/bin/${INSTALLER_NAME}"
