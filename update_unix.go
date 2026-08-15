//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

func getUpdateFilePath() string {
	return filepath.Join(os.TempDir(), "fforge_update_new")
}

func backupPath(currentExe string) string {
	return currentExe + ".bak"
}

func shellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}

// relaunchCommand returns the shell command to relaunch the app after an
// update or rollback. On macOS, if the executable is inside an .app bundle,
// we use `open` on the bundle so Launch Services (Dock, menu bar) works.
// On Linux (or a bare macOS binary without a bundle), use nohup.
func relaunchCommand(currentExe string) string {
	exeQ := shellQuote(currentExe)
	if runtime.GOOS == "darwin" {
		appBundle := filepath.Dir(filepath.Dir(filepath.Dir(currentExe)))
		if strings.HasSuffix(appBundle, ".app") {
			return fmt.Sprintf("open %s", shellQuote(appBundle))
		}
	}
	return fmt.Sprintf("nohup %s > /dev/null 2>&1 &", exeQ)
}

// launchUpdateScript starts the update/rollback shell script. On Linux, if
// the binary lives in a system directory (e.g. /usr/bin), pkexec is used to
// elevate. On macOS, /Applications is user-writable so no elevation is needed.
func launchUpdateScript(scriptPath string, targetExe string) error {
	if runtime.GOOS != "darwin" && !isWritable(targetExe) {
		if _, err := exec.LookPath("pkexec"); err != nil {
			return fmt.Errorf("update requires elevation but pkexec is not available; please update manually")
		}
		cmd := createCmd("pkexec", "/bin/sh", scriptPath)
		cmd.Dir = os.TempDir()
		return cmd.Start()
	}
	cmd := createCmd("/bin/sh", scriptPath)
	cmd.Dir = os.TempDir()
	return cmd.Start()
}

// ApplyUpdate launches a background /bin/sh script that waits for the
// current process to exit, atomically renames the running binary to .bak,
// renames the downloaded payload into place, chmod +x, relaunches, and
// self-deletes.
func (a *App) ApplyUpdate() error {
	currentExe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get current program path: %w", err)
	}

	newExe := getUpdateFilePath()
	if _, err := os.Stat(newExe); err != nil {
		return fmt.Errorf("update file does not exist: %w", err)
	}

	bak := backupPath(currentExe)
	scriptPath := filepath.Join(os.TempDir(), "fforge_updater.sh")
	pid := os.Getpid()
	exeQ := shellQuote(currentExe)
	bakQ := shellQuote(bak)
	newQ := shellQuote(newExe)
	relaunch := relaunchCommand(currentExe)
	scriptContent := fmt.Sprintf(`#!/bin/sh
echo "Waiting for application to close..."
timeout=60
while kill -0 %d 2>/dev/null; do
    sleep 1
    timeout=$((timeout - 1))
    if [ "$timeout" -le 0 ]; then
        echo "Update timed out waiting for app to exit, aborting"
        exit 1
    fi
done
echo "Backing up current binary..."
if ! mv -f %s %s 2>/dev/null; then
    cp -f %s %s && rm -f %s
    if [ $? -ne 0 ]; then
        echo "Backup failed, aborting update"
        exit 1
    fi
fi
echo "Replacing application..."
if ! mv -f %s %s 2>/dev/null; then
    cp -f %s %s && rm -f %s
    if [ $? -ne 0 ]; then
        echo "Update failed! Restoring backup..."
        mv -f %s %s 2>/dev/null || cp -f %s %s
        exit 1
    fi
fi
chmod +x %s
echo "Starting new version..."
%s
rm -f "$0"
`, pid, exeQ, bakQ, exeQ, bakQ, exeQ, newQ, exeQ, newQ, exeQ, newQ, bakQ, exeQ, bakQ, exeQ, exeQ, relaunch)

	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0755); err != nil {
		return fmt.Errorf("failed to create update script: %w", err)
	}

	if err := launchUpdateScript(scriptPath, currentExe); err != nil {
		return fmt.Errorf("failed to launch update script: %w", err)
	}

	wailsRuntime.Quit(a.ctx)
	return nil
}

// RollbackUpdate restores the .bak binary created by the previous ApplyUpdate.
func (a *App) RollbackUpdate() error {
	currentExe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get current program path: %w", err)
	}
	bak := backupPath(currentExe)
	if _, err := os.Stat(bak); err != nil {
		return fmt.Errorf("no backup found at %s: %w", bak, err)
	}

	scriptPath := filepath.Join(os.TempDir(), "fforge_rollback.sh")
	pid := os.Getpid()
	exeQ := shellQuote(currentExe)
	bakQ := shellQuote(bak)
	relaunch := relaunchCommand(currentExe)
	scriptContent := fmt.Sprintf(`#!/bin/sh
echo "Waiting for application to close..."
timeout=60
while kill -0 %d 2>/dev/null; do
    sleep 1
    timeout=$((timeout - 1))
    if [ "$timeout" -le 0 ]; then
        echo "Rollback timed out waiting for app to exit, aborting"
        exit 1
    fi
done
echo "Restoring previous version..."
if ! mv -f %s %s 2>/dev/null; then
    cp -f %s %s && rm -f %s
    if [ $? -ne 0 ]; then
        echo "Rollback failed!"
        exit 1
    fi
fi
chmod +x %s
echo "Starting restored version..."
%s
rm -f "$0"
`, pid, bakQ, exeQ, bakQ, exeQ, bakQ, exeQ, relaunch)

	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0755); err != nil {
		return fmt.Errorf("failed to create rollback script: %w", err)
	}

	if err := launchUpdateScript(scriptPath, currentExe); err != nil {
		return fmt.Errorf("failed to launch rollback script: %w", err)
	}

	wailsRuntime.Quit(a.ctx)
	return nil
}
