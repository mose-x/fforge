import { useMemo, useState, useEffect } from "react";
import { FileVideo, Radio, Info, Monitor } from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import {
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Toggle,
  PillGroup,
  Range,
  ButtonSecondary,
  Badge,
} from "../components/ui";
import { buildStreamCommand, type StreamSettings, DEFAULT_STREAM } from "../lib/command";
import { t, pick } from "../lib/i18n";
import { useMediaInput } from "../lib/useMediaInput";
import { useRunner } from "../lib/useRunner";
import { fmtTime } from "../lib/format";

export function StreamPage() {
  const { lang, inputInfo } = useStore();
  const { pickFile } = useMediaInput();
  const { run } = useRunner();

  const [settings, setSettings] = useState<StreamSettings>({ ...DEFAULT_STREAM });

  const inputName = settings.isLive ? ":0.0" : inputInfo?.filename || settings.inputName;
  const inputPath = settings.isLive ? "" : inputInfo?.path || settings.inputPath;

  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      inputName: inputInfo?.filename || prev.inputName,
      inputPath: inputInfo?.path || prev.inputPath,
    }));
  }, [inputInfo]);

  const update = <K extends keyof StreamSettings>(key: K, value: StreamSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const command = useMemo(() => buildStreamCommand(settings), [settings]);
  const inputSize = inputInfo?.sizeBytes || 0;

  const urlValid = settings.url.trim().length > 0;
  const canStart = settings.isLive ? urlValid : urlValid && inputPath.length > 0;

  const handleRun = () => {
    const streamUrl = settings.url + (settings.key ? "/" + settings.key : "");
    run(command, inputName, settings.isLive ? ":0.0" : inputPath, streamUrl, 0, streamUrl);
  };

  const primary: PageAction = {
    icon: <Radio className="w-4 h-4" />,
    label: pick(t.startStream, lang),
    disabled: !canStart,
    onClick: handleRun,
  };

  return (
    <WorkArea
      breadcrumb={t.secAdv}
      title={{ zh: "流媒体推流 / Streaming", en: "Streaming" }}
      previewLabel={pick(t.preview, lang)}
      primary={primary}
      command={command}
      inputSize={inputSize}
    >
      <div className="flex flex-col gap-4">
        {/* ===== Input source toggle card ===== */}
        <Card>
          <CardHeader
            icon={<Radio className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.inputSource, lang)}
          />
          <div className="flex flex-col gap-3">
            <Toggle
              checked={settings.isLive}
              onChange={(v) => update("isLive", v)}
              label={
                <span className="text-sm">
                  {settings.isLive
                    ? pick(
                        {
                          zh: "屏幕采集 (直播) / Screen capture (Live)",
                          en: "Screen capture (Live)",
                        },
                        lang,
                      )
                    : pick(
                        { zh: "文件输入 (点播) / File input (VOD)", en: "File input (VOD)" },
                        lang,
                      )}
                </span>
              }
            />

            {!settings.isLive ? (
              <div className="flex items-center gap-2 flex-wrap">
                <FileVideo className="w-4 h-4 text-primary shrink-0" />
                <span className="ffs-mono text-sm truncate max-w-[40%]">{inputName}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {inputInfo?.duration ? <Badge>{fmtTime(inputInfo.duration)}</Badge> : null}
                  {inputInfo?.width ? (
                    <Badge>{`${inputInfo.width}×${inputInfo.height}`}</Badge>
                  ) : null}
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
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <Monitor className="w-4 h-4 text-primary shrink-0" />
                <Badge>x11grab :0.0 @ {settings.fps}fps</Badge>
                <Badge>GOP: {settings.keyframeInterval}s</Badge>
              </div>
            )}
          </div>
        </Card>

        {/* ===== Protocol + URL + Key card ===== */}
        <Card>
          <div className="grid grid-cols-1 gap-4">
            <Field label={pick(t.streamProtocol, lang)} hint={`-f ${settings.protocol}`}>
              <PillGroup
                value={settings.protocol}
                onChange={(v) => update("protocol", v)}
                variant="soft"
                options={[
                  { value: "rtmp", label: <span>RTMP</span> },
                  { value: "hls", label: <span>HLS</span> },
                  { value: "rtsp", label: <span>RTSP</span> },
                  { value: "srt", label: <span>SRT</span> },
                ]}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={pick(t.streamUrl, lang)} hint="ingest endpoint">
                <Input
                  value={settings.url}
                  placeholder="rtmp://live.example.com/app"
                  onChange={(v) => update("url", v)}
                />
              </Field>

              <Field label={pick(t.streamKey, lang)} hint="stream key">
                <Input
                  value={settings.key}
                  placeholder="stream_key"
                  onChange={(v) => update("key", v)}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* ===== Encode params card ===== */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label={pick(t.streamVCodec, lang)} hint={`-c:v ${settings.vCodec}`}>
              <Select value={settings.vCodec} onChange={(v) => update("vCodec", v as any)}>
                <option value="libx264">libx264 (x264)</option>
                <option value="h264_nvenc">h264_nvenc (NVIDIA)</option>
                <option value="h264_videotoolbox">h264_videotoolbox (macOS)</option>
                <option value="h264_qsv">h264_qsv (Intel)</option>
              </Select>
            </Field>

            <Field label={pick(t.streamACodec, lang)} hint={`-c:a ${settings.aCodec}`}>
              <Select value={settings.aCodec} onChange={(v) => update("aCodec", v as any)}>
                <option value="aac">AAC</option>
                <option value="mp3">MP3 (libmp3lame)</option>
              </Select>
            </Field>

            <Field label={pick(t.framerate, lang)} hint={`-r ${settings.fps}`}>
              <Select value={String(settings.fps)} onChange={(v) => update("fps", parseInt(v))}>
                <option value="24">24</option>
                <option value="30">30</option>
                <option value="60">60</option>
              </Select>
            </Field>

            <Field label={pick(t.streamBitrateV, lang)} hint={`-b:v ${settings.bitrateV}`}>
              <Select value={settings.bitrateV} onChange={(v) => update("bitrateV", v)}>
                <option value="1500k">1500k (720p)</option>
                <option value="2500k">2500k (720p+)</option>
                <option value="4000k">4000k (1080p)</option>
                <option value="6000k">6000k (1080p+)</option>
                <option value="8000k">8000k (1080p high)</option>
              </Select>
            </Field>

            <Field label={pick(t.streamBitrateA, lang)} hint={`-b:a ${settings.bitrateA}`}>
              <Select value={settings.bitrateA} onChange={(v) => update("bitrateA", v)}>
                <option value="96k">96k</option>
                <option value="128k">128k</option>
                <option value="160k">160k</option>
                <option value="192k">192k</option>
                <option value="320k">320k</option>
              </Select>
            </Field>

            <Field label={pick(t.streamPreset, lang)} hint={`-preset ${settings.preset}`}>
              <Select value={settings.preset} onChange={(v) => update("preset", v)}>
                <option value="ultrafast">ultrafast</option>
                <option value="superfast">superfast</option>
                <option value="veryfast">veryfast</option>
                <option value="faster">faster</option>
                <option value="medium">medium</option>
                <option value="slow">slow</option>
              </Select>
            </Field>

            <Field
              label={pick(t.streamKeyframe, lang)}
              hint={`-g ${settings.fps * settings.keyframeInterval} (GOP ${settings.keyframeInterval}s)`}
            >
              <div className="flex flex-col gap-1">
                <Range
                  value={settings.keyframeInterval}
                  min={1}
                  max={5}
                  step={1}
                  onChange={(v) => update("keyframeInterval", v)}
                />
                <div className="flex justify-between ffs-mono text-[10px] text-muted-foreground">
                  <span>1s</span>
                  <span>2s</span>
                  <span>3s</span>
                  <span>4s</span>
                  <span>5s</span>
                </div>
              </div>
            </Field>
          </div>
        </Card>

        {/* ===== Tips card ===== */}
        <Card>
          <div className="flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">{pick(t.streamHint, lang)}</p>
          </div>
        </Card>
      </div>
    </WorkArea>
  );
}
