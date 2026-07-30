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
    { type: "file", text: s.inputName },
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
      { type: "val", text: "aac" },
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

  const chain = s.filters.map((f) => (f.args ? `${f.name}=${f.args}` : f.name)).join(",");

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
    { type: "val", text: "medium" },
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

// -----------------------------------------------------------------
// Merge (video concat)
// -----------------------------------------------------------------

export interface MergeFileEntry {
  id: string;
  path: string;
  filename: string;
  duration?: number;
}

export interface MergeSettings {
  files: MergeFileEntry[];
  outputName: string;
  mode: "demuxer" | "filter"; // demuxer = -f concat (lossless, same codec); filter = -filter_complex concat (re-encode)
}

export const DEFAULT_MERGE: MergeSettings = {
  files: [],
  outputName: "merged_output.mp4",
  mode: "demuxer",
};

export function buildMergeCommand(s: MergeSettings): CommandResult {
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];
  const names: string[] = s.files.length
    ? s.files.map((f) => f.filename)
    : ["clip1.mp4", "clip2.mp4", "clip3.mp4"];
  const count = names.length;

  if (s.mode === "demuxer") {
    args.push("-f", "concat", "-safe", "0", "-i", "concat_list.txt");
    tokens.push(
      { type: "flag", text: "-f" },
      { type: "val", text: "concat" },
      { type: "flag", text: "-safe" },
      { type: "val", text: "0" },
      { type: "flag", text: "-i" },
      { type: "file", text: "concat_list.txt" },
    );
    breakdown.push({
      flag: `-f concat -i concat_list.txt`,
      desc: `Concat 解复用器 / Concat demuxer (${count} files, same codec required)`,
    });
    args.push("-c", "copy");
    tokens.push({ type: "flag", text: "-c" }, { type: "val", text: "copy" });
    breakdown.push({ flag: "-c copy", desc: "流复制不重编码 / Stream copy, no re-encode" });
  } else {
    let vi = 0;
    let ai = 0;
    for (const n of names) {
      args.push("-i", n);
      tokens.push({ type: "flag", text: "-i" }, { type: "file", text: n });
    }
    breakdown.push({
      flag: `-i ${names.join(" -i ")}`,
      desc: `${count} 个输入文件 / ${count} input files`,
    });
    const filter = `concat=n=${count}:v=1:a=1 [v][a]`;
    args.push("-filter_complex", filter, "-map", "[v]", "-map", "[a]");
    tokens.push(
      { type: "flag", text: "-filter_complex" },
      { type: "str", text: `"${filter}"` },
      { type: "flag", text: "-map" },
      { type: "val", text: "[v]" },
      { type: "flag", text: "-map" },
      { type: "val", text: "[a]" },
    );
    breakdown.push({ flag: filter, desc: "Concat 滤镜重编码 / Concat filter (re-encode)" });
    args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "128k");
    tokens.push(
      { type: "flag", text: "-c:v" },
      { type: "val", text: "libx264" },
      { type: "flag", text: "-preset" },
      { type: "val", text: "medium" },
      { type: "flag", text: "-crf" },
      { type: "val", text: "23" },
      { type: "flag", text: "-c:a" },
      { type: "val", text: "aac" },
      { type: "flag", text: "-b:a" },
      { type: "val", text: "128k" },
    );
    breakdown.push({ flag: "-c:v libx264 -crf 23", desc: "视频重编码 / Re-encode video" });
    breakdown.push({ flag: "-c:a aac -b:a 128k", desc: "音频重编码 / Re-encode audio" });
  }

  args.push("-y", s.outputName);
  tokens.push({ type: "flag", text: "-y" }, { type: "file", text: s.outputName });
  breakdown.push({ flag: s.outputName, desc: "输出文件 / Output file" });

  const sizeRatio = s.mode === "demuxer" ? count * 0.98 : count * 0.8;
  const estSec = s.mode === "demuxer" ? Math.max(5, count * 6) : Math.max(30, count * 45);
  return { args, tokens, breakdown, sizeRatio, estSec };
}

// -----------------------------------------------------------------
// Audio (extract / transcode / trim / volume)
// -----------------------------------------------------------------

export type AudioMode = "extract" | "transcode" | "trim" | "volume";

