package main

import (
	"os"
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
