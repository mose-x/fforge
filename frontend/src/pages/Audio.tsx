import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { FileAudio, Music, Info } from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import {
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Segmented,
  Range,
  ButtonSecondary,
  Badge,
} from "../components/ui";
import {
  buildAudioCommand,
  DEFAULT_AUDIO,
  type AudioSettings,
  type AudioMode,
} from "../lib/command";
import { t, pick } from "../lib/i18n";
import { fmtTime, parseTime } from "../lib/format";
import { useMediaInput } from "../lib/useMediaInput";
import { useRunner } from "../lib/useRunner";

const AUDIO_FORMATS: Array<{ value: AudioSettings["format"]; label: string }> = [
  { value: "mp3", label: "MP3" },
  { value: "aac", label: "AAC" },
  { value: "wav", label: "WAV" },
  { value: "flac", label: "FLAC" },
  { value: "m4a", label: "M4A" },
  { value: "opus", label: "Opus" },
];

const SAMPLE_RATES = ["44100", "48000", "96000"];
const CHANNEL_OPTS = [
  { value: "1", label: "mono (1)" },
  { value: "2", label: "stereo (2)" },
  { value: "6", label: "5.1 (6)" },
];
const BITRATES = ["96k", "128k", "192k", "256k", "320k"];
const TRACK_OPTS = ["0", "1", "2", "3"];

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1) : "";
}
function stripExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(0, idx) : name;
}

