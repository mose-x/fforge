package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"runtime"
	"strings"
	"time"

	"fforge/internal/downloader"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// AppInfo is the application metadata embedded via about.json.
type AppInfo struct {
	Version   string `json:"version"`
	GoVersion string `json:"goVersion"`
	License   string `json:"license"`
	RepoURL   string `json:"repoUrl"`
	UpdateURL string `json:"updateUrl"`
}

// GitHubRelease models the relevant fields of a GitHub Releases API response.
type GitHubRelease struct {
	TagName string        `json:"tag_name"`
	Body    string        `json:"body"`
	Assets  []GitHubAsset `json:"assets"`
}

type GitHubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

// UpdateInfo is returned to the frontend describing an available update.
//
// For minor/patch updates (same major version), HasUpdate is true and
// DownloadURL/Filename/Sha256 point at the bare self-update binary.
//
// For a major-version bump, ManualInstall is true and InstallerURL/
// InstallerFilename point at the platform installer (NSIS / DMG / .deb),
// while DownloadURL is empty — the user downloads and runs the installer
// manually; it also refreshes the bundled FFmpeg.
type UpdateInfo struct {
	HasUpdate         bool   `json:"hasUpdate"`
	LatestVersion     string `json:"latestVersion"`
	Changelog         string `json:"changelog"`
	DownloadURL       string `json:"downloadUrl"`
	Filename          string `json:"filename"`
	Sha256            string `json:"sha256"`
	ManualInstall     bool   `json:"manualInstall"`
	InstallerURL      string `json:"installerUrl"`
	InstallerFilename string `json:"installerFilename"`
}

// UpdateProgress is emitted via Wails events during download.
type UpdateProgress struct {
	Stage            string `json:"stage"`
	Percent          int    `json:"percent"`
	DownloadedBytes  int64  `json:"downloadedBytes"`
	TotalBytes       int64  `json:"totalBytes"`
	SpeedBytesPerSec int64  `json:"speedBytesPerSec"`
	Message          string `json:"message"`
}

func (a *App) loadAboutInfo() {
	if err := json.Unmarshal(aboutJSON, &a.appInfo); err != nil {
		a.appInfo = AppInfo{
			Version:   "0.1.0",
			GoVersion: "1.25",
			License:   "MIT License",
			RepoURL:   "https://github.com/mose-x/fforge",
			UpdateURL: "",
		}
	}
}

// GetAppInfo returns the embedded application metadata.
func (a *App) GetAppInfo() AppInfo {
	return a.appInfo
}

// stableVersionReg matches a pure X.Y.Z version (exactly three numeric
// components, digits + dots only, no pre-release suffix like -rc1/-beta).
// Only releases whose tag (minus the leading "v") matches are valid update
// targets; suffixed/pre-release tags are skipped so the updater never offers a
// non-stable build to users. This is the client-side guard; build.yml marks
// suffixed tags as GitHub pre-releases (excluded from /releases/latest) as the
// server-side guard.
var stableVersionReg = regexp.MustCompile(`^\d+\.\d+\.\d+$`)

// isStableVersion reports whether tag (with or without a leading "v") is a pure
// X.Y.Z stable release (no -rc/-beta/... suffix). Pure-logic, unit-tested.
func isStableVersion(tag string) bool {
	return stableVersionReg.MatchString(strings.TrimPrefix(tag, "v"))
}

