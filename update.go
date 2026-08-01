package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"

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

// GitHubRelease models the relevant fields of the GitHub Releases API
// response (GET /repos/{owner}/{repo}/releases/latest).
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
type UpdateInfo struct {
	HasUpdate     bool   `json:"hasUpdate"`
	LatestVersion string `json:"latestVersion"`
	Changelog     string `json:"changelog"`
	DownloadURL   string `json:"downloadUrl"`
	Filename      string `json:"filename"`
	Sha256        string `json:"sha256"`
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

// CheckUpdate queries the GitHub Releases API for a newer version.
func (a *App) CheckUpdate() (UpdateInfo, error) {
	if a.appInfo.UpdateURL == "" {
		return UpdateInfo{}, fmt.Errorf("update URL is not configured")
	}

	client := &http.Client{Timeout: 15 * time.Second}

	req, err := http.NewRequest(http.MethodGet, a.appInfo.UpdateURL, nil)
	if err != nil {
		return UpdateInfo{}, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "fforge")

	resp, err := client.Do(req)
	if err != nil {
		return UpdateInfo{}, fmt.Errorf("network error, unable to reach update server: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return UpdateInfo{}, fmt.Errorf("update server returned status %d", resp.StatusCode)
	}

	var release GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return UpdateInfo{}, fmt.Errorf("failed to parse release info: %w", err)
	}

	remoteVersion := strings.TrimPrefix(release.TagName, "v")
	hasUpdate := compareVersions(remoteVersion, a.appInfo.Version) > 0

	if !hasUpdate {
		return UpdateInfo{HasUpdate: false, LatestVersion: remoteVersion}, nil
	}

	asset, ok := matchPlatformAsset(release.Assets)
	if !ok {
		return UpdateInfo{}, fmt.Errorf("new version v%s is available but no download asset matches your platform (%s/%s)", remoteVersion, runtime.GOOS, runtime.GOARCH)
	}

	sha := fetchAssetSha256(client, release.Assets, asset.Name)

	return UpdateInfo{
		HasUpdate:     true,
		LatestVersion: remoteVersion,
		Changelog:     release.Body,
		DownloadURL:   asset.BrowserDownloadURL,
		Filename:      asset.Name,
		Sha256:        sha,
	}, nil
}

// matchPlatformAsset picks the release asset for the current OS/arch.
// Asset names follow: fforge-<ver>-<os>-<arch><ext>
//
//	windows-x64.exe / windows-arm64.exe
//	macos-x64.bin   / macos-arm64.bin
//	linux-x64       / linux-arm64
func matchPlatformAsset(assets []GitHubAsset) (GitHubAsset, bool) {
	osToken := map[string]string{
		"windows": "windows",
		"darwin":  "macos",
		"linux":   "linux",
	}[runtime.GOOS]
	archToken := map[string]string{
		"amd64": "x64",
		"arm64": "arm64",
	}[runtime.GOARCH]
	if osToken == "" || archToken == "" {
		return GitHubAsset{}, false
	}
	for _, a := range assets {
		name := strings.ToLower(a.Name)
		if !strings.Contains(name, osToken) || !strings.Contains(name, archToken) {
			continue
		}
		// macOS self-update uses bare .bin, not .dmg
		if runtime.GOOS == "darwin" && strings.HasSuffix(name, ".dmg") {
			continue
		}
		// Linux self-update uses bare binary, not .deb/.rpm
		if runtime.GOOS == "linux" && (strings.HasSuffix(name, ".deb") || strings.HasSuffix(name, ".rpm")) {
			continue
		}
		// Windows self-update uses bare .exe, not .zip (install bundle)
		if runtime.GOOS == "windows" && strings.HasSuffix(name, ".zip") {
			continue
		}
		return a, true
	}
	return GitHubAsset{}, false
}

// fetchAssetSha256 downloads sha256sums.txt and returns the hash for filename.
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
	for _, line := range strings.Split(string(body), "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[1] == filename {
			return fields[0]
		}
	}
	return ""
}

// DownloadUpdate fetches the new binary to a temp path and verifies SHA256.
func (a *App) DownloadUpdate(downloadURL, expectedSha256 string) error {
	if downloadURL == "" {
		return fmt.Errorf("download URL is empty")
	}

	tmpPath := getUpdateFilePath()
	os.Remove(tmpPath)

	resp, err := http.Get(downloadURL)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download server returned status %d", resp.StatusCode)
	}

	total := resp.ContentLength
	out, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer out.Close()

	buf := make([]byte, 32*1024)
	var downloaded int64
	lastEmit := time.Now()
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := out.Write(buf[:n]); werr != nil {
				return fmt.Errorf("write failed: %w", werr)
			}
			downloaded += int64(n)
			if time.Since(lastEmit) > 200*time.Millisecond {
				percent := 0
				if total > 0 {
					percent = int(downloaded * 100 / total)
				}
				msg := "Downloading..."
				if total > 0 {
					msg = fmt.Sprintf("Downloading %.1fMB / %.1fMB", float64(downloaded)/(1024*1024), float64(total)/(1024*1024))
				}
				a.emitUpdateProgress(UpdateProgress{
					Stage:           "downloading",
					Percent:         percent,
					DownloadedBytes: downloaded,
					TotalBytes:      total,
					Message:         msg,
				})
				lastEmit = time.Now()
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return fmt.Errorf("download read error: %w", readErr)
		}
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
