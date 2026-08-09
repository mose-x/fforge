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
  done: { zh: "转换完成 / Done", en: "Done" },
  notInstalled: { zh: "未安装 / Not installed", en: "Not installed" },
  // Work area
  preview: { zh: "预览命令 / Preview", en: "Preview" },
  start: { zh: "开始转换 / Start", en: "Start" },
  extract: { zh: "开始截取 / Extract", en: "Extract" },
  apply: { zh: "应用滤镜 / Apply", en: "Apply" },
  startMerge: { zh: "开始合并 / Merge", en: "Merge" },
  startExtract: { zh: "开始提取 / Extract", en: "Extract" },
  startBurn: { zh: "开始烧录 / Burn", en: "Burn" },
  startGif: { zh: "生成 GIF / Export GIF", en: "Export GIF" },
  startRecord: { zh: "开始录制 / Record", en: "Record" },
  stopRecord: { zh: "停止录制 / Stop", en: "Stop" },
  startStream: { zh: "开始推流 / Stream", en: "Stream" },
  // Update dialog
  updateTitle: { zh: "检查更新 / Check Update", en: "Check Update" },
  updateCurrentVersion: { zh: "当前版本", en: "Current version" },
  updateChecking: { zh: "正在检查更新...", en: "Checking for updates..." },
  updateLatest: { zh: "已是最新版本", en: "You are on the latest version" },
  updateNewVersion: { zh: "发现新版本", en: "New version available" },
  updateDownload: { zh: "下载更新 / Download", en: "Download" },
  updateDownloading: { zh: "正在下载...", en: "Downloading..." },
  updateReady: {
    zh: "下载完成，点击安装并重启",
    en: "Download complete. Click to install and restart.",
  },
  updateApply: { zh: "安装并重启 / Install & Restart", en: "Install & Restart" },
  updateRetry: { zh: "重试 / Retry", en: "Retry" },
  updateRestarting: { zh: "正在重启应用...", en: "Restarting app..." },
  updateMajor: { zh: "大版本更新", en: "Major update" },
  updateMajorHint: {
    zh: "这是大版本更新，请下载安装器并手动运行。安装后会刷新内置 FFmpeg。",
    en: "This is a major update. Download and run the installer manually; it refreshes the bundled FFmpeg.",
  },
  updateDownloadInstaller: { zh: "下载安装器 / Download Installer", en: "Download Installer" },
  updateCheckBtn: { zh: "检查更新", en: "Check Update" },
  // Format convert
  inputSource: { zh: "输入源 / Input Source", en: "Input Source" },
  sourceInfo: { zh: "源文件信息 / Source info", en: "Source info" },
  changeFile: { zh: "更换文件 / Change file", en: "Change file" },
  selectFile: { zh: "选择文件 / Select file", en: "Select file" },
  selectFiles: { zh: "选择多个文件 / Select files", en: "Select files" },
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
  // Merge
  mergeInputFiles: { zh: "合并文件列表 / Input files", en: "Input files" },
  mergeMethod: { zh: "合并方式 / Method", en: "Method" },
  mergeMethodConcat: { zh: "Concat 解复用 (无损) / Concat demux", en: "Concat demux (lossless)" },
  mergeMethodFilter: {
    zh: "Concat 滤镜 (重编码) / Concat filter",
    en: "Concat filter (re-encode)",
  },
  mergeReorderHint: {
    zh: "拖动调整顺序，文件需编码参数一致才能用 Concat 解复用。 / Files must have identical codecs for concat demux.",
    en: "Files must have identical codecs for concat demux.",
  },
  // Audio
  audioMode: { zh: "处理类型 / Mode", en: "Mode" },
  audioModeExtract: { zh: "提取音轨 / Extract track", en: "Extract track" },
  audioModeConvert: { zh: "音频转码 / Transcode", en: "Transcode" },
  audioModeTrim: { zh: "音频裁剪 / Trim", en: "Trim" },
  audioModeVolume: { zh: "音量调整 / Volume", en: "Volume" },
  audioTrack: { zh: "音轨选择 / Track", en: "Track" },
  audioFormat: { zh: "输出格式 / Format", en: "Format" },
  audioSampleRate: { zh: "采样率 / Sample rate", en: "Sample rate" },
  audioChannels: { zh: "声道 / Channels", en: "Channels" },
  audioBitrate: { zh: "码率 / Bitrate", en: "Bitrate" },
  audioVolumeDb: { zh: "音量增益 (dB) / Gain dB", en: "Gain dB" },
  // Subtitles
  subtitleMode: { zh: "处理类型 / Mode", en: "Mode" },
  subtitleModeBurn: { zh: "烧录到画面 / Burn-in", en: "Burn-in" },
  subtitleModeAdd: { zh: "添加字幕轨 / Add track", en: "Add track" },
  subtitleModeExtract: { zh: "提取字幕 / Extract", en: "Extract" },
  subtitleFile: { zh: "字幕文件 / Subtitle file", en: "Subtitle file" },
  subtitleTrackIdx: { zh: "字幕流索引 / Stream index", en: "Stream index" },
  subtitleEncoding: { zh: "字符编码 / Encoding", en: "Encoding" },
  subtitleForceStyle: { zh: "强制样式 / Force style", en: "Force style" },
  // GIF
  gifStartTime: { zh: "开始时间 / Start", en: "Start" },
  gifEndTime: { zh: "结束时间 / End", en: "End" },
  gifFps: { zh: "帧率 / FPS", en: "FPS" },
  gifWidth: { zh: "宽度 / Width", en: "Width" },
  gifLoop: { zh: "循环次数 / Loop count", en: "Loop count" },
  gifPaletteMode: { zh: "调色板模式 / Palette", en: "Palette" },
  gifPaletteDither: { zh: "抖动算法 / Dither", en: "Dither" },
  gifHint: {
    zh: "两步法：先 palettegen 统计调色板，再 paletteuse 输出 GIF，质量显著提升。 / Two-pass: palettegen + paletteuse for much better quality.",
    en: "Two-pass: palettegen + paletteuse for much better quality.",
  },
  // Screen Record
  recordSource: { zh: "录制源 / Source", en: "Source" },
  recordSourceScreen: { zh: "屏幕 / Screen", en: "Screen" },
  recordSourceWindow: { zh: "窗口 / Window", en: "Window" },
  recordSourceCamera: { zh: "摄像头 / Camera", en: "Camera" },
  recordArea: { zh: "录制区域 / Region", en: "Region" },
  recordFps: { zh: "帧率 / FPS", en: "FPS" },
  recordAudio: { zh: "录制音频 / Capture audio", en: "Capture audio" },
  recordAudioDevice: { zh: "音频设备 / Audio device", en: "Audio device" },
  recordCodec: { zh: "编码器 / Codec", en: "Codec" },
  recordOutput: { zh: "输出文件 / Output", en: "Output" },
  recordHint: {
    zh: "录制前请确认已授予屏幕录制权限。macOS 需在 系统设置→隐私与安全性 允许。 / Grant screen recording permission before starting.",
    en: "Grant screen recording permission before starting.",
  },
  // Streaming
  streamProtocol: { zh: "协议 / Protocol", en: "Protocol" },
  streamUrl: { zh: "推流地址 / URL", en: "URL" },
  streamKey: { zh: "推流密钥 / Stream key", en: "Stream key" },
  streamVCodec: { zh: "视频编码 / Video codec", en: "Video codec" },
  streamACodec: { zh: "音频编码 / Audio codec", en: "Audio codec" },
  streamBitrateV: { zh: "视频码率 / Video bitrate", en: "Video bitrate" },
  streamBitrateA: { zh: "音频码率 / Audio bitrate", en: "Audio bitrate" },
  streamPreset: { zh: "编码预设 / Preset", en: "Preset" },
  streamKeyframe: { zh: "关键帧间隔 (GOP) / Keyframe interval", en: "Keyframe interval" },
  streamHint: {
    zh: "直播推流默认使用 RTMP，输入你获得的推流地址和密钥。 / RTMP streaming — paste your ingest URL and key.",
    en: "RTMP streaming — paste your ingest URL and key.",
  },
  // Media Info
  infoRefresh: { zh: "重新分析 / Re-probe", en: "Re-probe" },
  infoExport: { zh: "导出 JSON / Export JSON", en: "Export JSON" },
  infoGeneral: { zh: "常规 / General", en: "General" },
  infoVideo: { zh: "视频流 / Video stream", en: "Video stream" },
  infoAudio: { zh: "音频流 / Audio stream", en: "Audio stream" },
  infoSubtitle: { zh: "字幕流 / Subtitle stream", en: "Subtitle stream" },
  infoStreamN: { zh: "流 #", en: "Stream #" },
  infoChapters: { zh: "章节 / Chapters", en: "Chapters" },
  infoRaw: { zh: "原始 ffprobe JSON / Raw JSON", en: "Raw JSON" },
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