// CheckUpdate queries the GitHub Releases API for a newer stable version. It
// uses the configured proxy (so it works behind the GFW), fetches the releases
// LIST (newest first) and skips any tag that isn't a pure X.Y.Z (so rc/beta
// tags are never offered), then delegates the per-platform decision to
// decideUpdate (network-free, unit-tested across all platform combos).
func (a *App) CheckUpdate() (UpdateInfo, error) {
	if a.appInfo.UpdateURL == "" {
		return UpdateInfo{}, fmt.Errorf("update URL is not configured")
	}

	client := downloader.BuildClient(a.getProxyConfig())
	client.Timeout = 15 * time.Second

	// Derive the releases-list URL by stripping the trailing "/latest" from
	// about.json's updateUrl (which ends in /latest) so no config change is
	// needed. per_page=30 is enough to find the newest stable even if a few
	// rc/beta releases were published in between.
	listURL := strings.TrimSuffix(a.appInfo.UpdateURL, "/latest")
	req, err := http.NewRequest(http.MethodGet, listURL, nil)
	if err != nil {
		return UpdateInfo{}, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "fforge")
	q := req.URL.Query()
	q.Set("per_page", "30")
	req.URL.RawQuery = q.Encode()

	resp, err := client.Do(req)
	if err != nil {
		return UpdateInfo{}, fmt.Errorf("network error, unable to reach update server: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return UpdateInfo{}, fmt.Errorf("update server returned status %d", resp.StatusCode)
	}

	var releases []GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return UpdateInfo{}, fmt.Errorf("failed to parse release info: %w", err)
	}

	// Pick the newest release whose tag is a pure X.Y.Z. Releases come back
	// newest-first, so the first match is the latest stable.
	var release *GitHubRelease
	for i := range releases {
		if isStableVersion(releases[i].TagName) {
			release = &releases[i]
			break
		}
	}
	if release == nil {
		// No pure-numeric release among the recent ones (e.g. only rc builds
		// published). Treat as "no stable update available" rather than an
		// error: the user is current with respect to stable releases.
		return UpdateInfo{HasUpdate: false}, nil
	}

	rel := *release
	return decideUpdate(a.appInfo.Version, rel, runtime.GOOS, runtime.GOARCH, func(name string) string {
		return fetchAssetSha256(client, rel.Assets, name)
	})
}

// decideUpdate computes the UpdateInfo for a parsed release, given the local
// version and platform. shaFor(filename) returns the SHA-256 for an asset (or
// "" if unknown) — injected so decideUpdate is network-free and unit-testable
// across all platform combos. This is the decision core of CheckUpdate:
//
//   - no update          -> HasUpdate=false
//   - minor/patch        -> bare self-update binary (DownloadURL/Filename/Sha256)
//   - major-version bump -> ManualInstall=true, platform installer
//     (InstallerURL/InstallerFilename), DownloadURL empty
func decideUpdate(localVersion string, release GitHubRelease, goos, goarch string, shaFor func(string) string) (UpdateInfo, error) {
	remoteVersion := strings.TrimPrefix(release.TagName, "v")
	if compareVersions(remoteVersion, localVersion) <= 0 {
		return UpdateInfo{HasUpdate: false, LatestVersion: remoteVersion}, nil
	}

	// Major-version bump: skip the bare-binary self-update. The new major
	// may bundle a different FFmpeg or carry breaking changes, so point the
	// user at the platform installer instead — they download and run it
	// manually, and the installer refreshes the bundled FFmpeg too.
	if majorVersion(remoteVersion) > majorVersion(localVersion) {
		inst, ok := matchPlatformInstallerAsset(release.Assets, goos, goarch)
		if !ok {
			return UpdateInfo{}, fmt.Errorf("major update v%s is available but no installer asset matches your platform (%s/%s); download it from the releases page", remoteVersion, goos, goarch)
		}
		return UpdateInfo{
			HasUpdate:         true,
			LatestVersion:     remoteVersion,
			Changelog:         release.Body,
			ManualInstall:     true,
			InstallerURL:      inst.BrowserDownloadURL,
			InstallerFilename: inst.Name,
			Sha256:            shaFor(inst.Name),
		}, nil
	}

	asset, ok := matchPlatformAsset(release.Assets, goos, goarch)
	if !ok {
		return UpdateInfo{}, fmt.Errorf("new version v%s is available but no download asset matches your platform (%s/%s)", remoteVersion, goos, goarch)
	}

	return UpdateInfo{
		HasUpdate:     true,
		LatestVersion: remoteVersion,
		Changelog:     release.Body,
		DownloadURL:   asset.BrowserDownloadURL,
		Filename:      asset.Name,
		Sha256:        shaFor(asset.Name),
	}, nil
}

