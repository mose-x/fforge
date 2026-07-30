import { useMemo, useState } from "react";
import {
  FileVideo,
  Save,
  Film,
  AudioWaveform,
  Settings2,
  ArrowRightLeft,
  Play,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import {
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Segmented,
  PillGroup,
  Toggle,
  Range,
  ButtonSecondary,
  Badge,
} from "../components/ui";
import {
  buildConvertCommand,
  convertHint,
  CONTAINERS,
  DEFAULT_CONVERT,
  type ConvertSettings,
} from "../lib/command";
import { t, pick } from "../lib/i18n";
import { fmtSize, fmtTime } from "../lib/format";
import { useMediaInput } from "../lib/useMediaInput";
import { useRunner } from "../lib/useRunner";

const PRESETS = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "medium",
  "slow",
  "slower",
  "veryslow",
];
const AUDIO_BITRATES = ["64k", "128k", "192k", "256k", "320k"];

export function FormatConvertPage() {
  const { lang, inputInfo } = useStore();
  const { pickFile } = useMediaInput();
  const { run } = useRunner();

  const [s, setS] = useState<ConvertSettings>(DEFAULT_CONVERT);

  // sync input name from store when a file is picked
  const inputName = inputInfo?.filename || s.inputName;
  const inputPath = inputInfo?.path || "";
  const settings: ConvertSettings = { ...s, inputName, inputPath };

  const command = useMemo(() => buildConvertCommand(settings), [settings]);
  const hints = useMemo(() => convertHint(settings), [settings]);
  const inputSize = inputInfo?.sizeBytes || 0;

  const set = <K extends keyof ConvertSettings>(k: K, v: ConvertSettings[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  // when container changes, update the output extension
  const setContainer = (id: string) => {
    const c = CONTAINERS.find((x) => x.id === id);
    setS((prev) => {
      const base = prev.outputName.replace(/\.[^.]+$/, "");
      return { ...prev, container: id, outputName: `${base}.${c?.ext || id}` };
    });
  };

  const primary: PageAction = {
    icon: <ArrowRightLeft className="w-4 h-4" />,
    label: pick(t.start, lang),
    disabled: !inputPath,
    onClick: () => {
      run(command, inputName, inputPath, settings.outputName, inputInfo?.duration || 0);
    },
  };

  return (
    <WorkArea
      breadcrumb={t.secMedia}
      title={{ zh: "格式转换 / Format Convert", en: "Format Convert" }}
      previewLabel={pick(t.preview, lang)}
      primary={primary}
      command={command}
      inputSize={inputSize}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== Input source card ===== */}
        <Card>
          <CardHeader
            icon={<FileVideo className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.inputSource, lang)}
            hint={pick(t.sourceInfo, lang)}
          />
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="ffs-mono text-sm truncate max-w-[60%]">{inputName}</span>
            {inputInfo ? (
              <Badge>{fmtTime(inputInfo.duration)}</Badge>
            ) : (
              <Badge>{pick(t.noFileSelected, lang)}</Badge>
            )}
          </div>
          {inputInfo ? (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] text-muted-foreground">
                  {pick(t.resolution, lang)}
                </span>
                <span className="ffs-mono text-xs truncate">
                  {inputInfo.width ? `${inputInfo.width}×${inputInfo.height}` : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] text-muted-foreground">{pick(t.codec, lang)}</span>
                <span className="ffs-mono text-xs truncate">{inputInfo.codec || "—"}</span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] text-muted-foreground">
                  {pick({ zh: "大小", en: "Size" }, lang)}
                </span>
                <span className="ffs-mono text-xs truncate">{inputInfo.sizeHuman || "—"}</span>
              </div>
            </div>
          ) : (
            <div className="mb-3 text-xs text-muted-foreground">
              {lang === "zh"
                ? "点击下方按钮选择一个媒体文件。"
                : "Click the button below to select a media file."}
            </div>
          )}
          <ButtonSecondary icon={<FileVideo className="w-3.5 h-3.5" />} onClick={() => pickFile()}>
            {inputPath ? pick(t.changeFile, lang) : pick(t.selectFile, lang)}
          </ButtonSecondary>
        </Card>

        {/* ===== Output card ===== */}
        <Card>
          <CardHeader
            icon={<Save className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.output, lang)}
          />
          <Field label={pick(t.filename, lang)}>
            <Input value={settings.outputName} onChange={(v) => set("outputName", v)} />
          </Field>
          <div className="h-3" />
          <Field
            label={pick(t.container, lang)}
            hint={`-f ${CONTAINERS.find((c) => c.id === settings.container)?.formatFlag || ""}`}
          >
            <PillGroup
              options={CONTAINERS.map((c) => ({ value: c.id, label: c.label }))}
              value={settings.container}
              onChange={setContainer}
              variant="solid"
            />
          </Field>
        </Card>

        {/* ===== Video encode card ===== */}
        <Card>
          <CardHeader
            icon={<Film className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.videoEncode, lang)}
          />
          <div className="flex flex-col gap-3">
            <Field label={pick(t.codec, lang)} hint={`-c:v ${settings.videoCodec}`}>
              <Segmented
                size="sm"
                value={settings.videoCodec}
                onChange={(v) => set("videoCodec", v)}
                options={[
                  { value: "libx264", label: "libx264" },
                  { value: "libx265", label: "libx265" },
                  { value: "libvpx-vp9", label: "libvpx-vp9" },
                  { value: "copy", label: "copy" },
                ]}
              />
            </Field>

            {settings.videoCodec !== "copy" && (
              <>
                <Field label={pick(t.preset, lang)} hint={`-preset ${settings.preset}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => {
                      const active = settings.preset === p;
                      return (
                        <button
                          key={p}
                          onClick={() => set("preset", p)}
                          className={`h-7 px-2.5 rounded-md text-xs border transition-colors ${
                            active
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label={pick(t.crf, lang)} hint={`-crf ${settings.crf}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">0</span>
                    <span className="ffs-mono text-sm">{settings.crf}</span>
                    <span className="text-[11px] text-muted-foreground">51</span>
                  </div>
                  <Range value={settings.crf} min={0} max={51} onChange={(v) => set("crf", v)} />
                </Field>

                <Field label={pick(t.resolution, lang)} hint={hints.scaleHint}>
                  <Select value={settings.resolution} onChange={(v) => set("resolution", v)}>
                    <option value="keep">{pick(t.keepSrc, lang)}</option>
                    <option value="720p">1280×720 (720p)</option>
                    <option value="1080p">1920×1080 (1080p)</option>
                    <option value="4k">3840×2160 (4K)</option>
                  </Select>
                </Field>

                <Field label={pick(t.framerate, lang)} hint={hints.fpsHint}>
                  <Select value={settings.framerate} onChange={(v) => set("framerate", v)}>
                    <option value="keep">{pick(t.keep, lang)}</option>
                    <option value="24">24 fps</option>
                    <option value="30">30 fps</option>
                    <option value="60">60 fps</option>
                  </Select>
                </Field>
              </>
            )}
          </div>
        </Card>

        {/* ===== Audio encode card ===== */}
        <Card>
          <CardHeader
            icon={<AudioWaveform className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.audioEncode, lang)}
          />
          <div className="flex flex-col gap-3">
            <Field label={pick(t.codec, lang)} hint={`-c:a ${settings.audioCodec}`}>
              <Segmented
                size="sm"
                value={settings.audioCodec}
                onChange={(v) => set("audioCodec", v)}
                options={[
                  { value: "aac", label: "aac" },
                  { value: "libmp3lame", label: "libmp3lame" },
                  { value: "libopus", label: "libopus" },
                  { value: "copy", label: "copy" },
                ]}
              />
            </Field>

            {settings.audioCodec !== "copy" && (
              <>
                <Field label={pick(t.bitrate, lang)} hint={`-b:a ${settings.audioBitrate}`}>
                  <PillGroup
                    variant="soft"
                    value={settings.audioBitrate}
                    onChange={(v) => set("audioBitrate", v)}
                    options={AUDIO_BITRATES.map((b) => ({ value: b, label: b }))}
                  />
                </Field>

                <Field label={pick(t.sampleRate, lang)} hint={`-ar ${settings.sampleRate}`}>
                  <Select value={settings.sampleRate} onChange={(v) => set("sampleRate", v)}>
                    <option value="44100">44100 Hz</option>
                    <option value="48000">48000 Hz</option>
                    <option value="96000">96000 Hz</option>
                  </Select>
                </Field>

                <Field label={pick(t.channels, lang)} hint={`-ac ${settings.channels}`}>
                  <Select value={settings.channels} onChange={(v) => set("channels", v)}>
                    <option value="1">mono</option>
                    <option value="2">stereo</option>
                    <option value="6">5.1</option>
                  </Select>
                </Field>
              </>
            )}
          </div>
        </Card>

        {/* ===== Advanced card (full-width) ===== */}
        <Card span="full">
          <CardHeader
            icon={<Settings2 className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.advanced, lang)}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={pick(t.hwaccel, lang)} hint={`-hwaccel ${settings.hwaccel}`}>
              <Select value={settings.hwaccel} onChange={(v) => set("hwaccel", v)}>
                <option value="none">none</option>
                <option value="cuda">cuda</option>
                <option value="qsv">qsv</option>
                <option value="videotoolbox">videotoolbox</option>
              </Select>
            </Field>
            <Field label={pick(t.pixfmt, lang)} hint={`-pix_fmt ${settings.pixfmt}`}>
              <Select value={settings.pixfmt} onChange={(v) => set("pixfmt", v)}>
                <option value="yuv420p">yuv420p</option>
                <option value="yuv444p">yuv444p</option>
                <option value="nv12">nv12</option>
              </Select>
            </Field>
            <Field
              label={pick(t.faststart, lang)}
              hint={settings.faststart ? "-movflags +faststart" : "(off)"}
            >
              <Toggle
                checked={settings.faststart}
                onChange={(v) => set("faststart", v)}
                label="+faststart"
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* mobile/narrow: surface a quick start shortcut at the bottom of the content */}
      <div className="lg:hidden flex gap-2 mt-4">
        <ButtonSecondary
          icon={<Play className="w-4 h-4" />}
          disabled={!inputPath}
          className="flex-1"
        >
          {pick(t.preview, lang)}
        </ButtonSecondary>
      </div>
    </WorkArea>
  );
}
