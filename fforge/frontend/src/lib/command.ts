// FFmpeg command builder.
// Each page produces a settings object; these functions turn settings into:
//   - args[]          -> the actual argv passed to ffmpeg
//   - tokens[]        -> syntax-highlighted segments for the console
//   - breakdown[]     -> { flag, desc } pairs shown under the command
// The console component renders these uniformly across all pages.

export type TokenType = "cmd" | "flag" | "file" | "val" | "str" | "dim";

export interface Token {
  type: TokenType;
  text: string;
}

export interface BreakdownItem {
  flag: string;
  desc: string;
}

export interface CommandResult {
  args: string[];
  tokens: Token[];
  breakdown: BreakdownItem[];
  /** Estimated output-size ratio vs input (for the status bar). 0 = unknown. */
  sizeRatio: number;
  /** Rough wall-clock estimate in seconds (cosmetic). */
  estSec: number;
}

// -----------------------------------------------------------------
// Format Convert
// -----------------------------------------------------------------

export interface ContainerOpt {
  id: string;
  label: string;
  ext: string;
  formatFlag: string; // -f value or ""
}

export const CONTAINERS: ContainerOpt[] = [
  { id: "mp4", label: "MP4", ext: "mp4", formatFlag: "mp4" },
  { id: "mkv", label: "MKV", ext: "mkv", formatFlag: "matroska" },
  { id: "mov", label: "MOV", ext: "mov", formatFlag: "mov" },
  { id: "webm", label: "WebM", ext: "webm", formatFlag: "webm" },
  { id: "avi", label: "AVI", ext: "avi", formatFlag: "avi" },
  { id: "ts", label: "TS", ext: "ts", formatFlag: "mpegts" },
];

export interface ConvertSettings {
  inputPath: string;
  inputName: string;
  outputName: string;
  container: string; // container id
  videoCodec: string; // libx264 | libx265 | libvpx-vp9 | copy
  preset: string; // ultrafast .. veryslow | ""
  crf: number; // 0..51
  resolution: string; // "keep" | "720p" | "1080p" | "4k"
  framerate: string; // "keep" | "24" | "30" | "60"
  audioCodec: string; // aac | libmp3lame | libopus | copy
  audioBitrate: string; // 64k .. 320k
  sampleRate: string; // "44100" | "48000" | "96000"
  channels: string; // "1" | "2" | "6"
  hwaccel: string; // none | cuda | qsv | videotoolbox
  pixfmt: string; // yuv420p | yuv444p | nv12
  faststart: boolean;
}

export const DEFAULT_CONVERT: ConvertSettings = {
  inputPath: "",
  inputName: "input.mp4",
  outputName: "output.mkv",
  container: "mkv",
  videoCodec: "libx264",
  preset: "medium",
  crf: 23,
  resolution: "keep",
  framerate: "keep",
  audioCodec: "aac",
  audioBitrate: "128k",
  sampleRate: "44100",
  channels: "2",
  hwaccel: "none",
  pixfmt: "yuv420p",
  faststart: true,
};

const RES_MAP: Record<string, string> = {
  "720p": "1280:720",
  "1080p": "1920:1080",
  "4k": "3840:2160",
};

const RES_LABEL: Record<string, string> = {
  keep: "scale=keep",
  "720p": "scale=1280:720",
  "1080p": "scale=1920:1080",
  "4k": "scale=3840:2160",
};

const FPS_LABEL: Record<string, string> = {
  keep: "-r keep",
  "24": "-r 24",
  "30": "-r 30",
  "60": "-r 60",
};

