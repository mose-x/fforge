package downloader

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"testing"
)

// TestDownloadSingleThread verifies a small file downloads intact via the
// single-threaded path (threads=1).
func TestDownloadSingleThread(t *testing.T) {
	content := []byte("fforge-update-blob")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(content)
	}))
	defer srv.Close()

	dest := filepath.Join(t.TempDir(), "blob")
	d := NewDownloader()
	if err := d.Download(context.Background(), srv.URL, dest, nil, ProxyConfig{}, 1); err != nil {
		t.Fatalf("download: %v", err)
	}
	got, err := os.ReadFile(dest)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, content) {
		t.Errorf("content mismatch: got %q want %q", got, content)
	}
}

// TestDownloadMultiThread verifies the segmented multi-threaded path against a
// Range-aware server (≥5MB so it is actually used).
func TestDownloadMultiThread(t *testing.T) {
	content := make([]byte, 6*1024*1024)
	for i := range content {
		content[i] = byte(i)
	}
	srv := httptest.NewServer(rangeHandler(content))
	defer srv.Close()

	dest := filepath.Join(t.TempDir(), "big")
	d := NewDownloader()
	if err := d.Download(context.Background(), srv.URL, dest, nil, ProxyConfig{}, 4); err != nil {
		t.Fatalf("multi-thread download: %v", err)
	}
	got, err := os.ReadFile(dest)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, content) {
		t.Errorf("content mismatch: len got=%d want=%d", len(got), len(content))
	}
}

// TestDownloadMultiThreadFallback: a server that does not advertise
// Accept-Ranges forces the multi-thread path to fall back to single-thread,
// which must still succeed.
func TestDownloadMultiThreadFallback(t *testing.T) {
	content := make([]byte, 6*1024*1024)
	for i := range content {
		content[i] = byte(i)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// No Accept-Ranges header on any response.
		w.Write(content)
	}))
	defer srv.Close()

	dest := filepath.Join(t.TempDir(), "fb")
	d := NewDownloader()
	if err := d.Download(context.Background(), srv.URL, dest, nil, ProxyConfig{}, 4); err != nil {
		t.Fatalf("fallback download: %v", err)
	}
	got, _ := os.ReadFile(dest)
	if !bytes.Equal(got, content) {
		t.Error("content mismatch after fallback")
	}
}

// TestDownloadNon200 verifies a non-200 server is an error.
func TestDownloadNon200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()
	dest := filepath.Join(t.TempDir(), "x")
	d := NewDownloader()
	if err := d.Download(context.Background(), srv.URL, dest, nil, ProxyConfig{}, 1); err == nil {
		t.Error("expected error for 404")
	}
}

// rangeHandler serves a static byte slice with Accept-Ranges + Content-Length
// on HEAD and 206 Partial Content on a ranged GET, so the multi-thread path
// actually runs.
func rangeHandler(content []byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Accept-Ranges", "bytes")
		w.Header().Set("Content-Length", strconv.FormatInt(int64(len(content)), 10))
		if r.Method == http.MethodHead {
			w.WriteHeader(http.StatusOK)
			return
		}
		rng := r.Header.Get("Range")
		if rng == "" {
			w.WriteHeader(http.StatusOK)
			w.Write(content)
			return
		}
		var start, end int64
		fmt.Sscanf(rng, "bytes=%d-%d", &start, &end)
		if end >= int64(len(content)) {
			end = int64(len(content)) - 1
		}
		w.Header().Set("Content-Length", strconv.FormatInt(end-start+1, 10))
		w.WriteHeader(http.StatusPartialContent)
		w.Write(content[start : end+1])
	}
}
