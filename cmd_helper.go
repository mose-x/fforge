package main

import (
	"os"
	"os/exec"
	"path/filepath"
)

// createCmd creates a detached command process for update scripts.
// On Unix the script runs via /bin/sh; on Windows via cmd /C.
func createCmd(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	// Detach from parent so the script survives after the app exits.
	cmd.Stdin = nil
	cmd.Stdout = nil
	cmd.Stderr = nil
	hideWindow(cmd)
	return cmd
}

// isWritable reports whether the directory containing path is writable by
// the current user. Used by self-update to decide if elevation is needed
// (e.g. /usr/bin or C:\Program Files require root/admin; /Applications
// and user dirs do not).
func isWritable(path string) bool {
	dir := filepath.Dir(path)
	f, err := os.CreateTemp(dir, ".wtest_*")
	if err != nil {
		return false
	}
	f.Close()
	os.Remove(f.Name())
	return true
}
