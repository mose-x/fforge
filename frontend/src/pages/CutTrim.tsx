import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  FileVideo,
  Scissors,
  Info,
  Play,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import {
  Card,
  CardHeader,
  Field,
  Input,
  Segmented,
  ButtonSecondary,
  Badge,
} from "../components/ui";
import { buildCutCommand, type CutSettings } from "../lib/command";
import { t, pick } from "../lib/i18n";
import { fmtTime, parseTime } from "../lib/format";
import { useMediaInput } from "../lib/useMediaInput";
import { useRunner } from "../lib/useRunner";

export function CutTrimPage() {
  const { lang, inputInfo } = useStore();
  const { pickFile } = useMediaInput();
  const { run } = useRunner();

  const total = inputInfo?.duration && inputInfo.duration > 0 ? inputInfo.duration : 222; // 00:03:42 fallback for preview
  const [startSec, setStartSec] = useState(90); // 00:01:30
  const [endSec, setEndSec] = useState(135); // 00:02:15
  const [mode, setMode] = useState<"copy" | "encode">("copy");
  const [outputName, setOutputName] = useState("output_clip.mp4");

  const inputName = inputInfo?.filename || "input.mp4";
  const inputPath = inputInfo?.path || "";

  const settings: CutSettings = {
    inputPath,
    inputName,
    outputName,
    startSec,
    endSec,
    totalSec: total,
    mode,
  };
  const command = useMemo(() => buildCutCommand(settings), [settings]);
  const inputSize = inputInfo?.sizeBytes || 0;

  // keep start/end within bounds and sane
  useEffect(() => {
    if (startSec < 0) setStartSec(0);
    if (endSec > total) setEndSec(total);
    if (startSec >= endSec) setStartSec(Math.max(0, endSec - 1));
  }, [total]); // eslint-disable-line react-hooks/exhaustive-deps

  const primary: PageAction = {
    icon: <Scissors className="w-4 h-4" />,
    label: pick(t.extract, lang),
    disabled: !inputPath,
    onClick: () => run(command, inputName, inputPath, outputName, total),
  };

  return (
    <WorkArea
      breadcrumb={t.secMedia}
      title={{ zh: "视频剪辑 / Cut & Trim", en: "Cut & Trim" }}
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
            icon={<Scissors className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.timeline, lang)}
            hint="-ss / -to"
          />
          <Timeline
            total={total}
            start={startSec}
            end={endSec}
            onChange={(st, en) => {
              if (st !== startSec) setStartSec(st);
              if (en !== endSec) setEndSec(en);
            }}
          />
        </Card>

        {/* ===== Time inputs card ===== */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={pick(t.start2, lang)} hint="-ss">
              <Input
                value={fmtTime(startSec)}
                onChange={(v) => {
                  const sec = parseTime(v);
                  if (!isNaN(sec)) setStartSec(Math.max(0, Math.min(sec, endSec - 1)));
                }}
              />
            </Field>
            <Field label={pick(t.end, lang)} hint="-to">
              <Input
                value={fmtTime(endSec)}
                onChange={(v) => {
                  const sec = parseTime(v);
                  if (!isNaN(sec)) setEndSec(Math.max(startSec + 1, Math.min(sec, total)));
                }}
              />
            </Field>
            <Field label={pick(t.duration, lang)} hint="-t">
              <Input value={fmtTime(Math.max(0, endSec - startSec))} disabled />
            </Field>
          </div>
        </Card>

        {/* ===== Mode + output card ===== */}
        <Card>
          <div className="flex flex-col gap-3">
            <Field label={pick(t.mode, lang)} hint={mode === "copy" ? "-c copy" : "-c:v libx264"}>
              <Segmented
                size="md"
                value={mode}
                onChange={(v) => setMode(v)}
                options={[
                  {
                    value: "copy",
                    label: (
                      <span className="flex items-center justify-center gap-1.5">
                        <span>{pick(t.modeFast, lang)}</span>
                        <span className="ffs-mono text-[10px] opacity-70">-c copy</span>
                      </span>
                    ),
                  },
                  {
                    value: "encode",
                    label: <span>{pick(t.modePrecise, lang)}</span>,
                  },
                ]}
              />
            </Field>
            <Field label={pick({ zh: "输出文件", en: "Output" }, lang)}>
              <Input value={outputName} onChange={setOutputName} />
            </Field>
            <p className="text-[11px] text-muted-foreground ffs-mono">
              {pick(t.modeFastHint, lang)}
            </p>
          </div>
        </Card>

        {/* ===== Tips card ===== */}
        <Card>
          <div className="flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              {lang === "zh" ? (
                <>
                  提示：将 <span className="ffs-mono text-primary">-ss</span> 放在{" "}
                  <span className="ffs-mono text-primary">-i</span> 之前速度更快（输入定位），放在{" "}
                  <span className="ffs-mono text-primary">-i</span> 之后更精确（帧级定位）。 / Tip:
                  placing <span className="ffs-mono text-primary">-ss</span> before{" "}
                  <span className="ffs-mono text-primary">-i</span> is faster (input seek); after{" "}
                  <span className="ffs-mono text-primary">-i</span> is frame-accurate.
                </>
              ) : (
                <>
                  Tip: placing <span className="ffs-mono text-primary">-ss</span> before{" "}
                  <span className="ffs-mono text-primary">-i</span> is faster (input seek); after{" "}
                  <span className="ffs-mono text-primary">-i</span> is frame-accurate.
                </>
              )}
            </p>
          </div>
        </Card>

        <div className="lg:hidden flex gap-2">
          <ButtonSecondary icon={<Play className="w-4 h-4" />} disabled={!inputPath} className="flex-1">
            {pick(t.preview, lang)}
          </ButtonSecondary>
        </div>
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
    [total]
  );

  // Pointer events handle both mouse and touch uniformly.
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

  // tick marks at every ~10% (matching the design's 30s steps for a 3:42 video)
  const ticks = useMemo(() => {
    const n = 7;
    return Array.from({ length: n }, (_, i) => (total * i) / (n - 1));
  }, [total]);

  return (
    <div>
      {/* Endpoint labels */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="ffs-mono text-[11px] text-muted-foreground">{fmtTime(0)}</span>
        <span className="ffs-mono text-[11px] text-muted-foreground">{fmtTime(total)}</span>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative h-12 rounded-md bg-muted/40 border border-border w-full select-none touch-none"
        onPointerDown={(e) => {
          // click on empty track: move the nearest handle
          const sec = secFromClientX(e.clientX);
          const distStart = Math.abs(sec - start);
          const distEnd = Math.abs(sec - end);
          if (distStart <= distEnd) setDrag("start");
          else setDrag("end");
        }}
      >
        {/* Selected region */}
        <div
          className="absolute top-0 bottom-0 border-y-2 border-primary"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            background: "var(--ffs-primary-soft)",
          }}
        >
          {/* Left drag handle */}
          <div
            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-primary rounded-sm cursor-ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDrag("start");
            }}
          />
          {/* Right drag handle */}
          <div
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-8 bg-primary rounded-sm cursor-ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDrag("end");
            }}
          />
        </div>
        {/* Playhead (midpoint of selection, cosmetic) */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${(leftPct + widthPct / 2)}%`, background: "var(--ffs-state-info)" }}
        >
          <span
            className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[9px] leading-none"
            style={{ color: "var(--ffs-state-info)" }}
          >
            ▶
          </span>
        </div>
      </div>

      {/* Selection edge time labels */}
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

      {/* Time tick markers */}
      <div className="flex justify-between mt-2 ffs-mono text-[10px] text-muted-foreground">
        {ticks.map((tk, i) => (
          <span key={i}>{fmtTime(tk)}</span>
        ))}
      </div>
    </div>
  );
}
