import { useMemo, useState } from "react";
import { FileVideo, Layers, Plus, Trash2, ArrowUp, ArrowDown, Save, Info, X } from "lucide-react";
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
import {
  buildMergeCommand,
  DEFAULT_MERGE,
  type MergeSettings,
  type MergeFileEntry,
} from "../lib/command";
import { t, pick } from "../lib/i18n";
import { fmtTime } from "../lib/format";
import { useRunner } from "../lib/useRunner";
import type { MediaInfo } from "../lib/types";
import type { RunRequest } from "../lib/types";

const GEN_ID = () => Math.random().toString(36).slice(2, 10);

export function MergePage() {
  const { lang, toast, engine, setRunning, setProgress } = useStore();
  const { run } = useRunner();

  const [s, setS] = useState<MergeSettings>(DEFAULT_MERGE);

  const set = <K extends keyof MergeSettings>(k: K, v: MergeSettings[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const settings: MergeSettings = { ...s };
  const command = useMemo(() => buildMergeCommand(settings), [settings]);

  const totalDuration = s.files.reduce((acc, f) => acc + (f.duration || 0), 0);
  const firstFile = s.files[0];
  const inputSize = 0;

  const handleSelectFiles = async () => {
    try {
      const fn = (window as any).go?.main?.App?.SelectMediaFiles;
      const paths: string[] = typeof fn === "function" ? await fn() : [];
      if (!paths || paths.length === 0) return;
      const probeFn = (window as any).go?.main?.App?.ProbeMedia;
      const newEntries: MergeFileEntry[] = [];
      for (const p of paths) {
        let info: MediaInfo | null = null;
        try {
          if (typeof probeFn === "function") info = await probeFn(p);
        } catch {
          /* ignore */
        }
        const filename = p.split(/[/\\]/).pop() || p;
        newEntries.push({
          id: GEN_ID(),
          path: p,
          filename,
          duration: info?.duration,
        });
      }
      setS((prev) => ({ ...prev, files: [...prev.files, ...newEntries] }));
    } catch (e: any) {
      toast(
        (lang === "zh" ? "选择文件失败" : "Failed to select files") +
          ": " +
          (e?.message || String(e)),
        "error",
      );
    }
  };

  const handleAddSingleFile = async () => {
    try {
      const fn = (window as any).go?.main?.App?.SelectMediaFile;
      const p: string = typeof fn === "function" ? await fn() : "";
      if (!p) return;
      const probeFn = (window as any).go?.main?.App?.ProbeMedia;
      let info: MediaInfo | null = null;
      try {
        if (typeof probeFn === "function") info = await probeFn(p);
      } catch {
        /* ignore */
      }
      const filename = p.split(/[/\\]/).pop() || p;
      const entry: MergeFileEntry = {
        id: GEN_ID(),
        path: p,
        filename,
        duration: info?.duration,
      };
      setS((prev) => ({ ...prev, files: [...prev.files, entry] }));
    } catch (e: any) {
      toast(
        (lang === "zh" ? "添加文件失败" : "Failed to add file") + ": " + (e?.message || String(e)),
        "error",
      );
    }
  };

  const handleRemoveFile = (idx: number) => {
    setS((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== idx),
    }));
  };

  const handleClearFiles = () => {
    setS((prev) => ({ ...prev, files: [] }));
  };

  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return;
    setS((prev) => {
      const arr = [...prev.files];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return { ...prev, files: arr };
    });
  };

  const handleMoveDown = (idx: number) => {
    setS((prev) => {
      if (idx >= prev.files.length - 1) return prev;
      const arr = [...prev.files];
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      return { ...prev, files: arr };
    });
  };

  const handleRunMerge = async () => {
    if (s.files.length < 2) {
      toast(lang === "zh" ? "请至少选择 2 个文件" : "Please select at least 2 files", "error");
      return;
    }
    if (!engine?.ffmpegAvailable) {
      toast(pick(t.ffmpegMissing, lang), "error");
      return;
    }

    try {
      const selectOutFn = (window as any).go?.main?.App?.SelectOutputPath;
      let outPath: string = "";
      try {
        if (typeof selectOutFn === "function") {
          outPath = await selectOutFn(s.outputName || "merged_output.mp4");
        }
      } catch {
        /* cancelled */
      }
      if (!outPath) return;

      let realArgs: string[] = [];
      if (s.mode === "demuxer") {
        realArgs = [
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          "concat_list.txt",
          "-c",
          "copy",
          "-y",
          outPath,
        ];
      } else {
        const count = s.files.length;
        const inputArgs: string[] = [];
        for (const f of s.files) {
          inputArgs.push("-i", f.path);
        }
        const filter = `concat=n=${count}:v=1:a=1 [v][a]`;
        realArgs = [
          ...inputArgs,
          "-filter_complex",
          filter,
          "-map",
          "[v]",
          "-map",
          "[a]",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-y",
          outPath,
        ];
      }

      const req: RunRequest = {
        args: realArgs,
        outputPath: outPath,
        duration: totalDuration || 0,
      };

      setProgress({
        percent: 0,
        timeSec: 0,
        speed: "",
        frame: 0,
        status: "running",
        message: "",
        outputPath: outPath,
      });
      setRunning(true);
      try {
        const runFn = (window as any).go?.main?.App?.RunFFmpeg;
        if (typeof runFn === "function") {
          await runFn(req);
        }
      } catch (e: any) {
        toast(
          (lang === "zh" ? "执行失败" : "Execution failed") + ": " + (e?.message || String(e)),
          "error",
        );
      }
    } catch (e: any) {
      toast(
        (lang === "zh" ? "执行失败" : "Execution failed") + ": " + (e?.message || String(e)),
        "error",
      );
    }
  };

  const primary: PageAction = {
    icon: <Layers className="w-4 h-4" />,
    label: pick(t.startMerge, lang),
    disabled: s.files.length < 2,
    onClick: handleRunMerge,
  };

  return (
    <WorkArea
      breadcrumb={t.secMedia}
      title={{ zh: "视频合并 / Merge", en: "Merge" }}
      previewLabel={pick(t.preview, lang)}
      primary={primary}
      command={command}
      inputSize={inputSize}
    >
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader
            icon={<FileVideo className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.mergeInputFiles, lang)}
            hint={`${s.files.length} / ${pick({ zh: "已选文件", en: "files selected" }, lang)}`}
          />
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <ButtonSecondary icon={<Plus className="w-3.5 h-3.5" />} onClick={handleSelectFiles}>
              {pick(t.selectFiles, lang)}
            </ButtonSecondary>
            <ButtonSecondary
              icon={<FileVideo className="w-3.5 h-3.5" />}
              onClick={handleAddSingleFile}
            >
              {pick({ zh: "添加单文件", en: "Add single file" }, lang)}
            </ButtonSecondary>
            <ButtonSecondary
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleClearFiles}
              disabled={s.files.length === 0}
              className="ml-auto"
            >
              {pick({ zh: "清空列表", en: "Clear list" }, lang)}
            </ButtonSecondary>
          </div>

          {s.files.length === 0 ? (
            <div className="border border-dashed border-border rounded-md p-6 text-center text-sm text-muted-foreground">
              {pick(t.noFileSelected, lang)}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {s.files.map((f, idx) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 border border-border rounded-md p-3 bg-muted/20 flex-wrap"
                >
                  <Badge>#{idx + 1}</Badge>
                  <FileVideo className="w-4 h-4 text-primary shrink-0" />
                  <span className="ffs-mono text-sm truncate flex-1 min-w-[120px]">
                    {f.filename}
                  </span>
                  {f.duration !== undefined && f.duration > 0 ? (
                    <Badge>{fmtTime(f.duration)}</Badge>
                  ) : null}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title={pick({ zh: "上移", en: "Move up" }, lang)}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === s.files.length - 1}
                      className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title={pick({ zh: "下移", en: "Move down" }, lang)}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/40 transition-colors"
                      title={pick(t.remove, lang)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {totalDuration > 0 && (
                <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {pick({ zh: "总时长 / Total:", en: "Total duration:" }, lang)}{" "}
                    <span className="ffs-mono">{fmtTime(totalDuration)}</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<Layers className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.mergeMethod, lang)}
            hint={s.mode === "demuxer" ? "-f concat -c copy" : "-filter_complex concat"}
          />
          <Field
            label={pick({ zh: "合并方式 / Method", en: "Merge method" }, lang)}
            hint={
              s.mode === "demuxer"
                ? pick(
                    {
                      zh: "Concat 解复用（无损，同编码参数）/ Same codec required",
                      en: "Concat demux (lossless, same codec)",
                    },
                    lang,
                  )
                : pick(
                    {
                      zh: "Concat 滤镜（重编码，兼容性好）/ Re-encode for compatibility",
                      en: "Concat filter (re-encode, compatible)",
                    },
                    lang,
                  )
            }
          >
            <Segmented
              size="md"
              value={s.mode}
              onChange={(v) => set("mode", v as "demuxer" | "filter")}
              options={[
                {
                  value: "demuxer",
                  label: (
                    <span className="flex items-center justify-center gap-1.5">
                      <span>{pick(t.mergeMethodConcat, lang)}</span>
                      <span className="ffs-mono text-[10px] opacity-70">-c copy</span>
                    </span>
                  ),
                },
                {
                  value: "filter",
                  label: <span>{pick(t.mergeMethodFilter, lang)}</span>,
                },
              ]}
            />
          </Field>
        </Card>

        <Card>
          <CardHeader
            icon={<Save className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.output, lang)}
          />
          <Field label={pick(t.filename, lang)}>
            <Input value={s.outputName} onChange={(v) => set("outputName", v)} />
          </Field>
        </Card>

        <Card>
          <div className="flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              {pick(t.mergeReorderHint, lang)}
            </p>
          </div>
        </Card>
      </div>
    </WorkArea>
  );
}
