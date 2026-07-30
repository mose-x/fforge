import { useMemo, useState, useEffect } from "react";
import {
  FileVideo,
  Info,
  Download,
  ChevronDown,
  ChevronUp,
  Film,
  AudioWaveform,
  Subtitles,
  List,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import { Card, CardHeader, Field, Input, ButtonSecondary, Badge } from "../components/ui";
import { t, pick } from "../lib/i18n";
import { fmtSize, fmtTime, copyText } from "../lib/format";
import { useMediaInput } from "../lib/useMediaInput";
import type { CommandResult, BreakdownItem, Token } from "../lib/command";
import type { MediaInfo } from "../lib/types";

interface ProbeStream {
  index?: number;
  codec_type?: string;
  codec_name?: string;
  codec_long_name?: string;
  profile?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bits_per_sample?: number;
  color_space?: string;
  color_transfer?: string;
  color_primaries?: string;
  color_range?: string;
  tags?: Record<string, string>;
  [key: string]: any;
}

interface ProbeChapter {
  id?: number;
  start_time?: string;
  end_time?: string;
  tags?: { title?: string; [k: string]: any };
  [key: string]: any;
}

interface ProbeFormat {
  filename?: string;
  nb_streams?: number;
  nb_programs?: number;
  format_name?: string;
  format_long_name?: string;
  start_time?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
  probe_score?: number;
  tags?: Record<string, string>;
  [key: string]: any;
}

interface ProbeMediaExtended {
  format?: ProbeFormat;
  streams?: ProbeStream[];
  chapters?: ProbeChapter[];
  RawJSON?: string;
}

function buildFfprobeCommand(inputName: string): CommandResult {
  const args = [
    "ffprobe",
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-show_chapters",
    inputName,
  ];
  const tokens: Token[] = [
    { type: "cmd", text: "ffprobe" },
    { type: "flag", text: "-v" },
    { type: "val", text: "error" },
    { type: "flag", text: "-show_format" },
    { type: "flag", text: "-show_streams" },
    { type: "flag", text: "-show_chapters" },
    { type: "file", text: inputName },
  ];
  const breakdown: BreakdownItem[] = [
    { flag: "-show_format", desc: "显示容器格式信息 / Show container info" },
    { flag: "-show_streams", desc: "显示所有流信息 / Show all streams" },
    { flag: "-show_chapters", desc: "显示章节信息 / Show chapters" },
  ];
  return { args, tokens, breakdown, sizeRatio: 0, estSec: 0 };
}

export function MediaInfoPage() {
  const { lang, inputInfo, toast } = useStore();
  const { pickFile } = useMediaInput();

  const inputName = inputInfo?.filename || "input.mp4";
  const inputPath = inputInfo?.path || "";

  const [extendedInfo, setExtendedInfo] = useState<ProbeMediaExtended | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const command = useMemo(() => buildFfprobeCommand(inputName), [inputName]);
  const inputSize = inputInfo?.sizeBytes || 0;

  const fetchExtendedInfo = async (path: string) => {
    if (!path) return;
    setLoading(true);
    try {
      const fn = (window as any).go?.main?.App?.ProbeMediaExtended;
      if (typeof fn === "function") {
        const info = await fn(path);
        if (info) setExtendedInfo(info);
      } else {
        setExtendedInfo(null);
      }
    } catch (e) {
      setExtendedInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inputPath) {
      fetchExtendedInfo(inputPath);
    } else {
      setExtendedInfo(null);
    }
  }, [inputPath]);

  const handleReProbe = async () => {
    if (!inputPath) {
      toast(lang === "zh" ? "请先选择文件" : "Please select a file first", "error");
      return;
    }
    await fetchExtendedInfo(inputPath);
    toast(lang === "zh" ? "已重新分析文件" : "File re-probed", "success");
  };

  const handleExportJSON = async () => {
    const raw = extendedInfo?.RawJSON || "";
    if (!raw) {
      toast(lang === "zh" ? "暂无 JSON 数据" : "No JSON data available", "error");
      return;
    }
    const ok = await copyText(raw);
    if (ok) {
      toast(pick(t.copied, lang), "success");
    }
  };

  const primary: PageAction = {
    icon: <Info className="w-4 h-4" />,
    label: pick(t.infoRefresh, lang),
    disabled: !inputPath,
    onClick: handleReProbe,
  };

  const fmt = extendedInfo?.format;
  const streams = extendedInfo?.streams || [];
  const videoStreams = streams.filter((s) => s.codec_type === "video");
  const audioStreams = streams.filter((s) => s.codec_type === "audio");
  const subtitleStreams = streams.filter((s) => s.codec_type === "subtitle");
  const chapters = extendedInfo?.chapters || [];
  const rawJSON = extendedInfo?.RawJSON || "";

  return (
    <WorkArea
      breadcrumb={t.secAdv}
      title={{ zh: "媒体信息 / Media Info", en: "Media Info" }}
      previewLabel={pick(t.preview, lang)}
      primary={primary}
      command={command}
      inputSize={inputSize}
    >
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center gap-2 flex-wrap">
            <FileVideo className="w-4 h-4 text-primary shrink-0" />
            <span className="ffs-mono text-sm truncate max-w-[40%]">{inputName}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {inputInfo?.duration ? <Badge>{fmtTime(inputInfo.duration)}</Badge> : null}
              {inputInfo?.width ? <Badge>{`${inputInfo.width}×${inputInfo.height}`}</Badge> : null}
              {inputInfo?.sizeHuman ? <Badge>{inputInfo.sizeHuman}</Badge> : null}
            </div>
            <ButtonSecondary
              icon={<FileVideo className="w-3.5 h-3.5" />}
              onClick={() => pickFile()}
              className="ml-auto"
            >
              {inputPath ? pick(t.changeFile, lang) : pick(t.selectFile, lang)}
            </ButtonSecondary>
          </div>
        </Card>

        {inputInfo && (
          <>
            <Card>
              <CardHeader
                icon={<List className="w-4 h-4 text-primary shrink-0" />}
                title={pick(t.infoGeneral, lang)}
                hint="format"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Field label={pick({ zh: "文件路径", en: "Path" }, lang)}>
                  <Input value={inputInfo.path} disabled />
                </Field>
                <Field label={pick({ zh: "文件名", en: "Filename" }, lang)}>
                  <Input value={inputInfo.filename} disabled />
                </Field>
                <Field label={pick({ zh: "容器格式", en: "Container" }, lang)}>
                  <Input value={fmt?.format_name || inputInfo.container || "—"} disabled />
                </Field>
                <Field label={pick({ zh: "总时长", en: "Duration" }, lang)}>
                  <Input
                    value={
                      fmt?.duration
                        ? fmtTime(parseFloat(fmt.duration))
                        : inputInfo.duration
                          ? fmtTime(inputInfo.duration)
                          : "—"
                    }
                    disabled
                  />
                </Field>
                <Field label={pick({ zh: "文件大小", en: "Size" }, lang)}>
                  <Input
                    value={fmt?.size ? fmtSize(parseInt(fmt.size)) : inputInfo.sizeHuman || "—"}
                    disabled
                  />
                </Field>
                <Field label={pick({ zh: "总码率", en: "Bitrate" }, lang)}>
                  <Input
                    value={
                      fmt?.bit_rate
                        ? `${(parseInt(fmt.bit_rate) / 1000).toFixed(1)} kbps`
                        : inputInfo.bitRate
                          ? `${(inputInfo.bitRate / 1000).toFixed(1)} kbps`
                          : "—"
                    }
                    disabled
                  />
                </Field>
                {fmt?.format_long_name && (
                  <Field label={pick({ zh: "格式全称", en: "Format long" }, lang)}>
                    <Input value={fmt.format_long_name} disabled />
                  </Field>
                )}
                {fmt?.nb_streams !== undefined && (
                  <Field label={pick({ zh: "流数量", en: "Streams" }, lang)}>
                    <Input value={String(fmt.nb_streams)} disabled />
                  </Field>
                )}
              </div>
            </Card>

            {videoStreams.length > 0 && (
              <Card>
                <CardHeader
                  icon={<Film className="w-4 h-4 text-primary shrink-0" />}
                  title={pick(t.infoVideo, lang)}
                  hint={`${videoStreams.length} stream(s)`}
                />
                <div className="flex flex-col gap-4">
                  {videoStreams.map((s, i) => (
                    <div key={i} className="border border-border rounded-md p-3 bg-muted/20">
                      <div className="text-xs font-semibold mb-2 text-muted-foreground">
                        {pick(t.infoStreamN, lang)}
                        {s.index ?? i} (video)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <Field label={pick(t.codec, lang)}>
                          <Input value={s.codec_name || "—"} disabled />
                        </Field>
                        {s.profile && (
                          <Field label={pick({ zh: "Profile", en: "Profile" }, lang)}>
                            <Input value={s.profile} disabled />
                          </Field>
                        )}
                        <Field label={pick(t.resolution, lang)}>
                          <Input
                            value={
                              s.width && s.height
                                ? `${s.width}×${s.height}`
                                : inputInfo?.width && inputInfo?.height
                                  ? `${inputInfo.width}×${inputInfo.height}`
                                  : "—"
                            }
                            disabled
                          />
                        </Field>
                        {s.pix_fmt && (
                          <Field label={pick({ zh: "像素格式", en: "Pixel fmt" }, lang)}>
                            <Input value={s.pix_fmt} disabled />
                          </Field>
                        )}
                        <Field label={pick(t.framerate, lang)}>
                          <Input
                            value={
                              s.r_frame_rate && s.r_frame_rate !== "0/0"
                                ? evalFps(s.r_frame_rate)
                                : inputInfo?.fps
                                  ? String(inputInfo.fps)
                                  : "—"
                            }
                            disabled
                          />
                        </Field>
                        {s.bit_rate && (
                          <Field label={pick(t.bitrate, lang)}>
                            <Input
                              value={`${(parseInt(s.bit_rate) / 1000).toFixed(1)} kbps`}
                              disabled
                            />
                          </Field>
                        )}
                        {(s.color_space ||
                          s.color_transfer ||
                          s.color_primaries ||
                          s.color_range) && (
                          <Field label={pick({ zh: "色彩信息", en: "Color info" }, lang)}>
                            <Input
                              value={
                                [s.color_range, s.color_space, s.color_transfer, s.color_primaries]
                                  .filter(Boolean)
                                  .join(" / ") || "—"
                              }
                              disabled
                            />
                          </Field>
                        )}
                      </div>
                      {s.tags && Object.keys(s.tags).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {Object.entries(s.tags).map(([k, v]) => (
                            <Badge key={k} mono={false}>
                              {k}: {String(v).slice(0, 40)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {audioStreams.length > 0 && (
              <Card>
                <CardHeader
                  icon={<AudioWaveform className="w-4 h-4 text-primary shrink-0" />}
                  title={pick(t.infoAudio, lang)}
                  hint={`${audioStreams.length} stream(s)`}
                />
                <div className="flex flex-col gap-4">
                  {audioStreams.map((s, i) => (
                    <div key={i} className="border border-border rounded-md p-3 bg-muted/20">
                      <div className="text-xs font-semibold mb-2 text-muted-foreground">
                        {pick(t.infoStreamN, lang)}
                        {s.index ?? i} (audio)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <Field label={pick(t.codec, lang)}>
                          <Input value={s.codec_name || inputInfo?.audioCodec || "—"} disabled />
                        </Field>
                        {s.sample_rate && (
                          <Field label={pick(t.sampleRate, lang)}>
                            <Input value={`${s.sample_rate} Hz`} disabled />
                          </Field>
                        )}
                        {s.channels !== undefined && (
                          <Field label={pick(t.channels, lang)}>
                            <Input
                              value={
                                s.channel_layout
                                  ? `${s.channels} (${s.channel_layout})`
                                  : String(s.channels)
                              }
                              disabled
                            />
                          </Field>
                        )}
                        {s.bit_rate && (
                          <Field label={pick(t.bitrate, lang)}>
                            <Input
                              value={`${(parseInt(s.bit_rate) / 1000).toFixed(1)} kbps`}
                              disabled
                            />
                          </Field>
                        )}
                        {s.channel_layout && (
                          <Field label={pick({ zh: "声道布局", en: "Channel layout" }, lang)}>
                            <Input value={s.channel_layout} disabled />
                          </Field>
                        )}
                      </div>
                      {s.tags && Object.keys(s.tags).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {Object.entries(s.tags).map(([k, v]) => (
                            <Badge key={k} mono={false}>
                              {k}: {String(v).slice(0, 40)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {subtitleStreams.length > 0 && (
              <Card>
                <CardHeader
                  icon={<Subtitles className="w-4 h-4 text-primary shrink-0" />}
                  title={pick(t.infoSubtitle, lang)}
                  hint={`${subtitleStreams.length} stream(s)`}
                />
                <div className="flex flex-col gap-2">
                  {subtitleStreams.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 border border-border rounded-md p-3 bg-muted/20 flex-wrap"
                    >
                      <Badge>
                        {pick(t.infoStreamN, lang)}
                        {s.index ?? i}
                      </Badge>
                      <Badge>{s.codec_name || "—"}</Badge>
                      {s.tags?.language && <Badge mono={false}>lang: {s.tags.language}</Badge>}
                      {s.tags?.title && <Badge mono={false}>{s.tags.title}</Badge>}
                      {s.tags &&
                        Object.entries(s.tags)
                          .filter(([k]) => !["language", "title"].includes(k))
                          .slice(0, 3)
                          .map(([k, v]) => (
                            <Badge key={k} mono={false}>
                              {k}: {String(v).slice(0, 24)}
                            </Badge>
                          ))}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {chapters.length > 0 && (
              <Card>
                <CardHeader
                  icon={<List className="w-4 h-4 text-primary shrink-0" />}
                  title={pick(t.infoChapters, lang)}
                  hint={`${chapters.length} chapters`}
                />
                <div className="flex flex-col gap-2">
                  {chapters.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 border border-border rounded-md p-3 bg-muted/20 flex-wrap"
                    >
                      <Badge>#{c.id ?? i}</Badge>
                      <Badge>
                        {fmtTime(parseFloat(c.start_time || "0"))} →{" "}
                        {fmtTime(parseFloat(c.end_time || "0"))}
                      </Badge>
                      {c.tags?.title && <Badge mono={false}>{c.tags.title}</Badge>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <div className="flex items-center justify-between mb-3">
                <CardHeader
                  icon={<Info className="w-4 h-4 text-primary shrink-0" />}
                  title={pick(t.infoRaw, lang)}
                />
                <div className="flex items-center gap-2">
                  <ButtonSecondary
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleExportJSON}
                  >
                    {pick(t.infoExport, lang)}
                  </ButtonSecondary>
                  <button
                    onClick={() => setRawExpanded((v) => !v)}
                    className="h-9 px-3 rounded-md border border-border text-sm hover:bg-muted flex items-center gap-1.5 transition-colors"
                  >
                    {rawExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    <span className="ffs-mono text-xs text-muted-foreground">
                      {rawExpanded ? pick(t.collapse, lang) : pick(t.expand, lang)}
                    </span>
                  </button>
                </div>
              </div>
              {rawExpanded ? (
                <textarea
                  value={rawJSON || JSON.stringify({ format: fmt, streams, chapters }, null, 2)}
                  readOnly
                  className="w-full h-80 rounded-md border border-border bg-input p-3 text-xs ffs-mono resize-none focus:outline-none"
                />
              ) : (
                <textarea
                  value={rawJSON || JSON.stringify({ format: fmt, streams, chapters }, null, 2)}
                  readOnly
                  className="w-full h-28 rounded-md border border-border bg-input p-3 text-xs ffs-mono resize-none focus:outline-none"
                />
              )}
            </Card>
          </>
        )}

        {!inputInfo && (
          <Card>
            <div className="text-sm text-muted-foreground py-4 text-center">
              {lang === "zh"
                ? "选择一个媒体文件以查看详细信息。"
                : "Select a media file to view detailed information."}
            </div>
          </Card>
        )}
      </div>
    </WorkArea>
  );
}

function evalFps(rate: string): string {
  try {
    const [a, b] = rate.split("/").map(Number);
    if (!isNaN(a) && !isNaN(b) && b !== 0) {
      const v = a / b;
      if (isFinite(v)) return `${v.toFixed(2)} fps`;
    }
  } catch {
    /* ignore */
  }
  return rate;
}