export interface AudioSettings {
  inputPath: string;
  inputName: string;
  outputName: string;
  mode: AudioMode;
  trackIdx: string; // "0" = 1st audio track
  format: "mp3" | "aac" | "wav" | "flac" | "m4a" | "opus";
  sampleRate: string;
  channels: string;
  bitrate: string;
  startSec: number; // for trim mode
  endSec: number; // for trim mode
  totalSec: number;
  volumeDb: number; // for volume mode
}

export const DEFAULT_AUDIO: AudioSettings = {
  inputPath: "",
  inputName: "input.mp4",
  outputName: "audio.mp3",
  mode: "extract",
  trackIdx: "0",
  format: "mp3",
  sampleRate: "44100",
  channels: "2",
  bitrate: "192k",
  startSec: 0,
  endSec: 0,
  totalSec: 0,
  volumeDb: 3,
};

const AUDIO_CODEC_MAP: Record<AudioSettings["format"], string> = {
  mp3: "libmp3lame",
  aac: "aac",
  wav: "pcm_s16le",
  flac: "flac",
  m4a: "aac",
  opus: "libopus",
};

export function buildAudioCommand(s: AudioSettings): CommandResult {
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];

  if (s.mode === "trim" && s.startSec > 0) {
    const ss = fmtTimecode(s.startSec);
    args.push("-ss", ss);
    tokens.push({ type: "flag", text: "-ss" }, { type: "val", text: ss });
    breakdown.push({ flag: `-ss ${ss}`, desc: "起始定位 / Seek start" });
  }

  args.push("-i", s.inputName);
  tokens.push({ type: "flag", text: "-i" }, { type: "file", text: s.inputName });
  breakdown.push({ flag: `-i ${s.inputName}`, desc: "输入文件 / Input" });

  if (s.mode === "trim" && s.endSec > s.startSec) {
    const to = fmtTimecode(s.endSec);
    args.push("-to", to);
    tokens.push({ type: "flag", text: "-to" }, { type: "val", text: to });
    breakdown.push({ flag: `-to ${to}`, desc: "结束 / End time" });
  }

  switch (s.mode) {
    case "extract": {
      args.push("-vn", "-map", `0:a:${s.trackIdx}`);
      tokens.push(
        { type: "flag", text: "-vn" },
        { type: "flag", text: "-map" },
        { type: "val", text: `0:a:${s.trackIdx}` },
      );
      breakdown.push({
        flag: `-vn -map 0:a:${s.trackIdx}`,
        desc: `提取音轨 #${s.trackIdx} / Extract audio track`,
      });
      const codec = AUDIO_CODEC_MAP[s.format];
      args.push("-c:a", codec, "-b:a", s.bitrate, "-ar", s.sampleRate, "-ac", s.channels);
      tokens.push(
        { type: "flag", text: "-c:a" },
        { type: "val", text: codec },
        { type: "flag", text: "-b:a" },
        { type: "val", text: s.bitrate },
        { type: "flag", text: "-ar" },
        { type: "val", text: s.sampleRate },
        { type: "flag", text: "-ac" },
        { type: "val", text: s.channels },
      );
      breakdown.push({ flag: `-c:a ${codec} -b:a ${s.bitrate}`, desc: "音频编码 / Audio encode" });
      break;
    }
    case "transcode": {
      args.push("-vn", "-map", `0:a:${s.trackIdx}`);
      tokens.push(
        { type: "flag", text: "-vn" },
        { type: "flag", text: "-map" },
        { type: "val", text: `0:a:${s.trackIdx}` },
      );
      const codec = AUDIO_CODEC_MAP[s.format];
      args.push("-c:a", codec, "-b:a", s.bitrate, "-ar", s.sampleRate, "-ac", s.channels);
      tokens.push(
        { type: "flag", text: "-c:a" },
        { type: "val", text: codec },
        { type: "flag", text: "-b:a" },
        { type: "val", text: s.bitrate },
        { type: "flag", text: "-ar" },
        { type: "val", text: s.sampleRate },
        { type: "flag", text: "-ac" },
        { type: "val", text: s.channels },
      );
      breakdown.push({
        flag: `-c:a ${codec} -b:a ${s.bitrate} -ar ${s.sampleRate} -ac ${s.channels}`,
        desc: "转码 / Transcode",
      });
      break;
    }
    case "trim": {
      args.push("-vn");
      tokens.push({ type: "flag", text: "-vn" });
      const codec = AUDIO_CODEC_MAP[s.format];
      args.push("-c:a", codec, "-b:a", s.bitrate);
      tokens.push(
        { type: "flag", text: "-c:a" },
        { type: "val", text: codec },
        { type: "flag", text: "-b:a" },
        { type: "val", text: s.bitrate },
      );
      breakdown.push({ flag: `-c:a ${codec}`, desc: "裁剪后编码 / Encode trimmed" });
      break;
    }
    case "volume": {
      const filter = `volume=${s.volumeDb}dB`;
      args.push("-af", filter);
      tokens.push({ type: "flag", text: "-af" }, { type: "str", text: filter });
      breakdown.push({
        flag: filter,
        desc: `音量增益 ${s.volumeDb > 0 ? "+" : ""}${s.volumeDb} dB`,
      });
      args.push("-c:v", "copy");
      tokens.push({ type: "flag", text: "-c:v" }, { type: "val", text: "copy" });
      breakdown.push({ flag: "-c:v copy", desc: "视频流复制 / Video stream copy" });
      break;
    }
  }

  args.push("-y", s.outputName);
  tokens.push({ type: "flag", text: "-y" }, { type: "file", text: s.outputName });
  breakdown.push({ flag: s.outputName, desc: "输出文件 / Output" });

  const dur = s.mode === "trim" ? Math.max(0, s.endSec - s.startSec) : s.totalSec;
  const sizeRatio = s.format === "wav" ? 8 : 0.15;
  const estSec = Math.max(3, dur * 0.8);
  return { args, tokens, breakdown, sizeRatio, estSec };
}

