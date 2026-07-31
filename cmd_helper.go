package main

import "os/exec"

// createCmd creates a detached command process for update scripts.
// On Unix the script runs via /bin/sh; on Windows via cmd /C.
func createCmd(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	// Detach from parent so the script survives after the app exits.
	cmd.Stdin = nil
	cmd.Stdout = nil
	cmd.Stderr = nil
	return cmd
}
