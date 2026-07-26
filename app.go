package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App is the application struct bound to the frontend.
type App struct {
	ctx        context.Context
	ffmpegPath string
	probePath  string
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{
		ffmpegPath: lookupBin("ffmpeg"),
		probePath:  lookupBin("ffprobe"),
	}
}

// OnStartup is called when the app starts.
func (a *App) OnStartup(ctx context.Context) {
	a.ctx = ctx
}

// OnShutdown is called when the app closes.
func (a *App) OnShutdown(_ context.Context) {}

// -----------------------------------------------------------------
// Environment / engine status
// -----------------------------------------------------------------

// EngineStatus describes the ffmpeg/ffprobe availability.
type EngineStatus struct {
	FFmpegAvailable  bool   `json:"ffmpegAvailable"`
	FFprobeAvailable bool   `json:"ffprobeAvailable"`
	FFmpegPath       string `json:"ffmpegPath"`
	FFprobePath      string `json:"ffprobePath"`
	Version          string `json:"version"`
}

// EngineStatus returns the current ffmpeg/ffprobe availability + version.
func (a *App) EngineStatus() EngineStatus {
	st := EngineStatus{
		FFmpegAvailable:  a.ffmpegPath != "",
		FFprobeAvailable: a.probePath != "",
		FFmpegPath:       a.ffmpegPath,
		FFprobePath:      a.probePath,
	}
	if a.ffmpegPath != "" {
		out, err := exec.Command(a.ffmpegPath, "-version").Output()
		if err == nil {
			line := strings.SplitN(string(out), "\n", 2)[0]
			fields := strings.Fields(line)
			if len(fields) >= 3 {
				st.Version = fields[2]
			} else {
				st.Version = strings.TrimSpace(line)
			}
		}
	}
	return st
}

// -----------------------------------------------------------------
// File dialogs
// -----------------------------------------------------------------

// MediaFilter returns a wildcard file filter for common media files.
func mediaFilter() runtime.FileFilter {
	return runtime.FileFilter{
		DisplayName: "Media Files (*.mp4;*.mkv;*.mov;*.webm;*.avi;*.ts;*.m4v;*.flv;*.mp3;*.wav;*.aac;*.flac;*.ogg;*.m4a)",
		Pattern:     "*.mp4;*.mkv;*.mov;*.webm;*.avi;*.ts;*.m4v;*.flv;*.mp3;*.wav;*.aac;*.flac;*.ogg;*.m4a",
	}
}

// SelectMediaFile opens a file dialog and returns the chosen path.
func (a *App) SelectMediaFile() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("app not started")
	}
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "选择媒体文件 / Select Media File",
		Filters: []runtime.FileFilter{mediaFilter(), {DisplayName: "All Files (*.*)", Pattern: "*.*"}},
	})
}

// SelectOutputPath opens a save dialog and returns the chosen path.
func (a *App) SelectOutputPath(defaultName string) (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("app not started")
	}
	if defaultName == "" {
		defaultName = "output.mp4"
	}
	return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "保存输出文件 / Save Output File",
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: "MP4 (*.mp4)", Pattern: "*.mp4"},
			{DisplayName: "MKV (*.mkv)", Pattern: "*.mkv"},
			{DisplayName: "MOV (*.mov)", Pattern: "*.mov"},
			{DisplayName: "WebM (*.webm)", Pattern: "*.webm"},
			{DisplayName: "Audio (*.mp3;*.aac;*.wav;*.m4a)", Pattern: "*.mp3;*.aac;*.wav;*.m4a"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
}

// SelectDirectory opens a directory picker and returns the chosen path.
func (a *App) SelectDirectory() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("app not started")
	}
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择目录 / Select Directory",
	})
}