export function buildConvertCommand(s: ConvertSettings): CommandResult {
  const c = CONTAINERS.find((x) => x.id === s.container) || CONTAINERS[1];
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];

  if (s.hwaccel && s.hwaccel !== "none") {
    args.push("-hwaccel", s.hwaccel);
    tokens.push({ type: "flag", text: "-hwaccel" }, { type: "val", text: s.hwaccel });
    breakdown.push({ flag: `-hwaccel ${s.hwaccel}`, desc: "硬件加速 / Hardware accel" });
  }

  args.push("-i", s.inputName);
  tokens.push({ type: "flag", text: "-i" }, { type: "file", text: s.inputName });
  breakdown.push({ flag: `-i ${s.inputName}`, desc: "输入文件 / Input file" });

  if (s.videoCodec === "copy") {
    args.push("-c:v", "copy");
    tokens.push({ type: "flag", text: "-c:v" }, { type: "val", text: "copy" });
    breakdown.push({ flag: "-c:v copy", desc: "视频流复制 / Video stream copy" });
  } else {
    args.push("-c:v", s.videoCodec);
    tokens.push({ type: "flag", text: "-c:v" }, { type: "val", text: s.videoCodec });
    breakdown.push({ flag: `-c:v ${s.videoCodec}`, desc: "视频编码器 / Video codec" });
    if (s.preset && (s.videoCodec === "libx264" || s.videoCodec === "libx265")) {
      args.push("-preset", s.preset);
      tokens.push({ type: "flag", text: "-preset" }, { type: "val", text: s.preset });
      breakdown.push({ flag: `-preset ${s.preset}`, desc: "编码预设 / Encoding preset" });
    }
    args.push("-crf", String(s.crf));
    tokens.push({ type: "flag", text: "-crf" }, { type: "val", text: String(s.crf) });
    breakdown.push({
      flag: `-crf ${s.crf}`,
      desc: "质量因子 (越低越高) / Quality factor (lower=higher)",
    });
    if (s.resolution !== "keep") {
      const scale = RES_MAP[s.resolution];
      if (scale) {
        args.push("-vf", `scale=${scale}`);
        tokens.push({ type: "flag", text: "-vf" }, { type: "str", text: `scale=${scale}` });
        breakdown.push({ flag: `-vf scale=${scale}`, desc: "缩放 / Resize" });
      }
    }
    if (s.framerate !== "keep") {
      args.push("-r", s.framerate);
      tokens.push({ type: "flag", text: "-r" }, { type: "val", text: s.framerate });
      breakdown.push({ flag: `-r ${s.framerate}`, desc: "帧率 / Framerate" });
    }
    args.push("-pix_fmt", s.pixfmt);
    tokens.push({ type: "flag", text: "-pix_fmt" }, { type: "val", text: s.pixfmt });
    breakdown.push({ flag: `-pix_fmt ${s.pixfmt}`, desc: "像素格式 / Pixel format" });
  }

  if (s.audioCodec === "copy") {
    args.push("-c:a", "copy");
    tokens.push({ type: "flag", text: "-c:a" }, { type: "val", text: "copy" });
    breakdown.push({ flag: "-c:a copy", desc: "音频流复制 / Audio stream copy" });
  } else {
    args.push("-c:a", s.audioCodec);
    tokens.push({ type: "flag", text: "-c:a" }, { type: "val", text: s.audioCodec });
    breakdown.push({ flag: `-c:a ${s.audioCodec}`, desc: "音频编码器 / Audio codec" });
    args.push("-b:a", s.audioBitrate);
    tokens.push({ type: "flag", text: "-b:a" }, { type: "val", text: s.audioBitrate });
    breakdown.push({ flag: `-b:a ${s.audioBitrate}`, desc: "音频码率 / Audio bitrate" });
    args.push("-ar", s.sampleRate);
    tokens.push({ type: "flag", text: "-ar" }, { type: "val", text: s.sampleRate });
    breakdown.push({ flag: `-ar ${s.sampleRate}`, desc: "采样率 / Sample rate" });
    args.push("-ac", s.channels);
    tokens.push({ type: "flag", text: "-ac" }, { type: "val", text: s.channels });
    breakdown.push({ flag: `-ac ${s.channels}`, desc: "声道 / Channels" });
  }

  if (s.faststart && (s.container === "mp4" || s.container === "mov")) {
    args.push("-movflags", "+faststart");
    tokens.push({ type: "flag", text: "-movflags" }, { type: "val", text: "+faststart" });
    breakdown.push({ flag: "-movflags +faststart", desc: "快速启动 / Faststart" });
  }

  if (c.formatFlag) {
    args.push("-f", c.formatFlag);
    tokens.push({ type: "flag", text: "-f" }, { type: "val", text: c.formatFlag });
    breakdown.push({ flag: `-f ${c.formatFlag}`, desc: "容器格式 / Container" });
  }

  // -y to overwrite without prompting
  args.push("-y", s.outputName);
  tokens.push({ type: "flag", text: "-y" }, { type: "file", text: s.outputName });
  breakdown.push({ flag: s.outputName, desc: "输出文件 / Output file" });

  // size/time estimate (cosmetic): CRF ~23 → ~0.7x; lower CRF → larger
  const crfFactor = s.videoCodec === "copy" ? 1 : Math.max(0.2, 1.1 - s.crf / 60);
  const sizeRatio = c.ext === "webm" ? 0.55 * crfFactor : 0.74 * crfFactor;
  const estSec = 72 * (s.preset === "ultrafast" ? 0.2 : s.preset === "veryslow" ? 3 : 1);

  return { args, tokens, breakdown, sizeRatio, estSec };
}

