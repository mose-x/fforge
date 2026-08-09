package main

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// fullTestAssets is a complete release asset list (both arches, bare binary
// + platform installer + sha256sums) mirroring what build.yml produces.
func fullTestAssets() []GitHubAsset {
	return []GitHubAsset{
		{Name: "fforge-1.2.0-windows-x64.exe", BrowserDownloadURL: "u/win-x64-bare"},
		{Name: "fforge-1.2.0-windows-x64-installer.exe", BrowserDownloadURL: "u/win-x64-inst"},
		{Name: "fforge-1.2.0-windows-arm64.exe", BrowserDownloadURL: "u/win-arm-bare"},
		{Name: "fforge-1.2.0-windows-arm64-installer.exe", BrowserDownloadURL: "u/win-arm-inst"},
		{Name: "fforge-1.2.0-macos-x64.bin", BrowserDownloadURL: "u/mac-x64-bare"},
		{Name: "fforge-1.2.0-macos-x64.dmg", BrowserDownloadURL: "u/mac-x64-dmg"},
		{Name: "fforge-1.2.0-macos-arm64.bin", BrowserDownloadURL: "u/mac-arm-bare"},
		{Name: "fforge-1.2.0-macos-arm64.dmg", BrowserDownloadURL: "u/mac-arm-dmg"},
		{Name: "fforge-1.2.0-linux-x64", BrowserDownloadURL: "u/lin-x64-bare"},
		{Name: "fforge-1.2.0-linux-x64.deb", BrowserDownloadURL: "u/lin-x64-deb"},
		{Name: "fforge-1.2.0-linux-x64.rpm", BrowserDownloadURL: "u/lin-x64-rpm"},
		{Name: "fforge-1.2.0-linux-arm64", BrowserDownloadURL: "u/lin-arm-bare"},
		{Name: "fforge-1.2.0-linux-arm64.deb", BrowserDownloadURL: "u/lin-arm-deb"},
		{Name: "fforge-1.2.0-linux-arm64.rpm", BrowserDownloadURL: "u/lin-arm-rpm"},
		{Name: "sha256sums.txt", BrowserDownloadURL: "u/sums"},
	}
}