// OpenInFolder reveals a file in the platform file manager.
func (a *App) OpenInFolder(path string) error {
	if path == "" {
		return fmt.Errorf("empty path")
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	switch {
	case runtime.Environment(a.ctx).Platform == "darwin":
		return exec.Command("open", "-R", abs).Start()
	case runtime.Environment(a.ctx).Platform == "windows":
		return exec.Command("explorer", "/select,", abs).Start()
	default:
		// linux / others
		dir := filepath.Dir(abs)
		return exec.Command("xdg-open", dir).Start()
	}
}

// -----------------------------------------------------------------
// ffprobe
// -----------------------------------------------------------------

// MediaInfo holds the parsed media metadata.
type MediaInfo struct {
	Path        string  `json:"path"`
	Filename    string  `json:"filename"`
	Duration    float64 `json:"duration"`
	DurationStr string  `json:"durationStr"`
	Width       int     `json:"width"`
	Height      int     `json:"height"`
	Codec       string  `json:"codec"`
	AudioCodec  string  `json:"audioCodec"`
	Container   string  `json:"container"`
	SizeBytes   int64   `json:"sizeBytes"`
	SizeHuman   string  `json:"sizeHuman"`
	BitRate     int64   `json:"bitRate"`
	Fps         float64 `json:"fps"`
}

type probeOutput struct {
	Streams []struct {
		CodecType  string `json:"codec_type"`
		CodecName  string `json:"codec_name"`
		Width      int    `json:"width"`
		Height     int    `json:"height"`
		Duration   string `json:"duration"`
		BitRate    string `json:"bit_rate"`
		RFrameRate string `json:"r_frame_rate"`
	} `json:"streams"`
	Format struct {
		FormatName string `json:"format_name"`
		Duration   string `json:"duration"`
		BitRate    string `json:"bit_rate"`
		Size       string `json:"size"`
	} `json:"format"`
}

// ProbeMedia runs ffprobe on the given file and returns parsed info.
func (a *App) ProbeMedia(path string) (*MediaInfo, error) {
	if a.probePath == "" {
		return nil, fmt.Errorf("ffprobe 未找到 / ffprobe not found")
	}
	if path == "" {
		return nil, fmt.Errorf("empty path")
	}
	if _, err := os.Stat(path); err != nil {
		return nil, err
	}
	args := []string{
		"-v", "error",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		path,
	}
	out, err := exec.Command(a.probePath, args...).Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe 失败: %v", err)
	}
	var pr probeOutput
	if err := json.Unmarshal(out, &pr); err != nil {
		return nil, fmt.Errorf("解析 ffprobe 输出失败: %v", err)
	}
	info := &MediaInfo{Path: path, Filename: filepath.Base(path)}
	if pr.Format.Duration != "" {
		if d, err := strconv.ParseFloat(pr.Format.Duration, 64); err == nil {
			info.Duration = d
			info.DurationStr = formatDuration(d)
		}
	}
	if pr.Format.BitRate != "" {
		if b, err := strconv.ParseInt(pr.Format.BitRate, 10, 64); err == nil {
			info.BitRate = b
		}
	}
	if pr.Format.Size != "" {
		if s, err := strconv.ParseInt(pr.Format.Size, 10, 64); err == nil {
			info.SizeBytes = s
			info.SizeHuman = humanSize(s)
		}
	}
	info.Container = pr.Format.FormatName
	for _, s := range pr.Streams {
		switch s.CodecType {
		case "video":
			info.Codec = s.CodecName
			info.Width = s.Width
			info.Height = s.Height
			if s.RFrameRate != "" {
				if fps, err := parseFps(s.RFrameRate); err == nil {
					info.Fps = fps
				}
			}
			if info.Duration == 0 && s.Duration != "" {
				if d, err := strconv.ParseFloat(s.Duration, 64); err == nil {
					info.Duration = d
					info.DurationStr = formatDuration(d)
				}
			}
		case "audio":
			info.AudioCodec = s.CodecName
		}
	}
	return info, nil
}

// -----------------------------------------------------------------
// ffmpeg execution with progress events
// -----------------------------------------------------------------

// RunRequest is the payload used to start an ffmpeg job from the frontend.
type RunRequest struct {
	Args       []string `json:"args"`
	OutputPath string   `json:"outputPath"`
	Duration   float64  `json:"duration"` // seconds, for progress calc (0 = unknown)
}

// ProgressEvent is emitted to the frontend during ffmpeg runs.
type ProgressEvent struct {
	Percent    float64 `json:"percent"`
	TimeSec    float64 `json:"timeSec"`
	Speed      string  `json:"speed"`
	Frame      int     `json:"frame"`
	Status     string  `json:"status"` // running | done | error
	Message    string  `json:"message"`
	OutputPath string  `json:"outputPath"`
}

var (
	timeRe  = regexp.MustCompile(`time=(\d+):(\d+):(\d+(?:\.\d+)?)`)
	frameRe = regexp.MustCompile(`frame=\s*(\d+)`)
	speedRe = regexp.MustCompile(`speed=\s*([0-9.]+x)`)
)

