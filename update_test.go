package main

import "testing"

// testAssets is a representative release asset list (amd64/x64 only) used
// by the matcher tests. Asset names mirror what build.yml produces.
func testAssets() []GitHubAsset {
	return []GitHubAsset{
		{Name: "fforge-1.2.0-windows-x64.exe", BrowserDownloadURL: "u/win-bare"},
		{Name: "fforge-1.2.0-windows-x64-installer.exe", BrowserDownloadURL: "u/win-inst"},
		{Name: "fforge-1.2.0-macos-x64.bin", BrowserDownloadURL: "u/mac-bare"},
		{Name: "fforge-1.2.0-macos-x64.dmg", BrowserDownloadURL: "u/mac-dmg"},
		{Name: "fforge-1.2.0-linux-x64", BrowserDownloadURL: "u/lin-bare"},
		{Name: "fforge-1.2.0-linux-x64.deb", BrowserDownloadURL: "u/lin-deb"},
		{Name: "fforge-1.2.0-linux-x64.rpm", BrowserDownloadURL: "u/lin-rpm"},
		{Name: "sha256sums.txt", BrowserDownloadURL: "u/sums"},
	}
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
	assets := testAssets()
	// cases where a bare self-update asset exists and must be selected
	cases := []struct{ goos, goarch, want string }{
		{"windows", "amd64", "fforge-1.2.0-windows-x64.exe"},
		{"darwin", "amd64", "fforge-1.2.0-macos-x64.bin"},
		{"linux", "amd64", "fforge-1.2.0-linux-x64"},
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
	// arch with no asset in the list -> not found
	if _, ok := matchPlatformAsset(assets, "windows", "arm64"); ok {
		t.Error("expected not found for windows/arm64 (no arm64 asset in list)")
	}
	// unsupported OS -> not found
	if _, ok := matchPlatformAsset(assets, "freebsd", "amd64"); ok {
		t.Error("expected not found for unsupported OS freebsd")
	}
	// installer assets must NOT be selected as the bare bin
	if a, ok := matchPlatformAsset(assets, "windows", "amd64"); ok && a.Name == "fforge-1.2.0-windows-x64-installer.exe" {
		t.Error("matchPlatformAsset picked the installer instead of the bare .exe")
	}
}

func TestMatchPlatformInstallerAsset(t *testing.T) {
	assets := testAssets()
	cases := []struct{ goos, goarch, want string }{
		{"windows", "amd64", "fforge-1.2.0-windows-x64-installer.exe"},
		{"darwin", "amd64", "fforge-1.2.0-macos-x64.dmg"},
		{"linux", "amd64", "fforge-1.2.0-linux-x64.deb"},
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
	// arm64 not in list -> not found
	if _, ok := matchPlatformInstallerAsset(assets, "linux", "arm64"); ok {
		t.Error("expected not found for linux/arm64 (no arm64 asset in list)")
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