// -----------------------------------------------------------------
// Subtitles (burn-in / add track / extract)
// -----------------------------------------------------------------

export type SubtitleMode = "burn" | "add" | "extract";

export interface SubtitleSettings {
  inputPath: string;
  inputName: string;
  outputName: string;
  mode: SubtitleMode;
  subtitleFile: string; // for burn/add mode; empty -> use internal stream
  trackIdx: string; // for add/extract: which subtitle stream/track
  encoding: string; // e.g. "UTF-8", "GBK"
  forceStyle: string; // e.g. "FontName=SimHei,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000"
  container: "mp4" | "mkv" | "mov";
}

export const DEFAULT_SUBTITLE: SubtitleSettings = {
  inputPath: "",
  inputName: "input.mp4",
  outputName: "subtitled_output.mp4",
  mode: "burn",
  subtitleFile: "",
  trackIdx: "0",
  encoding: "UTF-8",
  forceStyle: "",
  container: "mp4",
};

export function buildSubtitleCommand(s: SubtitleSettings): CommandResult {
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];

  if (s.mode === "burn" && s.subtitleFile) {
    args.push("-i", s.inputName);
    tokens.push({ type: "flag", text: "-i" }, { type: "file", text: s.inputName });
    breakdown.push({ flag: `-i ${s.inputName}`, desc: "输入视频 / Video input" });

    const stylePart = s.forceStyle ? `:force_style='${s.forceStyle}'` : "";
    const encPart = s.encoding !== "UTF-8" ? `:charenc=${s.encoding.toLowerCase()}` : "";
    const filter = `subtitles='${s.subtitleFile}'${encPart}${stylePart}`;
    args.push("-vf", filter);
    tokens.push(
      { type: "flag", text: "-vf" },
      { type: "str", text: `subtitles='…'${encPart}${stylePart}` },
    );
    breakdown.push({ flag: "subtitles=", desc: "字幕烧录到画面 / Burn-in subtitles" });
    args.push("-c:v", "libx264", "-c:a", "copy");
    tokens.push(
      { type: "flag", text: "-c:v" },
      { type: "val", text: "libx264" },
      { type: "flag", text: "-c:a" },
      { type: "val", text: "copy" },
    );
    breakdown.push({
      flag: "-c:v libx264 -c:a copy",
      desc: "视频重编码 音频复制 / Video re-encode, audio copy",
    });
  } else if (s.mode === "add") {
    args.push("-i", s.inputName);
    tokens.push({ type: "flag", text: "-i" }, { type: "file", text: s.inputName });
    breakdown.push({ flag: `-i ${s.inputName}`, desc: "输入视频 / Video input" });
    if (s.subtitleFile) {
      args.push("-i", s.subtitleFile);
      tokens.push({ type: "flag", text: "-i" }, { type: "file", text: s.subtitleFile });
      breakdown.push({ flag: `-i ${s.subtitleFile}`, desc: "输入字幕 / Subtitle input" });
      args.push("-c", "copy", "-c:s", "mov_text", "-map", "0", "-map", "1:0");
      tokens.push(
        { type: "flag", text: "-c" },
        { type: "val", text: "copy" },
        { type: "flag", text: "-c:s" },
        { type: "val", text: "mov_text" },
        { type: "flag", text: "-map" },
        { type: "val", text: "0" },
        { type: "flag", text: "-map" },
        { type: "val", text: "1:0" },
      );
      breakdown.push({
        flag: "-map 0 -map 1:0 -c copy -c:s mov_text",
        desc: "追加字幕轨 / Append subtitle track",
      });
    } else {
      args.push("-c", "copy");
      tokens.push({ type: "flag", text: "-c" }, { type: "val", text: "copy" });
      breakdown.push({ flag: "-c copy", desc: "保留原字幕轨 / Keep original streams" });
    }
  } else {
    // extract mode - only needs one input, ffmpeg with -map extracts to srt
    args.push("-i", s.inputName);
    tokens.push({ type: "flag", text: "-i" }, { type: "file", text: s.inputName });
    breakdown.push({ flag: `-i ${s.inputName}`, desc: "输入视频 / Video input" });
    args.push("-map", `0:s:${s.trackIdx}`);
    tokens.push({ type: "flag", text: "-map" }, { type: "val", text: `0:s:${s.trackIdx}` });
    breakdown.push({
      flag: `-map 0:s:${s.trackIdx}`,
      desc: `提取字幕流 #${s.trackIdx} / Extract subtitle stream`,
    });
  }

  args.push("-y", s.outputName);
  tokens.push({ type: "flag", text: "-y" }, { type: "file", text: s.outputName });
  breakdown.push({ flag: s.outputName, desc: "输出文件 / Output" });

  const sizeRatio = s.mode === "extract" ? 0.03 : s.mode === "add" ? 1.03 : 0.95;
  const estSec = s.mode === "extract" ? 5 : s.mode === "add" ? 10 : 90;
  return { args, tokens, breakdown, sizeRatio, estSec };
}

