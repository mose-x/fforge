// Bilingual string table. The UI shows "中 / EN" pairs everywhere;
// the active language is held in the zustand store.

export type Lang = "zh" | "en";

export interface Str {
  zh: string;
  en: string;
}

export const t = {
  // App / header
  appName: { zh: "FFmpeg 工作室", en: "FFmpeg Studio" },
  theme: { zh: "切换主题", en: "Theme" },
  settings: { zh: "设置", en: "Settings" },
  help: { zh: "帮助", en: "Help" },
  // Sidebar sections
  secMedia: { zh: "媒体处理 / Media", en: "Media" },
  secAV: { zh: "音视频 / Audio & Video", en: "Audio & Video" },
  secAdv: { zh: "高级 / Advanced", en: "Advanced" },
  // Sidebar items
  navFormatConvert: { zh: "格式转换", en: "Format Convert" },
  navCutTrim: { zh: "视频剪辑", en: "Cut & Trim" },
  navMerge: { zh: "视频合并", en: "Merge" },
  navFilters: { zh: "滤镜效果", en: "Filters" },
  navAudio: { zh: "音频处理", en: "Audio" },
  navSubtitles: { zh: "字幕处理", en: "Subtitles" },
  navGif: { zh: "GIF 动图", en: "GIF" },
  navRecord: { zh: "录屏录制", en: "Screen Record" },
  navStream: { zh: "流媒体", en: "Streaming" },
  navInfo: { zh: "媒体信息", en: "Media Info" },
  // Engine status
  ready: { zh: "就绪 / Ready", en: "Ready" },
  running: { zh: "运行中 / Running", en: "Running" },
  notInstalled: { zh: "未安装 / Not installed", en: "Not installed" },
  // Work area
  preview: { zh: "预览命令 / Preview", en: "Preview" },
  start: { zh: "开始转换 / Start", en: "Start" },
  extract: { zh: "开始截取 / Extract", en: "Extract" },
  apply: { zh: "应用滤镜 / Apply", en: "Apply" },
  // Format convert
  inputSource: { zh: "输入源 / Input Source", en: "Input Source" },
  sourceInfo: { zh: "源文件信息 / Source info", en: "Source info" },
  changeFile: { zh: "更换文件 / Change file", en: "Change file" },
  selectFile: { zh: "选择文件 / Select file", en: "Select file" },
  noFileSelected: { zh: "未选择文件", en: "No file selected" },
  output: { zh: "输出设置 / Output", en: "Output" },
  filename: { zh: "输出文件名 / Filename", en: "Filename" },
  container: { zh: "容器格式 / Container", en: "Container" },
  videoEncode: { zh: "视频编码 / Video Encode", en: "Video Encode" },
  codec: { zh: "编码器 / Codec", en: "Codec" },
  preset: { zh: "预设 / Preset", en: "Preset" },
  crf: { zh: "CRF 质量 / Quality", en: "Quality" },
  resolution: { zh: "分辨率 / Resolution", en: "Resolution" },
  framerate: { zh: "帧率 / Framerate", en: "Framerate" },
  audioEncode: { zh: "音频编码 / Audio Encode", en: "Audio Encode" },
  bitrate: { zh: "码率 / Bitrate", en: "Bitrate" },
  sampleRate: { zh: "采样率 / Sample rate", en: "Sample rate" },
  channels: { zh: "声道 / Channels", en: "Channels" },
  advanced: { zh: "高级选项 / Advanced", en: "Advanced" },
  hwaccel: { zh: "硬件加速 / Hardware accel", en: "Hardware accel" },
  pixfmt: { zh: "像素格式 / Pixel format", en: "Pixel format" },
  faststart: { zh: "快速启动 / Faststart", en: "Faststart" },
  keepSrc: { zh: "保持原分辨率 / Keep source", en: "Keep source" },
  keep: { zh: "保持 / Keep", en: "Keep" },
  // Cut & trim
  timeline: { zh: "时间轴截取 / Timeline Selection", en: "Timeline Selection" },
  start2: { zh: "起始 / Start", en: "Start" },
  end: { zh: "结束 / End", en: "End" },
  duration: { zh: "时长 / Duration", en: "Duration" },
  mode: { zh: "截取模式 / Mode", en: "Mode" },
  modeFast: { zh: "快速无损 / Fast lossless", en: "Fast lossless" },
  modePrecise: { zh: "精确重编码 / Precise re-encode", en: "Precise re-encode" },
  modeFastHint: {
    zh: "-c copy = 流复制 不重编码 速度最快 / Stream copy, no re-encode, fastest",
    en: "-c copy = Stream copy, no re-encode, fastest",
  },
  tipSS: {
    zh: "提示：将 -ss 放在 -i 之前速度更快（输入定位），放在 -i 之后更精确（帧级定位）。 / Tip: placing -ss before -i is faster (input seek); after -i is frame-accurate.",
    en: "Tip: placing -ss before -i is faster (input seek); after -i is frame-accurate.",
  },
  // Filters
  filterChain: { zh: "滤镜链构建 / Filter Chain Builder", en: "Filter Chain Builder" },
  addFilter: { zh: "添加滤镜 / Add Filter", en: "Add Filter" },
  addFilterHint: { zh: "点击添加到滤镜链 / Click to append", en: "Click to append" },
  paramsRef: { zh: "参数参考 / Params Reference", en: "Params Reference" },
  remove: { zh: "移除 / Remove", en: "Remove" },
  // Console
  command: { zh: "FFmpeg 命令 / Command", en: "FFmpeg Command" },
  live: { zh: "实时预览 / live", en: "live" },
  copy: { zh: "复制 / Copy", en: "Copy" },
  collapse: { zh: "折叠 / Collapse", en: "Collapse" },
  expand: { zh: "展开 / Expand", en: "Expand" },
  copied: { zh: "已复制 / Copied", en: "Copied" },
  // Status bar
  estOut: { zh: "预计输出", en: "est. output" },
  estTime: { zh: "用时", en: "est. time" },
  // Toasts / dialogs
  ffmpegMissing: {
    zh: "未检测到 ffmpeg，无法执行。请安装 ffmpeg 后重试。",
    en: "ffmpeg not detected. Please install ffmpeg and retry.",
  },
  done: { zh: "转换完成 / Done", en: "Done" },
  failed: { zh: "转换失败 / Failed", en: "Failed" },
  runningMsg: { zh: "正在处理…", en: "Processing…" },
  openFolder: { zh: "打开所在文件夹 / Open folder", en: "Open folder" },
  selectOutput: { zh: "选择输出位置", en: "Choose output location" },
  // Coming soon
  comingSoon: { zh: "即将推出 / Coming soon", en: "Coming soon" },
  // filter params reference
  pScale: { zh: "缩放 / Resize", en: "Resize" },
  pCrop: { zh: "裁剪 / Crop", en: "Crop" },
  pTranspose: { zh: "旋转 90° / Rotate 90°", en: "Rotate 90°" },
  pFps: { zh: "帧率 / Framerate", en: "Framerate" },
} as const;

export type StrKey = keyof typeof t;

export function pick(s: Str, lang: Lang): string {
  return lang === "zh" ? s.zh : s.en;
}