export function convertHint(s: ConvertSettings): { scaleHint: string; fpsHint: string } {
  return {
    scaleHint: RES_LABEL[s.resolution] || "scale=keep",
    fpsHint: FPS_LABEL[s.framerate] || "-r keep",
  };
}

// -----------------------------------------------------------------
// Cut & Trim
// -----------------------------------------------------------------

export interface CutSettings {
  inputPath: string;
  inputName: string;
  outputName: string;
  startSec: number;
  endSec: number;
  totalSec: number;
  mode: "copy" | "encode";
}

export function buildCutCommand(s: CutSettings): CommandResult {
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];

  const ss = fmtTimecode(s.startSec);
  const to = fmtTimecode(s.endSec);

  // -ss before -i for speed when copying; the design shows -ss ... -to ... -i
  args.push("-ss", ss, "-to", to, "-i", s.inputName);
  tokens.push(
    { type: "flag", text: "-ss" },
    { type: "val", text: ss },
    { type: "flag", text: "-to" },
    { type: "val", text: to },
    { type: "flag", text: "-i" },
    { type: "file", text: s.inputName }
  );
  breakdown.push({ flag: `-ss ${ss}`, desc: "起始定位 / Seek start position" });
  breakdown.push({ flag: `-to ${to}`, desc: "结束时间 / End time" });
  breakdown.push({ flag: `-i ${s.inputName}`, desc: "输入文件 / Input file" });

  if (s.mode === "copy") {
    args.push("-c", "copy");
    tokens.push({ type: "flag", text: "-c" }, { type: "val", text: "copy" });
    breakdown.push({ flag: "-c copy", desc: "流复制 不重编码 / Stream copy, no re-encode" });
  } else {
    args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac");
    tokens.push(
      { type: "flag", text: "-c:v" },
      { type: "val", text: "libx264" },
      { type: "flag", text: "-preset" },
      { type: "val", text: "medium" },
      { type: "flag", text: "-crf" },
      { type: "val", text: "23" },
      { type: "flag", text: "-c:a" },
      { type: "val", text: "aac" }
    );
    breakdown.push({ flag: "-c:v libx264", desc: "重编码 H.264 / Re-encode H.264" });
    breakdown.push({ flag: "-preset medium -crf 23", desc: "中等质量 / Medium quality" });
    breakdown.push({ flag: "-c:a aac", desc: "音频重编码 AAC / Audio re-encode AAC" });
  }

  args.push("-y", s.outputName);
  tokens.push({ type: "flag", text: "-y" }, { type: "file", text: s.outputName });
  breakdown.push({ flag: s.outputName, desc: "输出文件 / Output file" });

  const dur = Math.max(0, s.endSec - s.startSec);
  const totalRatio = s.totalSec > 0 ? dur / s.totalSec : 0.2;
  const sizeRatio = s.mode === "copy" ? totalRatio : totalRatio * 0.95;
  const estSec = s.mode === "copy" ? 3 : Math.max(3, dur * 1.2);

  return { args, tokens, breakdown, sizeRatio, estSec };
}