// -----------------------------------------------------------------
// GIF export (two-pass palettegen + paletteuse for quality)
// -----------------------------------------------------------------

export interface GifSettings {
  inputPath: string;
  inputName: string;
  outputName: string;
  startSec: number;
  endSec: number;
  totalSec: number;
  fps: number;
  width: number; // 0 = keep aspect ratio, scale by width only
  loop: number; // 0 = infinite
  paletteMode: "diff" | "full";
  dither: string; // e.g. "sierra2_4a", "bayer"
}

export const DEFAULT_GIF: GifSettings = {
  inputPath: "",
  inputName: "input.mp4",
  outputName: "output.gif",
  startSec: 0,
  endSec: 0,
  totalSec: 0,
  fps: 15,
  width: 480,
  loop: 0,
  paletteMode: "diff",
  dither: "sierra2_4a",
};

export function buildGifCommand(s: GifSettings): CommandResult {
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];

  const range = s.endSec > s.startSec;
  if (range) {
    args.push("-ss", fmtTimecode(s.startSec));
    tokens.push({ type: "flag", text: "-ss" }, { type: "val", text: fmtTimecode(s.startSec) });
    breakdown.push({ flag: `-ss ${fmtTimecode(s.startSec)}`, desc: "起始 / Start" });
  }
  args.push("-i", s.inputName);
  tokens.push({ type: "flag", text: "-i" }, { type: "file", text: s.inputName });
  breakdown.push({ flag: `-i ${s.inputName}`, desc: "输入 / Input" });
  if (range) {
    const dur = fmtTimecode(s.endSec - s.startSec);
    args.push("-t", dur);
    tokens.push({ type: "flag", text: "-t" }, { type: "val", text: dur });
    breakdown.push({ flag: `-t ${dur}`, desc: "时长 / Duration" });
  }

  // scale + fps filter; if width > 0 use width:-1 for preserve aspect
  const scale = s.width > 0 ? `scale=${s.width}:-1:flags=lanczos` : "";
  const fps = `fps=${s.fps}`;
  const split1 = "[x];[x]";
  const paletteGen = `palettegen=stats_mode=${s.paletteMode}`;
  const paletteUse = `paletteuse=dither=${s.dither}`;
  const filter = `${scale ? scale + "," : ""}${fps}${split1}${paletteGen}[p];[x][p]${paletteUse}`;
  args.push("-filter_complex", filter, "-loop", String(s.loop));
  tokens.push(
    { type: "flag", text: "-filter_complex" },
    { type: "str", text: `"[palettegen] + [paletteuse]"` },
    { type: "flag", text: "-loop" },
    { type: "val", text: String(s.loop) },
  );
  breakdown.push({
    flag: `scale+fps + palettegen(${s.paletteMode}) + paletteuse(${s.dither})`,
    desc: "两步法调色板 GIF 高质量输出 / Two-pass palette GIF",
  });
  breakdown.push({
    flag: `-loop ${s.loop}`,
    desc: s.loop === 0 ? "无限循环 / Infinite loop" : `循环 ${s.loop} 次 / ${s.loop} loops`,
  });

  args.push("-y", s.outputName);
  tokens.push({ type: "flag", text: "-y" }, { type: "file", text: s.outputName });
  breakdown.push({ flag: s.outputName, desc: "输出 GIF / Output GIF" });

  const dur = range ? Math.max(1, s.endSec - s.startSec) : Math.max(1, s.totalSec);
  const sizeRatio = 0.4;
  const estSec = Math.max(6, dur * 4);
  return { args, tokens, breakdown, sizeRatio, estSec };
}

