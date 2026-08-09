package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
)

const settingsFile = "settings.json"

// ProxySettings holds the proxy configuration used by the in-app downloader
// (self-update + GitHub mirror downloads) so fforge can reach GitHub from
// behind the GFW. Mirrors downloader.ProxyConfig; Mode is "system" | "custom",
// Protocol is "http" | "socks5" (used when URL has no scheme).
type ProxySettings struct {
	Enabled  bool   `json:"enabled"`  // whether proxy is enabled
	Mode     string `json:"mode"`     // "system" | "custom"
	URL      string `json:"url"`      // custom proxy URL (host[:port])
	Protocol string `json:"protocol"` // "http" | "socks5"
}

// AppSettings is the lean fforge settings set persisted to ~/.fforge/settings.json.
// (SVC also stores theme/language/endpoints/installPath/githubToken; fforge has
// no SDK management, so only proxy + github mirror + download threads remain.)
type AppSettings struct {
	Proxy           ProxySettings `json:"proxy"`
	GithubMirror    string        `json:"githubMirror"`    // GitHub mirror URL, empty = no replacement
	DownloadThreads int           `json:"downloadThreads"` // download thread count, 0 = default 4
}

// SettingsManager persists fforge settings to ~/.fforge/settings.json.
type SettingsManager struct {
	mu       sync.RWMutex
	homeDir  string // user home dir; settings.json lives at <homeDir>/.fforge/settings.json
	settings AppSettings
}

// NewSettingsManager creates a settings manager rooted at the user's home dir
// (resolved via os.UserHomeDir, with a "." fallback if unset).
func NewSettingsManager() *SettingsManager {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		home = "."
	}
	sm := &SettingsManager{
		homeDir: home,
		settings: AppSettings{
			Proxy:           ProxySettings{Enabled: false, Mode: "system"},
			DownloadThreads: 4,
		},
	}
	sm.load()
	return sm
}

// settingsPath returns the path to ~/.fforge/settings.json.
func (s *SettingsManager) settingsPath() string {
	return filepath.Join(s.homeDir, ".fforge", settingsFile)
}

func (s *SettingsManager) load() {
	path := s.settingsPath()
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	if err := json.Unmarshal(data, &s.settings); err != nil {
		log.Printf("config: failed to parse settings (%s): %v, using defaults", path, err)
	}
}

func (s *SettingsManager) save() error {
	dir := filepath.Join(s.homeDir, ".fforge")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create %s: %w", dir, err)
	}
	data, err := json.MarshalIndent(s.settings, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.settingsPath(), data, 0644)
}

// Get returns the current settings.
func (s *SettingsManager) Get() AppSettings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.settings
}

// Update replaces the settings and persists them.
func (s *SettingsManager) Update(settings AppSettings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.settings = settings
	return s.save()
}
