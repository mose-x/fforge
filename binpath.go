package main

import (
	"os"
	"path/filepath"
	"runtime"
)

// lookupBundledBin resolves a bundled binary (ffmpeg/ffprobe) relative to
// the running executable. Checks three candidate locations in order:
//  1. Same directory as the executable — Windows bare-exe install,
//     macOS Contents/MacOS/, Linux bare binary.
//  2. ../Resources/<name> — macOS .app bundle Contents/Resources/.
//  3. ../lib/fforge/<name> — Linux .deb/.rpm install (/usr/lib/fforge/).
//
// On Windows, candidate 1 appends ".exe". Candidates 2 and 3 use the
// bare name (macOS/Linux binaries have no extension). Returns "" if no
// candidate exists or is not a regular file.
func lookupBundledBin(name string) string {
	exePath, err := os.Executable()
	if err != nil {
		return ""
	}
	exeDir := filepath.Dir(exePath)

	binName := name
	if runtime.GOOS == "windows" {
		binName = name + ".exe"
	}

	candidates := []string{
		filepath.Join(exeDir, binName),
		filepath.Join(exeDir, "..", "Resources", name),
		filepath.Join(exeDir, "..", "lib", "fforge", name),
	}

	for _, c := range candidates {
		abs, err := filepath.Abs(c)
		if err != nil {
			continue
		}
		info, err := os.Stat(abs)
		if err != nil || info.IsDir() {
			continue
		}
		return abs
	}
	return ""
}