// -----------------------------------------------------------------
// Screen Record (platform-specific ffmpeg input device)
// -----------------------------------------------------------------

export type RecordSource = "screen" | "window" | "camera";

export interface RecordSettings {
  source: RecordSource;
  platform: "darwin" | "win32" | "linux";
  region: string; // e.g. "1920x1080" or "" for full
  offset: string; // e.g. "+0,0"
  fps: number;
  captureAudio: boolean;
  audioDevice: string; // device name
  vCodec: "libx264" | "libx265" | "h264_nvenc" | "h264_videotoolbox" | "h264_qsv";
  outputName: string;
}

export const DEFAULT_RECORD: RecordSettings = {
  source: "screen",
  platform: "linux",
  region: "",
  offset: "+0,0",
  fps: 30,
  captureAudio: true,
  audioDevice: "default",
  vCodec: "libx264",
  outputName: "screen_recording.mp4",
};

function recordInput(r: RecordSettings): { args: string[]; tokens: Token[]; desc: string } {
  const args: string[] = [];
  const tokens: Token[] = [];
  let desc = "";
  const fmt = (() => {
    if (r.source === "camera")
      return { darwin: "avfoundation", win32: "dshow", linux: "v4l2" }[r.platform];
    if (r.source === "window")
      return { darwin: "avfoundation", win32: "gdigrab", linux: "x11grab" }[r.platform];
    return { darwin: "avfoundation", win32: "gdigrab", linux: "x11grab" }[r.platform];
  })();
  args.push("-f", fmt, "-framerate", String(r.fps));
  tokens.push(
    { type: "flag", text: "-f" },
    { type: "val", text: fmt },
    { type: "flag", text: "-framerate" },
    { type: "val", text: String(r.fps) },
  );
  if (r.source === "screen" && r.region) {
    const videoSize = r.region + r.offset;
    args.push("-video_size", r.region, "-i", `${platformVideoInput(r.platform)}${r.offset}`);
    tokens.push(
      { type: "flag", text: "-video_size" },
      { type: "val", text: r.region },
      { type: "flag", text: "-i" },
      { type: "file", text: `${platformVideoInput(r.platform)}${r.offset}` },
    );
    desc = `屏幕录制 ${videoSize} / Screen record ${videoSize}`;
  } else {
    const input =
      r.source === "camera" ? platformCameraInput(r.platform) : platformVideoInput(r.platform);
    args.push("-i", input);
    tokens.push({ type: "flag", text: "-i" }, { type: "file", text: input });
    desc =
      r.source === "camera"
        ? `摄像头 / Camera ${input}`
        : r.source === "window"
          ? `窗口录制 / Window ${input}`
          : `全屏录制 / Full screen ${input}`;
  }
  return { args, tokens, desc };
}

