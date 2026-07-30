import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { FileVideo, Image as ImageIcon, Info } from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import {
  Card,
  CardHeader,
  Field,
  Input,
  Segmented,
  Select,
  ButtonSecondary,
  Badge,
} from "../components/ui";
import { buildGifCommand, type GifSettings, DEFAULT_GIF } from "../lib/command";
import { t, pick } from "../lib/i18n";
import { fmtTime, parseTime } from "../lib/format";
import { useMediaInput } from "../lib/useMediaInput";
import { useRunner } from "../lib/useRunner";

export function GifPage() {
  const { lang, inputInfo } = useStore();
  const { pickFile } = useMediaInput();
  const { run } = useRunner();

  const total = inputInfo?.duration && inputInfo.duration > 0 ? inputInfo.duration : 222;
  const defaultStart = total > 0 ? total * 0.3 : 60;
  const defaultEnd = total > 0 ? total * 0.7 : 150;

  const [settings, setSettings] = useState<GifSettings>({
    ...DEFAULT_GIF,
    totalSec: total,
    startSec: defaultStart,
    endSec: defaultEnd,
  });

  const inputName = inputInfo?.filename || settings.inputName;
  const inputPath = inputInfo?.path || settings.inputPath;

  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      totalSec: total,
      inputName,
      inputPath,
    }));
  }, [total, inputName, inputPath]);

  useEffect(() => {
    if (settings.startSec < 0) setSettings((s) => ({ ...s, startSec: 0 }));
    if (settings.endSec > settings.totalSec) setSettings((s) => ({ ...s, endSec: s.totalSec }));
    if (settings.startSec >= settings.endSec)
      setSettings((s) => ({ ...s, startSec: Math.max(0, s.endSec - 1) }));
  }, [settings.totalSec, settings.startSec, settings.endSec]);

  const command = useMemo(() => buildGifCommand(settings), [settings]);
  const inputSize = inputInfo?.sizeBytes || 0;

  const update = <K extends keyof GifSettings>(key: K, value: GifSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const primary: PageAction = {
    icon: <ImageIcon className="w-4 h-4" />,
    label: pick(t.startGif, lang),
    disabled: !inputPath,
    onClick: () => run(command, inputName, inputPath, settings.outputName, settings.totalSec),
  };

  return (
    <WorkArea
      breadcrumb={t.secAV}
      title={{ zh: "GIF 动图 / GIF", en: "GIF" }}
      previewLabel={pick(t.preview, lang)}
      primary={primary}
      command={command}
      inputSize={inputSize}
    >
      <div className="flex flex-col gap-4">
        {/* ===== Input file card ===== */}
        <Card>
          <div className="flex items-center gap-2 flex-wrap">
            <FileVideo className="w-4 h-4 text-primary shrink-0" />
            <span className="ffs-mono text-sm truncate max-w-[40%]">{inputName}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge>{fmtTime(inputInfo?.duration || total)}</Badge>
              {inputInfo?.width ? <Badge>{`${inputInfo.width}×${inputInfo.height}`}</Badge> : null}
              {inputInfo?.codec ? <Badge>{inputInfo.codec}</Badge> : null}
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

        {/* ===== Timeline strip card ===== */}
        <Card>
          <CardHeader
            icon={<ImageIcon className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.timeline, lang)}
            hint="-ss / -t"
          />
          <Timeline
            total={settings.totalSec}
            start={settings.startSec}
            end={settings.endSec}
            onChange={(st, en) => {
              if (st !== settings.startSec) update("startSec", st);
              if (en !== settings.endSec) update("endSec", en);
            }}
          />
        </Card>

        {/* ===== Time inputs + GIF params card ===== */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label={pick(t.start2, lang)} hint="-ss">
              <Input
                value={fmtTime(settings.startSec)}
                onChange={(v) => {
                  const sec = parseTime(v);
                  if (!isNaN(sec))
                    update("startSec", Math.max(0, Math.min(sec, settings.endSec - 1)));
                }}
              />
            </Field>
            <Field label={pick(t.end, lang)} hint="-to">
              <Input
                value={fmtTime(settings.endSec)}
                onChange={(v) => {
                  const sec = parseTime(v);
                  if (!isNaN(sec))
                    update(
                      "endSec",
                      Math.max(settings.startSec + 1, Math.min(sec, settings.totalSec)),
                    );
                }}
              />
            </Field>
            <Field label={pick(t.duration, lang)} hint="-t">
              <Input value={fmtTime(Math.max(0, settings.endSec - settings.startSec))} disabled />
            </Field>

            <Field label={pick(t.gifFps, lang)} hint={`fps=${settings.fps}`}>
              <Select value={String(settings.fps)} onChange={(v) => update("fps", parseInt(v))}>
                <option value="10">10</option>
                <option value="12">12</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="24">24</option>
                <option value="30">30</option>
              </Select>
            </Field>

            <Field label={pick(t.gifWidth, lang)} hint="scale=width:-1">
              <Input
                value={String(settings.width)}
                placeholder="0 = keep"
                onChange={(v) => {
                  const n = parseInt(v);
                  if (!isNaN(n)) update("width", Math.max(0, n));
                }}
              />
            </Field>

            <Field label={pick(t.gifLoop, lang)} hint={`-loop ${settings.loop}`}>
              <Select value={String(settings.loop)} onChange={(v) => update("loop", parseInt(v))}>
                <option value="0">0 — Infinite</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </Select>
            </Field>

            <Field label={pick(t.gifPaletteMode, lang)} hint={`stats_mode=${settings.paletteMode}`}>
              <Segmented
                size="md"
                value={settings.paletteMode}
                onChange={(v) => update("paletteMode", v)}
                options={[
                  { value: "diff", label: <span>diff</span> },
                  { value: "full", label: <span>full</span> },
                ]}
              />
            </Field>

            <Field label={pick(t.gifPaletteDither, lang)} hint={`dither=${settings.dither}`}>
              <Select value={settings.dither} onChange={(v) => update("dither", v)}>
                <option value="sierra2_4a">sierra2_4a</option>
                <option value="bayer">bayer</option>
                <option value="floyd_steinberg">floyd_steinberg</option>
                <option value="none">none</option>
              </Select>
            </Field>

            <Field label={pick({ zh: "输出文件", en: "Output" }, lang)}>
              <Input
                value={settings.outputName}
                onChange={(v) => update("outputName", v || "output.gif")}
              />
            </Field>
          </div>
        </Card>

        {/* ===== Tips card ===== */}
        <Card>
          <div className="flex items-start gap-2 text-xs">
            <ImageIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">{pick(t.gifHint, lang)}</p>
          </div>
        </Card>
      </div>
    </WorkArea>
  );
}

// -----------------------------------------------------------------
// Timeline (pointer-event based, works for mouse + touch)
// -----------------------------------------------------------------
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
          style={{
            left: `${leftPct + widthPct / 2}%`,
            background: "var(--ffs-state-info)",
          }}
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
