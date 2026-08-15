package downloader

import (
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/sys/windows/registry"
)

// applySystemProxy reads the system proxy from the Windows registry and applies it to the transport
func applySystemProxy(transport *http.Transport) {
	k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Internet Settings`, registry.READ)
	if err != nil {
		return
	}
	defer k.Close()

	proxyEnable, _, err := k.GetIntegerValue("ProxyEnable")
	if err != nil || proxyEnable == 0 {
		return
	}

	proxyServer, _, err := k.GetStringValue("ProxyServer")
	if err != nil || proxyServer == "" {
		return
	}

	// Windows system proxy may be in the format http=host:port;https=host:port;socks=host:port
	// Prefer the https proxy, then http, and finally socks.
	// The "https=" entry is the proxy used to reach https:// destinations --
	// the proxy itself still speaks plain HTTP CONNECT, so the URL scheme
	// must be "http://" (same as proxy_darwin.go). Using "https://" would
	// make net/http TLS-wrap the connection to the proxy, which local
	// proxies (Clash/V2Ray/...) do not expect.
	var proxyStr string
	for _, part := range splitProxyParts(proxyServer) {
		scheme, addr := parseProxyPart(part)
		switch scheme {
		case "https":
			proxyStr = "http://" + addr
		case "http":
			if proxyStr == "" {
				proxyStr = "http://" + addr
			}
		case "socks":
			if proxyStr == "" {
				proxyStr = "socks5://" + addr
			}
		}
	}

	// If there is no scheme prefix, default to http
	if proxyStr == "" && proxyServer != "" {
		if !hasScheme(proxyServer) {
			proxyStr = "http://" + proxyServer
		} else {
			proxyStr = proxyServer
		}
	}

	if proxyStr == "" {
		return
	}

	proxyURL, err := url.Parse(proxyStr)
	if err != nil {
		return
	}

	applyProxy(transport, proxyURL)
}

func splitProxyParts(s string) []string {
	var parts []string
	for _, p := range strings.Split(s, ";") {
		p = strings.TrimSpace(p)
		if p != "" {
			parts = append(parts, p)
		}
	}
	return parts
}

func parseProxyPart(s string) (scheme, addr string) {
	idx := strings.IndexByte(s, '=')
	if idx > 0 {
		return s[:idx], s[idx+1:]
	}
	return "", s
}