function fmtTimecode(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

// -----------------------------------------------------------------
// Video Filters
// -----------------------------------------------------------------

export interface FilterItem {
  id: string;
  name: string;
  args: string;
}

export const FILTER_PALETTE = [
  "scale",
  "crop",
  "transpose",
  "hflip",
  "vflip",
  "fps",
  "pad",
  "drawtext",
  "eq",
  "blur",
  "sharpen",
  "fade",
  "overlay",
];

export const FILTER_DEFAULT_ARGS: Record<string, string> = {
  scale: "1280:720",
  crop: "1200:680",
  transpose: "1",
  hflip: "",
  vflip: "",
  fps: "30",
  pad: "1920:1080:0:0",
  drawtext: "text='FFmpeg Studio'",
  eq: "brightness=0.06:saturation=1.2",
  blur: "luma_radius=5:luma_power=1",
  sharpen: "luma_msize_x=5:luma_msize_y=5:luma_amount=1.0",
  fade: "t=in:st=0:d=1",
  overlay: "0:0",
};

export const FILTER_PARAM_REF: { expr: string; desc: string }[] = [
  { expr: "scale=W:H", desc: "缩放 / Resize" },
  { expr: "crop=W:H:X:Y", desc: "裁剪 / Crop" },
  { expr: "transpose=1", desc: "旋转 90° / Rotate 90°" },
  { expr: "fps=N", desc: "帧率 / Framerate" },
];

export interface FilterSettings {
  inputPath: string;
  inputName: string;
  outputName: string;
  filters: FilterItem[];
  audioCopy: boolean;
}

export function buildFilterCommand(s: FilterSettings): CommandResult {
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];

  args.push("-i", s.inputName);
  tokens.push({ type: "flag", text: "-i" }, { type: "file", text: s.inputName });
  breakdown.push({ flag: `-i ${s.inputName}`, desc: "输入文件 / Input file" });

  const chain = s.filters
    .map((f) => (f.args ? `${f.name}=${f.args}` : f.name))
    .join(",");

  if (chain) {
    args.push("-vf", chain);
    tokens.push({ type: "flag", text: "-vf" }, { type: "str", text: `"${chain}"` });
    breakdown.push({
      flag: `-vf "..."`,
      desc: "滤镜图 按顺序应用 / Filter graph, applied in order",
    });
    s.filters.forEach((f) => {
      const expr = f.args ? `${f.name}=${f.args}` : f.name;
      breakdown.push({ flag: expr, desc: filterDesc(f.name) });
    });
  }

  if (s.audioCopy) {
    args.push("-c:a", "copy");
    tokens.push({ type: "flag", text: "-c:a" }, { type: "val", text: "copy" });
    breakdown.push({
      flag: "-c:a copy",
      desc: "音频流直接复制 不重编码 / Audio stream copy, no re-encode",
    });
  }

  // video needs re-encode when filters are applied
  args.push("-c:v", "libx264", "-preset", "medium");
  tokens.push(
    { type: "flag", text: "-c:v" },
    { type: "val", text: "libx264" },
    { type: "flag", text: "-preset" },
    { type: "val", text: "medium" }
  );

  args.push("-y", s.outputName);
  tokens.push({ type: "flag", text: "-y" }, { type: "file", text: s.outputName });
  breakdown.push({ flag: s.outputName, desc: "输出文件 / Output file" });

  // filters generally don't shrink size much
  const sizeRatio = 0.85;
  const estSec = Math.max(8, s.filters.length * 12);

  return { args, tokens, breakdown, sizeRatio, estSec };
}

function filterDesc(name: string): string {
  const map: Record<string, string> = {
    scale: "缩放 / Resize",
    crop: "裁剪 / Crop",
    transpose: "旋转 / Rotate",
    hflip: "水平翻转 / Horizontal flip",
    vflip: "垂直翻转 / Vertical flip",
    fps: "帧率 / Framerate",
    pad: "填充 / Pad",
    drawtext: "文字 / Draw text",
    eq: "色彩 / Equalize",
    blur: "模糊 / Blur",
    sharpen: "锐化 / Sharpen",
    fade: "淡入淡出 / Fade",
    overlay: "叠加 / Overlay",
  };
  return map[name] || name;
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}
