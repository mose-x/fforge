//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// hideWindow prevents child processes (ffmpeg, ffprobe, explorer, etc.) from
// flashing a console window. CREATE_NO_WINDOW (0x08000000) tells the Windows
// kernel to not allocate a console for the child process.
func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000}
}
