//go:build !windows

package main

import (
	"runtime"
	"strings"
	"testing"
)

func TestRelaunchCommand(t *testing.T) {
	if runtime.GOOS == "darwin" {
		cmd := relaunchCommand("/Applications/fforge.app/Contents/MacOS/fforge")
		if !strings.Contains(cmd, "open") {
			t.Errorf("expected open for .app on macOS, got: %s", cmd)
		}
		if !strings.Contains(cmd, "fforge.app") {
			t.Errorf("expected .app bundle path in open command, got: %s", cmd)
		}
		cmd = relaunchCommand("/usr/local/bin/fforge")
		if !strings.Contains(cmd, "nohup") {
			t.Errorf("expected nohup for bare binary on macOS, got: %s", cmd)
		}
	} else {
		cmd := relaunchCommand("/usr/bin/fforge")
		if !strings.Contains(cmd, "nohup") {
			t.Errorf("expected nohup on Linux, got: %s", cmd)
		}
	}
}