export function platformVideoInput(p: string): string {
  if (p === "darwin") return "1:";
  if (p === "win32") return "desktop";
  return ":0.0";
}
export function platformCameraInput(p: string): string {
  if (p === "darwin") return "0:";
  if (p === "win32") return "video=Integrated Camera";
  return "/dev/video0";
}

export function buildRecordCommand(s: RecordSettings): CommandResult {
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];

  const input = recordInput(s);
  args.push(...input.args);
  tokens.push(...input.tokens);
  breakdown.push({ flag: `-f … -framerate ${s.fps} -i …`, desc: input.desc });

  if (s.captureAudio) {
    if (s.platform === "darwin") {
      args.push("-f", "avfoundation", "-i", `:${s.audioDevice}`);
      tokens.push(
        { type: "flag", text: "-f" },
        { type: "val", text: "avfoundation" },
        { type: "flag", text: "-i" },
        { type: "file", text: `:${s.audioDevice}` },
      );
    } else if (s.platform === "win32") {
      args.push("-f", "dshow", "-i", `audio=${s.audioDevice}`);
      tokens.push(
        { type: "flag", text: "-f" },
        { type: "val", text: "dshow" },
        { type: "flag", text: "-i" },
        { type: "file", text: `audio=${s.audioDevice}` },
      );
    } else {
      args.push("-f", "pulse", "-i", s.audioDevice);
      tokens.push(
        { type: "flag", text: "-f" },
        { type: "val", text: "pulse" },
        { type: "flag", text: "-i" },
        { type: "file", text: s.audioDevice },
      );
    }
    breakdown.push({ flag: "audio input", desc: `音频捕获 / Capture audio (${s.audioDevice})` });
  }

  args.push("-c:v", s.vCodec, "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p");
  tokens.push(
    { type: "flag", text: "-c:v" },
    { type: "val", text: s.vCodec },
    { type: "flag", text: "-preset" },
    { type: "val", text: "veryfast" },
    { type: "flag", text: "-crf" },
    { type: "val", text: "23" },
    { type: "flag", text: "-pix_fmt" },
    { type: "val", text: "yuv420p" },
  );
  breakdown.push({
    flag: `-c:v ${s.vCodec} -preset veryfast -crf 23`,
    desc: "实时编码 / Real-time encode",
  });
  if (s.captureAudio) {
    args.push("-c:a", "aac", "-b:a", "128k");
    tokens.push(
      { type: "flag", text: "-c:a" },
      { type: "val", text: "aac" },
      { type: "flag", text: "-b:a" },
      { type: "val", text: "128k" },
    );
    breakdown.push({ flag: "-c:a aac -b:a 128k", desc: "AAC 音频 / AAC audio" });
  }
  // use q instead of overwrite since recording is long running
  args.push("-q", s.outputName);
  tokens.push({ type: "flag", text: "-q" }, { type: "file", text: s.outputName });
  breakdown.push({ flag: s.outputName, desc: "输出文件 / Output (press 'q' to stop)" });

  return { args, tokens, breakdown, sizeRatio: 0.5, estSec: 60 };
}

// -----------------------------------------------------------------
// Streaming (RTMP / HLS / RTSP / SRT)
// -----------------------------------------------------------------

export type StreamProtocol = "rtmp" | "hls" | "rtsp" | "srt";

export interface StreamSettings {
  inputPath: string;
  inputName: string; // "" for "live device"
  isLive: boolean; // if true = camera/screen not file
  protocol: StreamProtocol;
  url: string; // ingest URL e.g. "rtmp://live.xx.com/app"
  key: string; // stream key (appended to URL)
  vCodec: "libx264" | "h264_nvenc" | "h264_videotoolbox" | "h264_qsv";
  aCodec: "aac" | "mp3";
  bitrateV: string; // e.g. "4000k"
  bitrateA: string; // e.g. "128k"
  preset: string;
  keyframeInterval: number; // e.g. 2 for 2s
  fps: number;
}

