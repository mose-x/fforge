package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteConcatList(t *testing.T) {
	app := &App{}
	paths := []string{"/path/one.mp4", "/path/two.mp4"}
	path, err := app.WriteConcatList(paths)
	if err != nil {
		t.Fatalf("WriteConcatList: %v", err)
	}
	defer os.Remove(path)

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read concat list: %v", err)
	}
	body := string(data)
	for _, p := range paths {
		if !strings.Contains(body, p) {
			t.Errorf("concat list missing %q, got:\n%s", p, body)
		}
	}
	if !strings.Contains(body, "file '") {
		t.Errorf("concat list missing file directive, got:\n%s", body)
	}
}

func TestWriteConcatListEmpty(t *testing.T) {
	app := &App{}
	if _, err := app.WriteConcatList(nil); err == nil {
		t.Error("expected error for empty path list")
	}
}

func TestWriteConcatListQuoteEscape(t *testing.T) {
	app := &App{}
	paths := []string{"/tmp/it's a file.mp4"}
	path, err := app.WriteConcatList(paths)
	if err != nil {
		t.Fatalf("WriteConcatList: %v", err)
	}
	defer os.Remove(path)

	data, _ := os.ReadFile(path)
	body := string(data)
	if !strings.Contains(body, `file '`) {
		t.Errorf("missing file directive, got:\n%s", body)
	}
	if !strings.Contains(body, `'\''`) {
		t.Errorf("single quote not escaped, got:\n%s", body)
	}
}

func TestParseProgressMultipleMatches(t *testing.T) {
	// tail accumulates multiple progress lines; parseProgress must return
	// the LAST (most recent) match, not the first (oldest).
	tail := "frame=  100 fps= 30 q=28.0 size=    1024kB time=00:00:03.20 bitrate= 2621.4kbits/s speed=2.00x\n" +
		"frame=  200 fps= 30 q=28.0 size=    2048kB time=00:00:06.40 bitrate= 2621.4kbits/s speed=3.00x\n"
	ev := parseProgress(tail, 10.0)
	if ev.Frame != 200 {
		t.Errorf("Frame = %d, want 200 (last match)", ev.Frame)
	}
	if ev.Speed != "3.00x" {
		t.Errorf("Speed = %q, want 3.00x (last match)", ev.Speed)
	}
	if ev.TimeSec != 6.4 {
		t.Errorf("TimeSec = %v, want 6.4 (last match)", ev.TimeSec)
	}
	if ev.Percent != 64 {
		t.Errorf("Percent = %v, want 64", ev.Percent)
	}
}

func TestParseProgressSingleMatch(t *testing.T) {
	tail := "frame=  50 fps= 30 q=28.0 time=00:00:01.60 speed=1.50x\n"
	ev := parseProgress(tail, 0)
	if ev.Frame != 50 {
		t.Errorf("Frame = %d, want 50", ev.Frame)
	}
	if ev.Speed != "1.50x" {
		t.Errorf("Speed = %q, want 1.50x", ev.Speed)
	}
	if ev.TimeSec != 1.6 {
		t.Errorf("TimeSec = %v, want 1.6", ev.TimeSec)
	}
}

func TestParseProgressEmpty(t *testing.T) {
	ev := parseProgress("", 10.0)
	if ev.Frame != 0 || ev.Speed != "" || ev.TimeSec != 0 || ev.Percent != 0 {
		t.Errorf("expected zero values for empty tail, got %+v", ev)
	}
}

func TestIsWritable(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "testfile")
	if err := os.WriteFile(f, []byte("test"), 0644); err != nil {
		t.Fatal(err)
	}
	if !isWritable(f) {
		t.Error("isWritable returned false for a temp dir file")
	}
}