export function AudioPage() {
  const { lang, inputInfo } = useStore();
  const { pickFile } = useMediaInput();
  const { run } = useRunner();

  const [s, setS] = useState<AudioSettings>(DEFAULT_AUDIO);

  const inputName = inputInfo?.filename || s.inputName;
  const inputPath = inputInfo?.path || "";
  const totalSec = inputInfo?.duration || s.totalSec || 222;

  const set = <K extends keyof AudioSettings>(k: K, v: AudioSettings[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const setMode = (mode: AudioMode) => {
    setS((prev) => {
      let nextOutput = prev.outputName;
      if (mode === "volume") {
        const base = stripExt(inputName || prev.inputName);
        const ext = getExt(inputName || prev.inputName) || "mp4";
        nextOutput = `${base}_adjusted.${ext}`;
      } else if (mode === "extract" || mode === "transcode" || mode === "trim") {
        const base = stripExt(prev.outputName);
        nextOutput = `${base}.${prev.format}`;
      }
      return { ...prev, mode, outputName: nextOutput };
    });
  };

  const setFormat = (fmt: AudioSettings["format"]) => {
    setS((prev) => {
      const base = stripExt(prev.outputName);
      return { ...prev, format: fmt, outputName: `${base}.${fmt}` };
    });
  };

  const settings: AudioSettings = {
    ...s,
    inputName,
    inputPath,
    totalSec,
  };

  if (s.startSec === 0 && s.endSec === 0 && totalSec > 0) {
    settings.startSec = 0;
    settings.endSec = Math.min(totalSec, totalSec * 0.5 || 60);
  }

  const command = useMemo(() => buildAudioCommand(settings), [settings]);
  const inputSize = inputInfo?.sizeBytes || 0;

  useEffect(() => {
    if (settings.mode === "trim") {
      if (settings.startSec < 0) set("startSec", 0);
      if (settings.endSec > totalSec) set("endSec", totalSec);
      if (settings.startSec >= settings.endSec) set("startSec", Math.max(0, settings.endSec - 1));
    }
  }, [totalSec]); // eslint-disable-line react-hooks/exhaustive-deps

  const primaryLabel = s.mode === "volume" ? pick(t.start, lang) : pick(t.startExtract, lang);

  const primary: PageAction = {
    icon: <Music className="w-4 h-4" />,
    label: primaryLabel,
    disabled: !inputPath,
    onClick: () => run(command, inputName, inputPath, settings.outputName, totalSec),
  };

  const showTrackFields = s.mode === "extract" || s.mode === "transcode";
  const showTrimFields = s.mode === "trim";
  const showVolumeFields = s.mode === "volume";

  return (
    <WorkArea
      breadcrumb={t.secAV}
      title={{ zh: "音频处理 / Audio", en: "Audio" }}
      previewLabel={pick(t.preview, lang)}
      primary={primary}
      command={command}
      inputSize={inputSize}
    >
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center gap-2 flex-wrap">
            <FileAudio className="w-4 h-4 text-primary shrink-0" />
            <span className="ffs-mono text-sm truncate max-w-[40%]">{inputName}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge>{fmtTime(inputInfo?.duration || totalSec)}</Badge>
              {inputInfo?.sizeHuman ? <Badge>{inputInfo.sizeHuman}</Badge> : null}
            </div>
            <ButtonSecondary
              icon={<FileAudio className="w-3.5 h-3.5" />}
              onClick={() => pickFile()}
              className="ml-auto"
            >
              {inputPath ? pick(t.changeFile, lang) : pick(t.selectFile, lang)}
            </ButtonSecondary>
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={<Music className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.audioMode, lang)}
          />
          <Field label={pick(t.audioMode, lang)}>
            <Segmented
              size="md"
              value={s.mode}
              onChange={(v) => setMode(v as AudioMode)}
              options={[
                { value: "extract", label: pick(t.audioModeExtract, lang) },
                { value: "transcode", label: pick(t.audioModeConvert, lang) },
                { value: "trim", label: pick(t.audioModeTrim, lang) },
                { value: "volume", label: pick(t.audioModeVolume, lang) },
              ]}
            />
          </Field>
        </Card>

        {showTrackFields && (
          <Card>
            <CardHeader
              icon={<Music className="w-4 h-4 text-primary shrink-0" />}
              title={lang === "zh" ? "音轨设置 / Track" : "Track"}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={pick(t.audioTrack, lang)} hint={`-map 0:a:${s.trackIdx}`}>
                <Select value={s.trackIdx} onChange={(v) => set("trackIdx", v)}>
                  {TRACK_OPTS.map((n) => (
                    <option key={n} value={n}>
                      Track #{n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={pick(t.audioFormat, lang)} hint={`-f ${s.format}`}>
                <Select value={s.format} onChange={(v) => setFormat(v as AudioSettings["format"])}>
                  {AUDIO_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label} (.{f.value})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={pick(t.audioSampleRate, lang)} hint={`-ar ${s.sampleRate}`}>
                <Select value={s.sampleRate} onChange={(v) => set("sampleRate", v)}>
                  {SAMPLE_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r} Hz
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={pick(t.audioChannels, lang)} hint={`-ac ${s.channels}`}>
                <Select value={s.channels} onChange={(v) => set("channels", v)}>
                  {CHANNEL_OPTS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label={pick(t.audioBitrate, lang)} hint={`-b:a ${s.bitrate}`}>
                  <Select value={s.bitrate} onChange={(v) => set("bitrate", v)}>
                    {BITRATES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </Card>
        )}

        {showTrimFields && (
          <>
            <Card>
              <CardHeader
                icon={<Music className="w-4 h-4 text-primary shrink-0" />}
                title={pick(t.timeline, lang)}
                hint="-ss / -to"
              />
              <Timeline
                total={totalSec}
                start={s.startSec}
                end={s.endSec}
                onChange={(st, en) => {
                  if (st !== s.startSec) set("startSec", st);
                  if (en !== s.endSec) set("endSec", en);
                }}
              />
            </Card>
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label={pick(t.start2, lang)} hint="-ss">
                  <Input
                    value={fmtTime(s.startSec)}
                    onChange={(v) => {
                      const sec = parseTime(v);
                      if (!isNaN(sec)) set("startSec", Math.max(0, Math.min(sec, s.endSec - 1)));
                    }}
                  />
                </Field>
                <Field label={pick(t.end, lang)} hint="-to">
                  <Input
                    value={fmtTime(s.endSec)}
                    onChange={(v) => {
                      const sec = parseTime(v);
                      if (!isNaN(sec))
                        set("endSec", Math.max(s.startSec + 1, Math.min(sec, totalSec)));
                    }}
                  />
                </Field>
                <Field label={pick(t.duration, lang)} hint="-t">
                  <Input value={fmtTime(Math.max(0, s.endSec - s.startSec))} disabled />
                </Field>
              </div>
              <div className="h-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={pick(t.audioFormat, lang)} hint={`-f ${s.format}`}>
                  <Select
                    value={s.format}
                    onChange={(v) => setFormat(v as AudioSettings["format"])}
                  >
                    {AUDIO_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label} (.{f.value})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={pick(t.audioBitrate, lang)} hint={`-b:a ${s.bitrate}`}>
                  <Select value={s.bitrate} onChange={(v) => set("bitrate", v)}>
                    {BITRATES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Card>
          </>
        )}

        {showVolumeFields && (
          <Card>
            <CardHeader
              icon={<Music className="w-4 h-4 text-primary shrink-0" />}
              title={pick(t.audioVolumeDb, lang)}
              hint={`-af volume=${s.volumeDb}dB`}
            />
            <div className="flex flex-col gap-3">
              <Field label={pick(t.audioVolumeDb, lang)} hint={`-af volume=${s.volumeDb}dB`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">-20 dB</span>
                  <span className="ffs-mono text-sm">
                    {s.volumeDb > 0 ? "+" : ""}
                    {s.volumeDb} dB
                  </span>
                  <span className="text-[11px] text-muted-foreground">+20 dB</span>
                </div>
                <Range
                  value={s.volumeDb}
                  min={-20}
                  max={20}
                  step={1}
                  onChange={(v) => set("volumeDb", v)}
                />
              </Field>
              <div className="flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  {lang === "zh"
                    ? "音量模式会保留视频流直接复制（-c:v copy），不重编码画面，仅调整音频音量。"
                    : "Volume mode preserves video stream (-c:v copy), no video re-encode, only audio gain."}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <Field label={pick(t.filename, lang)}>
            <Input value={s.outputName} onChange={(v) => set("outputName", v)} />
          </Field>
        </Card>
      </div>
    </WorkArea>
  );
}

function Timeline({
  total,
  start,
  end,
  onChange,
}: {
  total: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<"start" | "end" | null>(null);

  const pct = (sec: number) => (total > 0 ? (sec / total) * 100 : 0);
  const leftPct = pct(start);
  const widthPct = pct(end - start);

  const secFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * total;
    },
    [total],
  );

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const sec = secFromClientX(e.clientX);
      if (drag === "start") {
        const ns = Math.max(0, Math.min(sec, end - 0.5));
        onChange(ns, end);
      } else {
        const ne = Math.max(start + 0.5, Math.min(sec, total));
        onChange(start, ne);
      }
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, start, end, total, onChange, secFromClientX]);

  const ticks = useMemo(() => {
    const n = 7;
    return Array.from({ length: n }, (_, i) => (total * i) / (n - 1));
  }, [total]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="ffs-mono text-[11px] text-muted-foreground">{fmtTime(0)}</span>
        <span className="ffs-mono text-[11px] text-muted-foreground">{fmtTime(total)}</span>
      </div>

      <div
        ref={trackRef}
        className="relative h-12 rounded-md bg-muted/40 border border-border w-full select-none touch-none"
        onPointerDown={(e) => {
          const sec = secFromClientX(e.clientX);
          const distStart = Math.abs(sec - start);
          const distEnd = Math.abs(sec - end);
          if (distStart <= distEnd) setDrag("start");
          else setDrag("end");
        }}
      >
        <div
          className="absolute top-0 bottom-0 border-y-2 border-primary"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            background: "var(--ffs-primary-soft)",
          }}
        >
          <div
            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-primary rounded-sm cursor-ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDrag("start");
            }}
          />
          <div
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-primary rounded-sm cursor-ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDrag("end");
            }}
          />
        </div>
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${leftPct + widthPct / 2}%`, background: "var(--ffs-state-info)" }}
        >
          <span
            className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[9px] leading-none"
            style={{ color: "var(--ffs-state-info)" }}
          >
            ▶
          </span>
        </div>
      </div>

      <div className="relative h-4 mt-1.5">
        <span
          className="absolute ffs-mono text-[11px] text-primary"
          style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
        >
          {fmtTime(start)}
        </span>
        <span
          className="absolute ffs-mono text-[11px] text-primary"
          style={{ left: `${leftPct + widthPct}%`, transform: "translateX(-50%)" }}
        >
          {fmtTime(end)}
        </span>
      </div>

      <div className="flex justify-between mt-2 ffs-mono text-[10px] text-muted-foreground">
        {ticks.map((tk, i) => (
          <span key={i}>{fmtTime(tk)}</span>
        ))}
      </div>
    </div>
  );
}