// matchPlatformAsset picks the release asset for the given OS/arch — the
// bare self-update binary, not the installer. Asset names follow:
//
//	windows-x64.exe / windows-arm64.exe
//	macos-x64.bin   / macos-arm64.bin
//	linux-x64       / linux-arm64
//
// goos/goarch are parameters (not read from runtime) so all platform combos
// are unit-testable on any host.
func matchPlatformAsset(assets []GitHubAsset, goos, goarch string) (GitHubAsset, bool) {
	osToken := map[string]string{
		"windows": "windows",
		"darwin":  "macos",
		"linux":   "linux",
	}[goos]
	archToken := map[string]string{
		"amd64": "x64",
		"arm64": "arm64",
	}[goarch]
	if osToken == "" || archToken == "" {
		return GitHubAsset{}, false
	}
	for _, a := range assets {
		name := strings.ToLower(a.Name)
		if !strings.Contains(name, osToken) || !strings.Contains(name, archToken) {
			continue
		}
		// macOS self-update uses bare .bin, not .dmg
		if goos == "darwin" && strings.HasSuffix(name, ".dmg") {
			continue
		}
		// Linux self-update uses bare binary, not .deb/.rpm
		if goos == "linux" && (strings.HasSuffix(name, ".deb") || strings.HasSuffix(name, ".rpm")) {
			continue
		}
		// Windows self-update uses bare .exe, not the NSIS installer
		if goos == "windows" && strings.Contains(name, "installer") {
			continue
		}
		return a, true
	}
	return GitHubAsset{}, false
}

// matchPlatformInstallerAsset picks the platform installer asset — the
// inverse of matchPlatformAsset. Used for a major-version bump, where the
// user must manually download and run the full installer (which also
// refreshes the bundled FFmpeg). goos/goarch are parameters for testability.
//
//	windows: the NSIS installer (*-installer.exe)
//	macos:   the .dmg
//	linux:   the .deb (most common distros; .rpm users grab it from the
//	         release page)
func matchPlatformInstallerAsset(assets []GitHubAsset, goos, goarch string) (GitHubAsset, bool) {
	osToken := map[string]string{
		"windows": "windows",
		"darwin":  "macos",
		"linux":   "linux",
	}[goos]
	archToken := map[string]string{
		"amd64": "x64",
		"arm64": "arm64",
	}[goarch]
	if osToken == "" || archToken == "" {
		return GitHubAsset{}, false
	}
	for _, a := range assets {
		name := strings.ToLower(a.Name)
		if !strings.Contains(name, osToken) || !strings.Contains(name, archToken) {
			continue
		}
		switch goos {
		case "windows":
			if strings.HasSuffix(name, ".exe") && strings.Contains(name, "installer") {
				return a, true
			}
		case "darwin":
			if strings.HasSuffix(name, ".dmg") {
				return a, true
			}
		case "linux":
			if strings.HasSuffix(name, ".deb") {
				return a, true
			}
		}
	}
	return GitHubAsset{}, false
}

// majorVersion parses the leading numeric segment of a version string
// (with or without a leading "v"). Returns 0 on parse failure.
func majorVersion(v string) int {
	v = strings.TrimPrefix(v, "v")
	first := strings.SplitN(v, ".", 2)[0]
	var n int
	if _, err := fmt.Sscanf(first, "%d", &n); err != nil {
		return 0
	}
	return n
}

