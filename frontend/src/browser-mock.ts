/**
 * Browser preview mock — lets the frontend run via `npm run dev` in a plain
 * browser (no Wails runtime). When Wails is present (window.go / window.runtime
 * exist), this file is a no-op.
 */
const w = window as any;

if (!w.go || !w.runtime) {
  console.info("[browser-mock] Wails runtime not detected, injecting mock backend.");

  const FAKE_MEDIA = {
    path: "/Users/demo/Movies/sample.mp4",
    filename: "sample.mp4",
    duration: 182.5,
    durationStr: "00:03:02.50",
    width: 1920,
    height: 1080,
    codec: "h264",
    audioCodec: "aac",
    container: "mov,mp4,m4a,3gp,3g2,mj2",
    sizeBytes: 483183820,
    sizeHuman: "460.6 MB",
    bitRate: 21173280,
    fps: 30,
  };

  const FAKE_EXTENDED = {
    path: "/Users/demo/Movies/sample.mp4",
    filename: "sample.mp4",
    sizeHuman: "460.6 MB",
    format: {
      filename: "sample.mp4",
      nb_streams: 2,
      format_name: "mov,mp4,m4a,3gp,3g2,mj2",
      format_long_name: "QuickTime / MOV",
      duration: "182.500000",
      size: "483183820",
      bit_rate: "21173280",
    },
    streams: [
      {
        index: 0,
        codec_type: "video",
        codec_name: "h264",
        codec_long_name: "H.264 / AVC",
        profile: "High",
        width: 1920,
        height: 1080,
        pix_fmt: "yuv420p",
        duration: "182.500000",
        bit_rate: "19872000",
        nb_frames: "5475",
        r_frame_rate: "30/1",
        tags: { language: "und" },
        side_data_list: [],
        language: "und",
      },
      {
        index: 1,
        codec_type: "audio",
        codec_name: "aac",
        codec_long_name: "AAC (Advanced Audio Coding)",
        profile: "LC",
        sample_fmt: "fltp",
        sample_rate: "48000",
        channels: 2,
        channel_layout: "stereo",
        duration: "182.480000",
        bit_rate: "128000",
        nb_frames: "8553",
        tags: { language: "eng" },
        side_data_list: [],
        language: "eng",
      },
    ],
    chapters: [],
    tags: {},
    rawJson:
      '{"format":{"filename":"sample.mp4","duration":"182.500000"},"streams":[{"codec_type":"video","codec_name":"h264","width":1920,"height":1080},{"codec_type":"audio","codec_name":"aac","sample_rate":"48000","channels":2}]}',
  };

  const FAKE_DEVICES = [
    { kind: "screen", name: "0", desc: "Capture screen 0 (Desktop)", default: true },
    { kind: "audio", name: "default", desc: "Default audio input", default: true },
    { kind: "video", name: "FaceTime HD Camera", desc: "Built-in camera", default: true },
  ];

  const listeners: Record<string, ((...args: any[]) => void)[]> = {};

  const runtime = {
    EventsOnMultiple(name: string, cb: (...args: any[]) => void, _max: number) {
      (listeners[name] ||= []).push(cb);
    },
    EventsOn(name: string, cb: (...args: any[]) => void) {
      (listeners[name] ||= []).push(cb);
    },
    EventsOff(_name: string) {},
    EventsOffAll() {},
    EventsEmit(name: string, ...args: any[]) {
      (listeners[name] || []).forEach((cb) => cb(...args));
    },
    LogInfo(msg: string) {
      console.log("[wails-log]", msg);
    },
    LogDebug(msg: string) {
      console.debug("[wails-log]", msg);
    },
    LogError(msg: string) {
      console.error("[wails-log]", msg);
    },
    LogWarning(msg: string) {
      console.warn("[wails-log]", msg);
    },
    WindowReload() {
      location.reload();
    },
    BrowserOpenURL(url: string) {
      window.open(url, "_blank");
    },
  };
  w.runtime = runtime;

  function simulateProgress(outputPath: string, duration: number) {
    const total = duration > 0 ? duration : 30;
    const steps = 20;
    const interval = Math.max(120, (total * 1000) / steps);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const percent = Math.round((step / steps) * 100);
      runtime.EventsEmit("ffmpeg:progress", {
        percent,
        timeSec: Math.round(((total * step) / steps) * 10) / 10,
        speed: (1.5 + Math.random()).toFixed(2) + "x",
        frame: Math.round((total * 30 * step) / steps),
        status: step < steps ? "running" : "done",
        message: "",
        outputPath,
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
  }

  function simulateUpdateProgress() {
    const steps = 15;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const percent = Math.round((step / steps) * 100);
      runtime.EventsEmit("update:progress", {
        stage: step < steps ? "downloading" : "done",
        percent,
        downloadedBytes: step * 1000000,
        totalBytes: steps * 1000000,
        speedBytesPerSec: 5000000,
        message: step < steps ? `Downloading ${step}MB / ${steps}MB` : "Download complete",
      });
      if (step >= steps) clearInterval(timer);
    }, 200);
  }

  w.go = {
    main: {
      App: {
        EngineStatus: () =>
          Promise.resolve({
            ffmpegAvailable: true,
            ffprobeAvailable: true,
            ffmpegPath: "/usr/local/bin/ffmpeg",
            ffprobePath: "/usr/local/bin/ffprobe",
            version: "ffmpeg 7.0 (browser-mock)",
          }),
        SelectMediaFile: () => Promise.resolve("/Users/demo/Movies/sample.mp4"),
        SelectMediaFiles: () =>
          Promise.resolve([
            "/Users/demo/Movies/clip1.mp4",
            "/Users/demo/Movies/clip2.mp4",
            "/Users/demo/Movies/clip3.mp4",
          ]),
        SelectSubtitleFile: () => Promise.resolve("/Users/demo/Subtitles/subtitle.srt"),
        SelectOutputPath: (name: string) =>
          Promise.resolve("/Users/demo/Output/" + (name || "output.mp4")),
        SelectDirectory: () => Promise.resolve("/Users/demo/Output"),
        ProbeMedia: (_path: string) => Promise.resolve({ ...FAKE_MEDIA }),
        ProbeMediaExtended: (_path: string) => Promise.resolve({ ...FAKE_EXTENDED }),
        ListInputDevices: () => Promise.resolve([...FAKE_DEVICES]),
        OpenInFolder: (_path: string) => Promise.resolve(),
        RunFFmpeg: (req: any) => {
          console.info("[browser-mock] RunFFmpeg:", req);
          simulateProgress(req?.outputPath || "/Users/demo/Output/output.mp4", req?.duration || 30);
          return Promise.resolve();
        },
        GetAppInfo: () =>
          Promise.resolve({
            version: "1.0.0",
            goVersion: "1.25",
            license: "MIT License",
            repoUrl: "https://github.com/mose-x/fforge",
            updateUrl: "https://api.github.com/repos/mose-x/fforge/releases/latest",
          }),
        CheckUpdate: () =>
          Promise.resolve({
            hasUpdate: true,
            latestVersion: "1.1.0",
            changelog:
              "## v1.1.0\n- New: 7 additional pages\n- New: Auto-update mechanism\n- Fix: Various UI improvements",
            downloadUrl:
              "https://github.com/mose-x/fforge/releases/download/v1.1.0/fforge-1.1.0-macos-arm64.bin",
            filename: "fforge-1.1.0-macos-arm64.bin",
            sha256: "abc123",
          }),
        DownloadUpdate: (_url: string, _sha: string) => {
          simulateUpdateProgress();
          return Promise.resolve();
        },
        ApplyUpdate: () => {
          console.info("[browser-mock] ApplyUpdate would restart the app");
          return Promise.resolve();
        },
        RollbackUpdate: () => {
          console.info("[browser-mock] RollbackUpdate would restore previous version");
          return Promise.resolve();
        },
      },
    },
  };
}
