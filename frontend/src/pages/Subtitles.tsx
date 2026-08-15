import { useMemo, useState } from "react";
import { FileVideo, Captions, Info, FileText } from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import {
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Segmented,
  ButtonSecondary,
  Badge,
} from "../components/ui";
import {
  buildSubtitleCommand,
  DEFAULT_SUBTITLE,
  type SubtitleSettings,
  type SubtitleMode,
} from "../lib/command";
import { t, pick } from "../lib/i18n";
import { fmtTime } from "../lib/format";
import { useMediaInput } from "../lib/useMediaInput";
import { useRunner } from "../lib/useRunner";

const SUBTITLE_TRACKS = ["0", "1", "2"];
const CONTAINER_OPTS: Array<{ value: SubtitleSettings["container"]; label: string; ext: string }> =
  [
    { value: "mp4", label: "MP4", ext: "mp4" },
    { value: "mkv", label: "MKV", ext: "mkv" },
    { value: "mov", label: "MOV", ext: "mov" },
  ];
const ENCODING_OPTS = ["UTF-8", "GBK", "Shift-JIS", "ISO-8859-1"];

function stripExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(0, idx) : name;
}

export function SubtitlesPage() {
  const { lang, inputInfo } = useStore();
  const { pickFile } = useMediaInput();
  const { run } = useRunner();

  const [s, setS] = useState<SubtitleSettings>(DEFAULT_SUBTITLE);

  const inputName = inputInfo?.filename || s.inputName;
  const inputPath = inputInfo?.path || "";

  const set = <K extends keyof SubtitleSettings>(k: K, v: SubtitleSettings[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const setMode = (mode: SubtitleMode) => {
    setS((prev) => {
      let nextOutput = prev.outputName;
      if (mode === "extract") {
        const base = stripExt(inputName || prev.inputName);
        nextOutput = `${base}.srt`;
      } else if (mode === "add") {
        const base = stripExt(prev.outputName);
        const c = CONTAINER_OPTS.find((x) => x.value === prev.container);
        nextOutput = `${base}.${c?.ext || prev.container}`;
      } else {
        const base = stripExt(prev.outputName);
        const c = CONTAINER_OPTS.find((x) => x.value === prev.container);
        nextOutput = `${base}.${c?.ext || "mp4"}`;
      }
      return { ...prev, mode, outputName: nextOutput };
    });
  };

  const setContainer = (id: SubtitleSettings["container"]) => {
    setS((prev) => {
      const c = CONTAINER_OPTS.find((x) => x.value === id);
      const base = stripExt(prev.outputName);
      return { ...prev, container: id, outputName: `${base}.${c?.ext || id}` };
    });
  };

  const pickSubtitleFile = async () => {
    try {
      const fn = (window as any).go?.main?.App?.SelectSubtitleFile;
      const path = typeof fn === "function" ? await fn() : "";
      if (path) {
        set("subtitleFile", path);
      }
    } catch {
      /* cancelled */
    }
  };

  const subtitleFileName = (() => {
    if (!s.subtitleFile) return "";
    const parts = s.subtitleFile.split(/[/\\]/);
    return parts[parts.length - 1] || s.subtitleFile;
  })();

  const settings: SubtitleSettings = {
    ...s,
    inputName,
    inputPath,
  };

  const command = useMemo(() => buildSubtitleCommand(settings), [settings]);
  const inputSize = inputInfo?.sizeBytes || 0;

  const primaryLabel =
    s.mode === "burn"
      ? pick(t.startBurn, lang)
      : s.mode === "add"
        ? pick({ zh: "添加字幕", en: "Add subtitles" }, lang)
        : pick(t.startExtract, lang);

  const primary: PageAction = {
    icon: <Captions className="w-4 h-4" />,
    label: primaryLabel,
    disabled: !inputPath,
    onClick: () =>
      run(command, inputName, inputPath, settings.outputName, inputInfo?.duration || 0),
  };

  const showBurnFields = s.mode === "burn";
  const showAddFields = s.mode === "add";
  const showExtractFields = s.mode === "extract";

  return (
    <WorkArea
      breadcrumb={t.secAV}
      title={{ zh: "字幕处理 / Subtitles", en: "Subtitles" }}
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
              <Badge>{fmtTime(inputInfo?.duration || 0)}</Badge>
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

        <Card>
          <CardHeader
            icon={<Captions className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.subtitleMode, lang)}
          />
          <Field label={pick(t.subtitleMode, lang)}>
            <Segmented
              size="md"
              value={s.mode}
              onChange={(v) => setMode(v as SubtitleMode)}
              options={[
                { value: "burn", label: pick(t.subtitleModeBurn, lang) },
                { value: "add", label: pick(t.subtitleModeAdd, lang) },
                { value: "extract", label: pick(t.subtitleModeExtract, lang) },
              ]}
            />
          </Field>
        </Card>

        {showBurnFields && (
          <Card>
            <CardHeader
              icon={<Captions className="w-4 h-4 text-primary shrink-0" />}
              title={lang === "zh" ? "烧录设置 / Burn-in" : "Burn-in"}
            />
            <div className="flex flex-col gap-4">
              <Field label={pick(t.subtitleFile, lang)}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ButtonSecondary
                      icon={<FileText className="w-3.5 h-3.5" />}
                      onClick={pickSubtitleFile}
                    >
                      {pick(t.selectFile, lang)}
                    </ButtonSecondary>
                    {subtitleFileName ? <Badge>{subtitleFileName}</Badge> : null}
                    {!subtitleFileName ? (
                      <span className="text-[11px] text-muted-foreground">
                        {lang === "zh" ? "未选择字幕文件" : "No subtitle file selected"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Field>
              <Field
                label={pick(t.subtitleEncoding, lang)}
                hint={s.encoding !== "UTF-8" ? `charenc=${s.encoding.toLowerCase()}` : ""}
              >
                <Select value={s.encoding} onChange={(v) => set("encoding", v)}>
                  {ENCODING_OPTS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={pick(t.subtitleForceStyle, lang)}
                hint={s.forceStyle ? `force_style='…'` : ""}
              >
                <Input
                  value={s.forceStyle}
                  onChange={(v) => set("forceStyle", v)}
                  placeholder="FontName=SimHei,FontSize=24,PrimaryColour=&H00FFFFFF"
                />
              </Field>
              <div className="flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  {lang === "zh"
                    ? "烧录模式需要视频重编码（-c:v libx264），输出画面中永久内嵌字幕。"
                    : "Burn-in mode requires video re-encode (-c:v libx264), subtitles are permanently embedded."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {showAddFields && (
          <Card>
            <CardHeader
              icon={<Captions className="w-4 h-4 text-primary shrink-0" />}
              title={lang === "zh" ? "添加字幕轨 / Add track" : "Add track"}
            />
            <div className="flex flex-col gap-4">
              <Field label={pick(t.subtitleFile, lang)}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ButtonSecondary
                      icon={<FileText className="w-3.5 h-3.5" />}
                      onClick={pickSubtitleFile}
                    >
                      {pick(t.selectFile, lang)}
                    </ButtonSecondary>
                    {subtitleFileName ? <Badge>{subtitleFileName}</Badge> : null}
                    {!subtitleFileName ? (
                      <span className="text-[11px] text-muted-foreground">
                        {lang === "zh"
                          ? "（空 = 保留原字幕轨）"
                          : "(empty = keep original streams)"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Field>
              <Field
                label={pick(t.subtitleTrackIdx, lang)}
                hint={s.subtitleFile ? `-map 1:0` : `-map 0:s:${s.trackIdx}`}
              >
                <Select value={s.trackIdx} onChange={(v) => set("trackIdx", v)}>
                  {SUBTITLE_TRACKS.map((n) => (
                    <option key={n} value={n}>
                      Stream #{n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={pick(t.container, lang)} hint={`-f ${s.container}`}>
                <Select
                  value={s.container}
                  onChange={(v) => setContainer(v as SubtitleSettings["container"])}
                >
                  {CONTAINER_OPTS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label} (.{c.ext})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>
        )}

        {showExtractFields && (
          <Card>
            <CardHeader
              icon={<Captions className="w-4 h-4 text-primary shrink-0" />}
              title={lang === "zh" ? "提取字幕 / Extract" : "Extract"}
            />
            <div className="flex flex-col gap-4">
              <Field label={pick(t.subtitleTrackIdx, lang)} hint={`-map 0:s:${s.trackIdx}`}>
                <Select value={s.trackIdx} onChange={(v) => set("trackIdx", v)}>
                  {SUBTITLE_TRACKS.map((n) => (
                    <option key={n} value={n}>
                      Subtitle Stream #{n}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  {lang === "zh"
                    ? "提取模式将输出 .srt 字幕文件，无需重编码。"
                    : "Extract mode outputs a .srt subtitle file, no re-encode required."}
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
