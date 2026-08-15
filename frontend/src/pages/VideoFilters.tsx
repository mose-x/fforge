import { useMemo, useState } from "react";
import {
  FileVideo,
  SlidersHorizontal,
  Plus,
  CircleHelp,
  X,
  GripVertical,
  ArrowRight,
  Play,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import { Card, CardHeader, Field, Input, ButtonSecondary, Toggle } from "../components/ui";
import {
  buildFilterCommand,
  FILTER_PALETTE,
  FILTER_DEFAULT_ARGS,
  FILTER_PARAM_REF,
  type FilterItem,
  type FilterSettings,
} from "../lib/command";
import { t, pick } from "../lib/i18n";
import { fmtTime } from "../lib/format";
import { useMediaInput } from "../lib/useMediaInput";
import { useRunner } from "../lib/useRunner";

let filterSeq = 0;
function newFilter(name: string): FilterItem {
  filterSeq += 1;
  return { id: `f-${Date.now()}-${filterSeq}`, name, args: FILTER_DEFAULT_ARGS[name] ?? "" };
}

export function VideoFiltersPage() {
  const { lang, inputInfo } = useStore();
  const { pickFile } = useMediaInput();
  const { run } = useRunner();

  const [filters, setFilters] = useState<FilterItem[]>([
    newFilter("scale"),
    newFilter("crop"),
    newFilter("transpose"),
  ]);
  const [outputName, setOutputName] = useState("output.mp4");
  const [audioCopy, setAudioCopy] = useState(true);

  const inputName = inputInfo?.filename || "input.mp4";
  const inputPath = inputInfo?.path || "";

  const settings: FilterSettings = {
    inputPath,
    inputName,
    outputName,
    filters,
    audioCopy,
  };
  const command = useMemo(() => buildFilterCommand(settings), [settings]);
  const inputSize = inputInfo?.sizeBytes || 0;

  const addFilter = (name: string) => setFilters((prev) => [...prev, newFilter(name)]);
  const removeFilter = (id: string) => setFilters((prev) => prev.filter((f) => f.id !== id));
  const updateFilter = (id: string, args: string) =>
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, args } : f)));
  const moveFilter = (id: string, dir: -1 | 1) =>
    setFilters((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const primary: PageAction = {
    icon: <SlidersHorizontal className="w-4 h-4" />,
    label: pick(t.apply, lang),
    disabled: !inputPath || filters.length === 0,
    onClick: () => run(command, inputName, inputPath, outputName, inputInfo?.duration || 0),
  };

  return (
    <WorkArea
      breadcrumb={t.secMedia}
      title={{ zh: "滤镜效果 / Video Filters", en: "Video Filters" }}
      previewLabel={pick(t.preview, lang)}
      primary={primary}
      command={command}
      inputSize={inputSize}
    >
      <div className="flex flex-col gap-4">
        {/* ===== Compact input/output row ===== */}
        <Card>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <FileVideo className="w-4 h-4 text-primary shrink-0" />
              <span className="ffs-mono text-sm truncate max-w-[180px]">{inputName}</span>
              <span className="text-xs text-muted-foreground">
                {inputInfo
                  ? `${fmtTime(inputInfo.duration)}${
                      inputInfo.width ? ` · ${inputInfo.width}×${inputInfo.height}` : ""
                    }`
                  : "—"}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="bg-input border border-border rounded-md h-8 px-2 text-sm ffs-mono w-40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
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

        {/* ===== Filter chain builder card ===== */}
        <Card>
          <CardHeader
            icon={<SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.filterChain, lang)}
            hint='-vf "..."'
          />
          <div className="flex flex-col gap-2">
            {filters.length === 0 && (
              <div className="text-xs text-muted-foreground py-3 text-center">
                {lang === "zh"
                  ? "点击下方滤镜添加到链中"
                  : "Click a filter below to add it to the chain"}
              </div>
            )}
            {filters.map((f, idx) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-muted/30"
              >
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={idx === 0}
                    onClick={() => moveFilter(f.id, -1)}
                    aria-label="up"
                  >
                    <GripVertical className="w-3.5 h-3.5 rotate-180" />
                  </button>
                  <button
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={idx === filters.length - 1}
                    onClick={() => moveFilter(f.id, 1)}
                    aria-label="down"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="w-5 h-5 rounded bg-primary-soft text-primary text-[11px] font-semibold flex items-center justify-center shrink-0 ffs-mono">
                  {idx + 1}
                </span>
                <span className="ffs-mono text-sm font-medium text-primary shrink-0">{f.name}</span>
                <input
                  type="text"
                  value={f.args}
                  placeholder="(no args)"
                  onChange={(e) => updateFilter(f.id, e.target.value)}
                  className="bg-input border border-border rounded px-2 py-1 text-xs ffs-mono w-32 sm:w-40 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="ffs-mono text-[11px] text-muted-foreground truncate hidden sm:block">
                  -vf {f.name}
                  {f.args ? `=${f.args}` : ""}
                </span>
                <button
                  className="ml-auto h-6 w-6 rounded hover:bg-muted text-muted-foreground flex items-center justify-center shrink-0"
                  aria-label={pick(t.remove, lang)}
                  onClick={() => removeFilter(f.id)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* ===== Add filter palette card ===== */}
        <Card>
          <CardHeader
            icon={<Plus className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.addFilter, lang)}
            hint={pick(t.addFilterHint, lang)}
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_PALETTE.map((name) => (
              <button
                key={name}
                onClick={() => addFilter(name)}
                className="h-8 px-3 rounded-full text-xs border border-border hover:border-primary hover:text-primary hover:bg-primary-soft transition-colors cursor-pointer ffs-mono"
              >
                {name}
              </button>
            ))}
          </div>
        </Card>

        {/* ===== Audio copy toggle + params reference ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader
              icon={<FileVideo className="w-4 h-4 text-primary shrink-0" />}
              title={pick(t.audioEncode, lang)}
            />
            <Field label="-c:a" hint={audioCopy ? "copy" : "auto"}>
              <Toggle
                checked={audioCopy}
                onChange={setAudioCopy}
                label={
                  audioCopy
                    ? lang === "zh"
                      ? "音频流复制 / stream copy"
                      : "stream copy"
                    : lang === "zh"
                      ? "重编码 AAC"
                      : "re-encode AAC"
                }
              />
            </Field>
          </Card>

          <Card>
            <CardHeader
              icon={<CircleHelp className="w-4 h-4 text-primary shrink-0" />}
              title={pick(t.paramsRef, lang)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {FILTER_PARAM_REF.map((p) => (
                <div key={p.expr} className="flex items-center gap-3">
                  <span className="ffs-mono text-primary">{p.expr}</span>
                  <span className="text-muted-foreground">{p.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:hidden flex gap-2">
          <ButtonSecondary
            icon={<Play className="w-4 h-4" />}
            disabled={!inputPath}
            className="flex-1"
          >
            {pick(t.preview, lang)}
          </ButtonSecondary>
        </div>
      </div>
    </WorkArea>
  );
}