func sha256hex(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func TestCompareVersions(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"1.0.0", "1.0.0", 0},
		{"1.1.0", "1.0.0", 1},
		{"1.0.0", "1.1.0", -1},
		{"2.0.0", "1.9.9", 1},
		// numeric (not lexical) ordering: 10 > 9
		{"1.10.0", "1.9.0", 1},
		// differing segment count
		{"1.0.0", "1.0", 0},
		{"0.9.0", "1.0.0", -1},
	}
	for _, c := range cases {
		if got := compareVersions(c.a, c.b); got != c.want {
			t.Errorf("compareVersions(%q, %q) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestMajorVersion(t *testing.T) {
	cases := []struct {
		in   string
		want int
	}{
		{"1.0.0", 1},
		{"v1.2.3", 1},
		{"2.0.0", 2},
		{"10.3.0", 10},
		{"v0.1.0", 0},
		{"garbage", 0},
		{"", 0},
	}
	for _, c := range cases {
		if got := majorVersion(c.in); got != c.want {
			t.Errorf("majorVersion(%q) = %d, want %d", c.in, got, c.want)
		}
	}
}

func TestMatchPlatformAsset(t *testing.T) {
	assets := fullTestAssets()
	cases := []struct {
		goos, goarch, want string
	}{
		{"windows", "amd64", "fforge-1.2.0-windows-x64.exe"},
		{"windows", "arm64", "fforge-1.2.0-windows-arm64.exe"},
		{"darwin", "amd64", "fforge-1.2.0-macos-x64.bin"},
		{"darwin", "arm64", "fforge-1.2.0-macos-arm64.bin"},
		{"linux", "amd64", "fforge-1.2.0-linux-x64"},
		{"linux", "arm64", "fforge-1.2.0-linux-arm64"},
	}
	for _, c := range cases {
		got, ok := matchPlatformAsset(assets, c.goos, c.goarch)
		if !ok {
			t.Errorf("matchPlatformAsset(%s,%s) = not found, want %q", c.goos, c.goarch, c.want)
			continue
		}
		if got.Name != c.want {
			t.Errorf("matchPlatformAsset(%s,%s) = %q, want %q", c.goos, c.goarch, got.Name, c.want)
		}
	}
	// unsupported OS -> not found
	if _, ok := matchPlatformAsset(assets, "freebsd", "amd64"); ok {
		t.Error("expected not found for unsupported OS freebsd")
	}
	// installer must NOT be picked as the bare bin
	if a, ok := matchPlatformAsset(assets, "windows", "amd64"); ok && a.Name == "fforge-1.2.0-windows-x64-installer.exe" {
		t.Error("matchPlatformAsset picked the installer instead of the bare .exe")
	}
}

func TestMatchPlatformInstallerAsset(t *testing.T) {
	assets := fullTestAssets()
	cases := []struct {
		goos, goarch, want string
	}{
		{"windows", "amd64", "fforge-1.2.0-windows-x64-installer.exe"},
		{"windows", "arm64", "fforge-1.2.0-windows-arm64-installer.exe"},
		{"darwin", "amd64", "fforge-1.2.0-macos-x64.dmg"},
		{"darwin", "arm64", "fforge-1.2.0-macos-arm64.dmg"},
		{"linux", "amd64", "fforge-1.2.0-linux-x64.deb"},
		{"linux", "arm64", "fforge-1.2.0-linux-arm64.deb"},
	}
	for _, c := range cases {
		got, ok := matchPlatformInstallerAsset(assets, c.goos, c.goarch)
		if !ok {
			t.Errorf("matchPlatformInstallerAsset(%s,%s) = not found, want %q", c.goos, c.goarch, c.want)
			continue
		}
		if got.Name != c.want {
			t.Errorf("matchPlatformInstallerAsset(%s,%s) = %q, want %q", c.goos, c.goarch, got.Name, c.want)
		}
	}
	// bare .exe must NOT be picked as the windows installer
	if a, ok := matchPlatformInstallerAsset(assets, "windows", "amd64"); ok && a.Name == "fforge-1.2.0-windows-x64.exe" {
		t.Error("matchPlatformInstallerAsset picked the bare .exe instead of the installer")
	}
	// .rpm must NOT be picked for linux (deb is the default)
	if a, ok := matchPlatformInstallerAsset(assets, "linux", "amd64"); ok && a.Name == "fforge-1.2.0-linux-x64.rpm" {
		t.Error("matchPlatformInstallerAsset picked .rpm instead of .deb")
	}
}

func TestParseSha256Sum(t *testing.T) {
	body := "abc123  fforge-1.2.0-windows-x64.exe\ndef456  fforge-1.2.0-macos-x64.bin\n\n"
	if got := parseSha256Sum(body, "fforge-1.2.0-macos-x64.bin"); got != "def456" {
		t.Errorf("parseSha256Sum macos = %q, want def456", got)
	}
	if got := parseSha256Sum(body, "fforge-1.2.0-windows-x64.exe"); got != "abc123" {
		t.Errorf("parseSha256Sum windows = %q, want abc123", got)
	}
	if got := parseSha256Sum(body, "missing.bin"); got != "" {
		t.Errorf("parseSha256Sum missing = %q, want empty", got)
	}
}

func TestSha256OfFile(t *testing.T) {
	f := filepath.Join(t.TempDir(), "blob")
	if err := os.WriteFile(f, []byte("fforge"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := sha256OfFile(f)
	if err != nil {
		t.Fatal(err)
	}
	if want := sha256hex([]byte("fforge")); got != want {
		t.Errorf("sha256OfFile = %q, want %q", got, want)
	}
}

func TestDecideUpdate(t *testing.T) {
	assets := fullTestAssets()
	shaFor := func(name string) string { return "sha:" + name }
	releaseMinor := GitHubRelease{TagName: "v1.2.0", Body: "minor release", Assets: assets}
	releaseMajor := GitHubRelease{TagName: "v2.0.0", Body: "major release", Assets: assets}

	// No update: remote == local.
	if info, err := decideUpdate("1.2.0", releaseMinor, "windows", "amd64", shaFor); err != nil || info.HasUpdate {
		t.Fatalf("no-update: hasUpdate=%v err=%v", info.HasUpdate, err)
	}

	// No update: remote older than local.
	if info, _ := decideUpdate("1.3.0", releaseMinor, "linux", "arm64", shaFor); info.HasUpdate {
		t.Errorf("older remote: hasUpdate=true, want false")
	}

	// Minor/patch -> bare self-update binary, all 6 platforms.
	bareCases := []struct {
		goos, goarch, want string
	}{
		{"windows", "amd64", "fforge-1.2.0-windows-x64.exe"},
		{"windows", "arm64", "fforge-1.2.0-windows-arm64.exe"},
		{"darwin", "amd64", "fforge-1.2.0-macos-x64.bin"},
		{"darwin", "arm64", "fforge-1.2.0-macos-arm64.bin"},
		{"linux", "amd64", "fforge-1.2.0-linux-x64"},
		{"linux", "arm64", "fforge-1.2.0-linux-arm64"},
	}
	for _, c := range bareCases {
		info, err := decideUpdate("1.0.0", releaseMinor, c.goos, c.goarch, shaFor)
		if err != nil {
			t.Errorf("minor %s/%s: err %v", c.goos, c.goarch, err)
			continue
		}
		if !info.HasUpdate || info.ManualInstall {
			t.Errorf("minor %s/%s: hasUpdate=%v manual=%v", c.goos, c.goarch, info.HasUpdate, info.ManualInstall)
			continue
		}
		if info.Filename != c.want || info.DownloadURL == "" || info.Sha256 != "sha:"+c.want {
			t.Errorf("minor %s/%s: got Filename=%q url=%q sha=%q", c.goos, c.goarch, info.Filename, info.DownloadURL, info.Sha256)
		}
		if info.InstallerURL != "" || info.InstallerFilename != "" {
			t.Errorf("minor %s/%s: installer fields set on bare path", c.goos, c.goarch)
		}
	}

	// Major bump -> manual installer, all 6 platforms.
	instCases := []struct {
		goos, goarch, want string
	}{
		{"windows", "amd64", "fforge-1.2.0-windows-x64-installer.exe"},
		{"windows", "arm64", "fforge-1.2.0-windows-arm64-installer.exe"},
		{"darwin", "amd64", "fforge-1.2.0-macos-x64.dmg"},
		{"darwin", "arm64", "fforge-1.2.0-macos-arm64.dmg"},
		{"linux", "amd64", "fforge-1.2.0-linux-x64.deb"},
		{"linux", "arm64", "fforge-1.2.0-linux-arm64.deb"},
	}
	for _, c := range instCases {
		info, err := decideUpdate("1.0.0", releaseMajor, c.goos, c.goarch, shaFor)
		if err != nil {
			t.Errorf("major %s/%s: err %v", c.goos, c.goarch, err)
			continue
		}
		if !info.HasUpdate || !info.ManualInstall {
			t.Errorf("major %s/%s: hasUpdate=%v manual=%v", c.goos, c.goarch, info.HasUpdate, info.ManualInstall)
			continue
		}
		if info.InstallerFilename != c.want || info.InstallerURL == "" || info.Sha256 != "sha:"+c.want {
			t.Errorf("major %s/%s: got installer=%q url=%q sha=%q", c.goos, c.goarch, info.InstallerFilename, info.InstallerURL, info.Sha256)
		}
		if info.DownloadURL != "" || info.Filename != "" {
			t.Errorf("major %s/%s: bare fields set on manual path", c.goos, c.goarch)
		}
	}

	// Major bump but no installer asset for the platform -> error.
	majorNoInstaller := GitHubRelease{
		TagName: "v2.0.0",
		Assets:  []GitHubAsset{{Name: "fforge-2.0.0-windows-x64.exe", BrowserDownloadURL: "u"}},
	}
	if _, err := decideUpdate("1.0.0", majorNoInstaller, "windows", "amd64", shaFor); err == nil {
		t.Error("major with no installer asset: expected error")
	}

	// Minor bump but no bare asset for the platform -> error.
	minorNoBare := GitHubRelease{
		TagName: "v1.1.0",
		Assets:  []GitHubAsset{{Name: "fforge-1.1.0-windows-x64-installer.exe", BrowserDownloadURL: "u"}},
	}
	if _, err := decideUpdate("1.0.0", minorNoBare, "windows", "amd64", shaFor); err == nil {
		t.Error("minor with no bare asset: expected error")
	}
}

func TestDownloadAndVerify(t *testing.T) {
	content := []byte("fforge-update-blob")
	wantSha := sha256hex(content)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(content)
	}))
	defer srv.Close()

	// Good SHA: downloads + verifies, file content matches.
	dest := filepath.Join(t.TempDir(), "blob")
	if err := downloadAndVerify(srv.URL, wantSha, dest, nil); err != nil {
		t.Fatalf("good sha: %v", err)
	}
	got, err := os.ReadFile(dest)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(content) {
		t.Errorf("content mismatch: got %q want %q", got, content)
	}

	// Bad SHA: rejected with an integrity error; temp file removed.
	dest2 := filepath.Join(t.TempDir(), "blob2")
	if err := downloadAndVerify(srv.URL, "0000000000000000000000000000000000000000000000000000000000000000", dest2, nil); err == nil {
		t.Error("bad sha: expected integrity error, got nil")
	}
	if _, err := os.Stat(dest2); !os.IsNotExist(err) {
		t.Errorf("bad sha: temp file should be removed, stat err=%v", err)
	}

	// Empty SHA: downloaded, no verification, still succeeds.
	dest3 := filepath.Join(t.TempDir(), "blob3")
	if err := downloadAndVerify(srv.URL, "", dest3, nil); err != nil {
		t.Errorf("empty sha: %v", err)
	}

	// Empty URL: error.
	if err := downloadAndVerify("", "", filepath.Join(t.TempDir(), "x"), nil); err == nil {
		t.Error("empty url: expected error")
	}

	// Non-200: error.
	badSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer badSrv.Close()
	if err := downloadAndVerify(badSrv.URL, "", filepath.Join(t.TempDir(), "y"), nil); err == nil {
		t.Error("404: expected error")
	}
}