export const DEFAULT_STREAM: StreamSettings = {
  inputPath: "",
  inputName: "input.mp4",
  isLive: false,
  protocol: "rtmp",
  url: "",
  key: "",
  vCodec: "libx264",
  aCodec: "aac",
  bitrateV: "4000k",
  bitrateA: "128k",
  preset: "veryfast",
  keyframeInterval: 2,
  fps: 30,
};

export function buildStreamCommand(s: StreamSettings): CommandResult {
  const args: string[] = ["ffmpeg"];
  const tokens: Token[] = [{ type: "cmd", text: "ffmpeg" }];
  const breakdown: BreakdownItem[] = [];

  if (s.isLive) {
    args.push("-f", "x11grab", "-framerate", String(s.fps), "-i", ":0.0");
    tokens.push(
      { type: "flag", text: "-f" },
      { type: "val", text: "x11grab" },
      { type: "flag", text: "-framerate" },
      { type: "val", text: String(s.fps) },
      { type: "flag", text: "-i" },
      { type: "file", text: ":0.0" },
    );
    breakdown.push({ flag: "-f x11grab …", desc: "屏幕采集作为输入 / Desktop capture input" });
  } else if (s.inputName) {
    args.push("-re", "-i", s.inputName);
    tokens.push(
      { type: "flag", text: "-re" },
      { type: "flag", text: "-i" },
      { type: "file", text: s.inputName },
    );
    breakdown.push({
      flag: `-re -i ${s.inputName}`,
      desc: "按播放速率读入文件 / Read file at native rate",
    });
  }

  args.push("-c:v", s.vCodec);
  tokens.push({ type: "flag", text: "-c:v" }, { type: "val", text: s.vCodec });
  args.push(
    "-preset",
    s.preset,
    "-b:v",
    s.bitrateV,
    "-maxrate",
    s.bitrateV,
    "-bufsize",
    s.bitrateV,
  );
  args.push("-pix_fmt", "yuv420p", "-r", String(s.fps));
  args.push(
    "-g",
    String(s.fps * s.keyframeInterval),
    "-keyint_min",
    String(s.fps * s.keyframeInterval),
  );
  args.push("-sc_threshold", "0");
  tokens.push(
    { type: "flag", text: "-preset" },
    { type: "val", text: s.preset },
    { type: "flag", text: "-b:v" },
    { type: "val", text: s.bitrateV },
    { type: "flag", text: "-r" },
    { type: "val", text: String(s.fps) },
    { type: "flag", text: "-g" },
    { type: "val", text: String(s.fps * s.keyframeInterval) },
  );
  breakdown.push({
    flag: `-c:v ${s.vCodec} -b:v ${s.bitrateV} -preset ${s.preset} -g ${s.fps * s.keyframeInterval}`,
    desc: `视频编码 GOP=${s.keyframeInterval}s / Video encode`,
  });

  args.push("-c:a", s.aCodec, "-b:a", s.bitrateA, "-ar", "44100", "-ac", "2");
  tokens.push(
    { type: "flag", text: "-c:a" },
    { type: "val", text: s.aCodec },
    { type: "flag", text: "-b:a" },
    { type: "val", text: s.bitrateA },
  );
  breakdown.push({ flag: `-c:a ${s.aCodec} -b:a ${s.bitrateA}`, desc: "音频编码 / Audio encode" });

  let output = s.url;
  if (s.protocol === "rtmp" && s.key)
    output = (output.endsWith("/") ? output : output + "/") + s.key;
  if (s.protocol === "hls") output = s.url || "stream.m3u8";
  args.push("-f", protocolFormat(s.protocol), output);
  tokens.push(
    { type: "flag", text: "-f" },
    { type: "val", text: protocolFormat(s.protocol) },
    { type: "file", text: "STREAM_URL/KEY" },
  );
  breakdown.push({
    flag: `-f ${protocolFormat(s.protocol)} <${s.protocol} URL>`,
    desc: `${s.protocol.toUpperCase()} 推流 / ${s.protocol.toUpperCase()} push`,
  });
  return { args, tokens, breakdown, sizeRatio: 0, estSec: 0 };
}

function protocolFormat(p: StreamProtocol): string {
  switch (p) {
    case "rtmp":
    case "rtsp":
      return "flv";
    case "hls":
      return "hls";
    case "srt":
      return "mpegts";
  }
}