// fetchAssetSha256 downloads sha256sums.txt (via the proxy-aware client) and
// returns the hash recorded for filename. Empty string if the manifest is
// missing or the file isn't listed — DownloadUpdate then skips verification.
func fetchAssetSha256(client *http.Client, assets []GitHubAsset, filename string) string {
	var sumsURL string
	for _, a := range assets {
		if a.Name == "sha256sums.txt" {
			sumsURL = a.BrowserDownloadURL
			break
		}
	}
	if sumsURL == "" {
		return ""
	}
	resp, err := client.Get(sumsURL)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}
	return parseSha256Sum(string(body), filename)
}

// parseSha256Sum extracts the SHA-256 hash for filename from a sha256sums.txt
// body (lines of "<hash>  <filename>"). Returns "" if not found. Pure (no
// I/O) so it's unit-testable.
func parseSha256Sum(body, filename string) string {
	for _, line := range strings.Split(body, "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[1] == filename {
			return fields[0]
		}
	}
	return ""
}

// DownloadUpdate fetches the new binary to a temp path through the configured
// proxy (+ GitHub mirror) via the multi-threaded downloader, then verifies
// the SHA-256 if one was published. The downloader closes the file before
// returning, so a failed SHA check can os.Remove it (Windows can't delete an
// open file).
func (a *App) DownloadUpdate(downloadURL, expectedSha256 string) error {
	if downloadURL == "" {
		return fmt.Errorf("download URL is empty")
	}
	downloadURL = a.applyGithubMirror(downloadURL)

	tmpPath := getUpdateFilePath()
	os.Remove(tmpPath)

	proxyCfg := a.getProxyConfig()
	threads := a.settings.Get().DownloadThreads
	if threads <= 0 {
		threads = 4
	}

	err := a.downloader.Download(a.ctx, downloadURL, tmpPath, func(downloaded, total, speed int64) {
		percent := 0
		if total > 0 {
			percent = int(downloaded * 100 / total)
		}
		msg := "Downloading..."
		if total > 0 {
			msg = fmt.Sprintf("Downloading %.1fMB / %.1fMB", float64(downloaded)/(1024*1024), float64(total)/(1024*1024))
		}
		a.emitUpdateProgress(UpdateProgress{
			Stage:            "downloading",
			Percent:          percent,
			DownloadedBytes:  downloaded,
			TotalBytes:       total,
			SpeedBytesPerSec: speed,
			Message:          msg,
		})
	}, proxyCfg, threads)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	a.emitUpdateProgress(UpdateProgress{Stage: "verifying", Percent: 100, Message: "Verifying integrity..."})

	if expectedSha256 != "" {
		actual, err := sha256OfFile(tmpPath)
		if err != nil {
			os.Remove(tmpPath)
			return fmt.Errorf("failed to hash downloaded file: %w", err)
		}
		if actual != expectedSha256 {
			os.Remove(tmpPath)
			return fmt.Errorf("integrity check failed: expected %s, got %s", expectedSha256, actual)
		}
	}

	a.emitUpdateProgress(UpdateProgress{Stage: "done", Percent: 100, Message: "Download complete"})
	return nil
}

func sha256OfFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func (a *App) emitUpdateProgress(p UpdateProgress) {
	if a.ctx != nil {
		wailsRuntime.EventsEmit(a.ctx, "update:progress", p)
	}
}

// compareVersions returns 1 if a > b, -1 if a < b, 0 if equal.
func compareVersions(a, b string) int {
	pa := strings.Split(a, ".")
	pb := strings.Split(b, ".")
	maxLen := len(pa)
	if len(pb) > maxLen {
		maxLen = len(pb)
	}
	for i := 0; i < maxLen; i++ {
		var na, nb int
		if i < len(pa) {
			fmt.Sscanf(pa[i], "%d", &na)
		}
		if i < len(pb) {
			fmt.Sscanf(pb[i], "%d", &nb)
		}
		if na > nb {
			return 1
		}
		if na < nb {
			return -1
		}
	}
	return 0
}
