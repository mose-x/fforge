package main

import (
	"fmt"
	"strings"
	"time"

	"fforge/internal/downloader"
)

// getProxyConfig maps the persisted ProxySettings to the downloader's runtime
// ProxyConfig. Used by CheckUpdate, DownloadUpdate, and CheckProxy.
func (a *App) getProxyConfig() downloader.ProxyConfig {
	s := a.settings.Get()
	return downloader.ProxyConfig{
		Enabled:  s.Proxy.Enabled,
		Mode:     s.Proxy.Mode,
		URL:      s.Proxy.URL,
		Protocol: s.Proxy.Protocol,
	}
}

// CheckProxy tests connectivity to targetURL using the current proxy settings.
// Bound to the frontend (Settings dialog "test connection" buttons). Returns
// an error on connection failure or HTTP >= 400.
func (a *App) CheckProxy(targetURL string) error {
	client := downloader.BuildClient(a.getProxyConfig())
	client.Timeout = 10 * time.Second
	resp, err := client.Get(targetURL)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return nil
}

// applyGithubMirror rewrites a github.com download URL to go through the
// configured GitHub mirror (prefix-concatenation). No-op when no mirror is
// set or the URL already starts with the mirror. Used by DownloadUpdate so
// GFW users can download release assets via a mirror without a proxy.
func (a *App) applyGithubMirror(downloadURL string) string {
	mirror := a.settings.Get().GithubMirror
	if mirror == "" {
		return downloadURL
	}
	mirror = strings.TrimRight(mirror, "/")
	if strings.Contains(downloadURL, "github.com") && !strings.HasPrefix(downloadURL, mirror) {
		return mirror + "/" + downloadURL
	}
	return downloadURL
}
