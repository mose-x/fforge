//go:build !windows

package main

import "os/exec"

// hideWindow is a no-op on Unix — child processes don't spawn console windows.
func hideWindow(cmd *exec.Cmd) {}
