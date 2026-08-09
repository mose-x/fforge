#!/usr/bin/env bash
# Local MDM-Mac build wrapper for fforge. Sets FFORGE_SKIP_BINDINGS=1 so
# scripts/build-macos.sh passes -skipbindings to wails build, avoiding the
# ad-hoc-signed binding-generator binary that amfid kills under strict MDM.
#
# Usage:   ./scripts/build-macos-local.sh <version> [arch]
#
# Caveat: relies on the committed frontend/wailsjs/ bindings being current.
# Before changing Go App methods exposed to the frontend, run a non-skip
# `wails build` (on a non-MDM machine or CI) to regenerate + commit the
# bindings, otherwise this script builds against stale bindings.
#
# Run on macOS only.
set -euo pipefail
exec env FFORGE_SKIP_BINDINGS=1 "$(dirname "$0")/build-macos.sh" "$@"