// RunFFmpeg executes ffmpeg with the given args, streaming progress events.
// The event name is "ffmpeg:progress".
func (a *App) RunFFmpeg(req RunRequest) error {
	if a.ffmpegPath == "" {
		return fmt.Errorf("ffmpeg 未找到 / ffmpeg not found")
	}
	if len(req.Args) == 0 {
		return fmt.Errorf("empty args")
	}
	if a.ctx == nil {
		return fmt.Errorf("app not started")
	}
	cmd := exec.Command(a.ffmpegPath, req.Args...)
	// ffmpeg writes progress to stderr
	cmd.Stdout = nil
	cmd.Stderr = nil
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	// -y overwrite, ensure stdin doesn't block
	cmd.Stdin = strings.NewReader("")
	if err := cmd.Start(); err != nil {
		return err
	}
	runtime.EventsEmit(a.ctx, "ffmpeg:progress", ProgressEvent{Status: "running"})
	go func() {
		buf := make([]byte, 4096)
		tail := ""
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				tail += string(buf[:n])
				// keep last ~1500 chars to handle partial lines
				if len(tail) > 4000 {
					tail = tail[len(tail)-1500:]
				}
				ev := parseProgress(tail, req.Duration)
				ev.Status = "running"
				ev.OutputPath = req.OutputPath
				runtime.EventsEmit(a.ctx, "ffmpeg:progress", ev)
			}
			if err != nil {
				break
			}
		}
	}()
	err = cmd.Wait()
	if err != nil {
		runtime.EventsEmit(a.ctx, "ffmpeg:progress", ProgressEvent{
			Status:     "error",
			Message:    err.Error(),
			OutputPath: req.OutputPath,
		})
		return err
	}
	runtime.EventsEmit(a.ctx, "ffmpeg:progress", ProgressEvent{
		Status:     "done",
		Percent:    100,
		OutputPath: req.OutputPath,
	})
	return nil
}

func parseProgress(tail string, duration float64) ProgressEvent {
	ev := ProgressEvent{}
	if m := frameRe.FindStringSubmatch(tail); len(m) > 1 {
		if f, err := strconv.Atoi(m[1]); err == nil {
			ev.Frame = f
		}
	}
	if m := speedRe.FindStringSubmatch(tail); len(m) > 1 {
		ev.Speed = m[1]
	}
	if m := timeRe.FindStringSubmatch(tail); len(m) >= 4 {
		h, _ := strconv.Atoi(m[1])
		min, _ := strconv.Atoi(m[2])
		sec, _ := strconv.ParseFloat(m[3], 64)
		ev.TimeSec = float64(h)*3600 + float64(min)*60 + sec
		if duration > 0 {
			ev.Percent = ev.TimeSec / duration * 100
			if ev.Percent > 99.5 {
				ev.Percent = 99.5
			}
		}
	}
	return ev
}

// -----------------------------------------------------------------
// helpers
// -----------------------------------------------------------------

func lookupBin(name string) string {
	// allow override via env
	if v := os.Getenv(strings.ToUpper(name) + "_PATH"); v != "" {
		if _, err := os.Stat(v); err == nil {
			return v
		}
	}
	p, err := exec.LookPath(name)
	if err != nil {
		return ""
	}
	return p
}

func parseFps(rate string) (float64, error) {
	parts := strings.Split(rate, "/")
	if len(parts) == 1 {
		return strconv.ParseFloat(parts[0], 64)
	}
	a, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return 0, err
	}
	b, err := strconv.ParseFloat(parts[1], 64)
	if err != nil || b == 0 {
		return 0, err
	}
	return a / b, nil
}

func formatDuration(d float64) string {
	if d <= 0 {
		return "00:00:00"
	}
	h := int(d) / 3600
	m := (int(d) % 3600) / 60
	s := d - float64(h*3600+m*60)
	return fmt.Sprintf("%02d:%02d:%05.2f", h, m, s)
}

// FormatDurationHHMMSS formats seconds as HH:MM:SS (no decimals), matching the UI time codes.
func FormatDurationHHMMSS(d float64) string {
	if d < 0 {
		d = 0
	}
	h := int(d) / 3600
	m := (int(d) % 3600) / 60
	s := int(d) % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}

func humanSize(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(b)/float64(div), "KMGTPE"[exp])
}

// nowTimestamp is a small helper used for logging.
func nowTimestamp() string {
	return time.Now().Format("15:04:05.000")
}
