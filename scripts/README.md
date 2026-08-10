# Scripts / 打包脚本

> Bilingual docs (English / 中文) for local packaging and building.
> 双语文档，指导本地打包构建。

---

## Overview / 概览

These scripts build and package fforge for each platform. They are shared
between CI (`build.yml`) and local builds — the same script produces identical
artifacts in both environments. Each script downloads FFmpeg, bumps
`about.json`, builds via Wails, and renames to the final asset names.

这些脚本为各平台构建和打包 fforge。CI（`build.yml`）和本地构建共用同一套脚本——同一脚本在两边产出一致的产物。每个脚本会下载 FFmpeg、bump `about.json`、用 Wails 构建、并重命名为最终产物名。

| Script / 脚本 | Platform / 平台 | Output / 产物 |
|---|---|---|
| `build-windows.sh` | Windows (amd64/arm64) | bare `.exe` + NSIS installer `.exe` |
| `build-macos.sh` | macOS (amd64/arm64) | `.dmg` + `.bin` (self-update) |
| `build-macos-local.sh` | macOS (local MDM build) | same as above, with `-skipbindings` |
| `build-linux.sh` | Linux (amd64/arm64) | bare binary + `.deb` + `.rpm` |
| `run-first-installed-local-mac.sh` | macOS (post-install fix) | strips sig + re-stamps quarantine |

Asset naming: `fforge-<version>-<os>-<x64|arm64><ext>` — the same pattern the
in-app updater's `matchPlatformAsset` / `matchPlatformInstallerAsset` selects on.
产物命名：`fforge-<version>-<os>-<x64|arm64><ext>`——与应用内更新器的 `matchPlatformAsset` / `matchPlatformInstallerAsset` 选择规则一致。

---

## Prerequisites / 前置条件

### All platforms / 所有平台
- **Go 1.25+** — `go version`
- **Node.js 20+** — `node --version`（Tailwind v4 的 oxide native binding 需要 Node ≥ 20）
- **Wails CLI** — `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- **jq** — for version bumping in `about.json`

### Windows
- **NSIS** — for the installer (`makensis`). Download from https://nsis.sourceforge.io. Add to PATH.

### macOS
- **create-dmg** — `brew install create-dmg`（脚本缺失时自动安装）
- **Pillow** — `pip3 install Pillow`（DMG 背景图；脚本自动装）
- **Xcode Command Line Tools** — for `codesign`, `sips`, `iconutil`, `hdiutil`

### Linux
- **GTK + WebKit2GTK** — `sudo apt-get install libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev`
- **fpm** — `sudo gem install fpm`（.deb/.rpm 打包；脚本缺失时自动装）
- **python3-pil** — icon resizing（脚本自动装系统依赖时包含）

---

## Usage / 用法

```bash
# Windows (from Git Bash):
./scripts/build-windows.sh <version> [arch]      # e.g. 1.2.0 amd64

# macOS:
./scripts/build-macos.sh <version> [arch]         # standard (regenerates bindings)
./scripts/build-macos-local.sh <version> [arch]  # local MDM Mac (skips bindings)

# Linux:
./scripts/build-linux.sh <version> [arch]         # e.g. 1.2.0 amd64
```

- `arch` defaults to `$(go env GOARCH)` (usually `amd64`).
- Windows arm64 can be cross-compiled on an amd64 machine (CGO-free).
- Linux ARM64 cannot be cross-compiled (Wails links webkit2gtk via CGO) — run on a native arm64 host.

---

## CI vs Local / CI 与本地

| | CI (`build.yml`) | Local (these scripts) |
|---|---|---|
| Runner | GitHub-hosted (Win/macOS/Linux) | Your machine |
| Proxy | Not needed (runners are outside the GFW) | Required on Windows behind the GFW (`HTTPS_PROXY=http://127.0.0.1:7890`) |
| Script | Same (`scripts/build-*.sh`) | Same |
| Output | Identical artifacts | Identical artifacts |

CI 和本地构建用**同一套脚本**，产物逐字节一致。唯一区别：CI runner 不需要代理（在 GFW 外），本地 Windows 需要 Clash 代理。

## macOS first-launch / macOS 首次启动

The DMG bundles an **unsigned** `.app` (the build strips Wails' ad-hoc signature
so it launches under Gatekeeper instead of being "damaged" + SIGKILL'd on strict
MDM). After dragging to /Applications, launch it via **right-click → Open →
"Open"** (the Gatekeeper bypass for unsigned apps) — shown on the DMG background
in red. Do NOT use `xattr -cr` (it strips quarantine and routes MDM users back to
the provenance path that kills unsigned binaries).

For a **locally-built** DMG under MDM that still won't launch, run the
first-launch fix (strips signatures + re-stamps a clean quarantine so it routes
through Gatekeeper's right-click → Open bypass):
```bash
chmod +x scripts/run-first-installed-local-mac.sh
./scripts/run-first-installed-local-mac.sh   # after dragging fforge to /Applications
```

DMG 里是**未签名**的 `.app`（构建时扒掉了 Wails 的 ad-hoc 签名，走 Gatekeeper 而不是在严格 MDM 下"已损坏"/SIGKILL）。拖到 /Applications 后用**右键 → 打开 → "打开"**启动（未签名应用的 Gatekeeper 旁路，DMG 背景红字有写）。**不要用 `xattr -cr`**（扒掉 quarantine → provenance 路径 → 杀掉未签名二进制）。

**本地构建**的 DMG 在 MDM 下仍启动不了时，跑首次启动修复脚本（扒签名 + 重打干净 quarantine → 走右键打开旁路）：
`./scripts/run-first-installed-local-mac.sh`（先把 fforge 拖到 /Applications）。
