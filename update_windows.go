//go:build windows

package main

import (
	"fmt"
	"os"
	"path/filepath"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

func getUpdateFilePath() string {
	return filepath.Join(os.TempDir(), "fforge_update_new.exe")
}

func backupPath(currentExe string) string {
	return currentExe + ".bak"
}

// ApplyUpdate launches a .bat script that waits for the app to close,
// backs up the running .exe, copies the new binary into place, relaunches.
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
	scriptPath := filepath.Join(os.TempDir(), "fforge_updater.bat")
	pid := os.Getpid()
	scriptContent := fmt.Sprintf(`@echo off
echo Waiting for application to close...
set /a timeout=60
:waitloop
tasklist /FI "PID eq %d" 2>NUL | find "%d" >NUL
if not errorlevel 1 (
    timeout /t 1 /nobreak >NUL
    set /a timeout-=1
    if %%timeout%% leq 0 (
        echo Update timed out waiting for app to exit, aborting
        exit /b 1
    )
    goto waitloop
)
echo Backing up current binary...
copy /Y "%s" "%s" >NUL
if errorlevel 1 (
    echo Backup failed, aborting update
    exit /b 1
)
echo Replacing application...
copy /Y "%s" "%s" >NUL
if errorlevel 1 (
    echo Update failed!
    exit /b 1
)
echo Starting new version...
start "" "%s"
del "%%~f0"
`, pid, pid, currentExe, bak, newExe, currentExe, currentExe)

	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0644); err != nil {
		return fmt.Errorf("failed to create update script: %w", err)
	}

	cmd := createCmd("cmd", "/C", scriptPath)
	cmd.Dir = os.TempDir()
	if err := cmd.Start(); err != nil {
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

	scriptPath := filepath.Join(os.TempDir(), "fforge_rollback.bat")
	pid := os.Getpid()
	scriptContent := fmt.Sprintf(`@echo off
echo Waiting for application to close...
set /a timeout=60
:waitloop
tasklist /FI "PID eq %d" 2>NUL | find "%d" >NUL
if not errorlevel 1 (
    timeout /t 1 /nobreak >NUL
    set /a timeout-=1
    if %%timeout%% leq 0 (
        echo Rollback timed out waiting for app to exit, aborting
        exit /b 1
    )
    goto waitloop
)
echo Restoring previous version...
copy /Y "%s" "%s" >NUL
if errorlevel 1 (
    echo Rollback failed!
    exit /b 1
)
echo Starting restored version...
start "" "%s"
del "%%~f0"
`, pid, pid, bak, currentExe, currentExe)

	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0644); err != nil {
		return fmt.Errorf("failed to create rollback script: %w", err)
	}

	cmd := createCmd("cmd", "/C", scriptPath)
	cmd.Dir = os.TempDir()
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to launch rollback script: %w", err)
	}

	wailsRuntime.Quit(a.ctx)
	return nil
}
