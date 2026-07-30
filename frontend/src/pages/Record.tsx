import { useMemo, useState, useEffect } from "react";
import { MonitorPlay, MonitorStop, Info, Monitor, Square, Camera } from "lucide-react";
import { useStore } from "../store/useStore";
import { WorkArea, type PageAction } from "../components/WorkArea";
import {
  Card,
  CardHeader,
  Field,
  Input,
  Segmented,
  Select,
  Toggle,
  ButtonSecondary,
  Badge,
} from "../components/ui";
import {
  buildRecordCommand,
  type RecordSettings,
  DEFAULT_RECORD,
  platformVideoInput,
} from "../lib/command";
import { t, pick } from "../lib/i18n";
import { useRunner } from "../lib/useRunner";

type Platform = "darwin" | "win32" | "linux";

function detectPlatform(): Platform {
  if (typeof window !== "undefined" && (window as any).__TAURI__) {
    return "linux";
  }
  return "linux";
}

export function RecordPage() {
  const { lang, running: globalRunning } = useStore();
  const { run } = useRunner();

  const [recording, setRecording] = useState(false);
  const [audioDevices, setAudioDevices] = useState<{ id: string; name: string; kind: string }[]>(
    [],
  );

  const [settings, setSettings] = useState<RecordSettings>({
    ...DEFAULT_RECORD,
    platform: detectPlatform(),
  });

  useEffect(() => {
    let mounted = true;
    const fetchDevices = async () => {
      try {
        const w = window as any;
        if (w.go?.main?.App?.ListInputDevices) {
          const devices = await w.go.main.App.ListInputDevices();
          if (mounted && Array.isArray(devices)) {
            setAudioDevices(devices.filter((d: any) => d.kind === "audioinput"));
          }
        }
      } catch {
        if (mounted) {
          setAudioDevices([{ id: "default", name: "Default", kind: "audioinput" }]);
        }
      }
    };
    fetchDevices();
    return () => {
      mounted = false;
    };
  }, []);

  const update = <K extends keyof RecordSettings>(key: K, value: RecordSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const command = useMemo(() => buildRecordCommand(settings), [settings]);

  const fakeInputName = platformVideoInput(settings.platform);
  const isRunning = recording || globalRunning;

  const handleToggleRecord = () => {
    if (!isRunning) {
      setRecording(true);
      run(
        command,
        fakeInputName,
        settings.platform === "linux" ? ":0.0" : "desktop",
        settings.outputName,
        0,
      );
    } else {
      setRecording(false);
    }
  };

  const primary: PageAction = {
    icon: isRunning ? <MonitorStop className="w-4 h-4" /> : <MonitorPlay className="w-4 h-4" />,
    label: isRunning ? pick(t.stopRecord, lang) : pick(t.startRecord, lang),
    onClick: handleToggleRecord,
  };

  return (
    <WorkArea
      breadcrumb={t.secAdv}
      title={{ zh: "录屏录制 / Screen Record", en: "Screen Record" }}
      previewLabel={pick(t.preview, lang)}
      primary={primary}
      command={command}
      inputSize={0}
    >
      <div className="flex flex-col gap-4">
        {/* ===== Device selection card ===== */}
        <Card>
          <CardHeader
            icon={<Monitor className="w-4 h-4 text-primary shrink-0" />}
            title={pick(t.recordSource, lang)}
          />
          <div className="flex flex-col gap-3">
            <Segmented
              size="md"
              value={settings.source}
              onChange={(v) => update("source", v)}
              options={[
                {
                  value: "screen",
                  label: (
                    <span className="flex items-center justify-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" />
                      <span>{pick(t.recordSourceScreen, lang)}</span>
                    </span>
                  ),
                },
                {
                  value: "window",
                  label: (
                    <span className="flex items-center justify-center gap-1.5">
                      <Square className="w-3.5 h-3.5" />
                      <span>{pick(t.recordSourceWindow, lang)}</span>
                    </span>
                  ),
                },
                {
                  value: "camera",
                  label: (
                    <span className="flex items-center justify-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{pick(t.recordSourceCamera, lang)}</span>
                    </span>
                  ),
                },
              ]}
            />
            <div className="flex items-center gap-2 flex-wrap">
              {isRunning && (
                <Badge>
                  <span className="relative inline-flex w-2 h-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full w-2 h-2 bg-red-500" />
                  </span>
                  {pick(t.running, lang)}
                </Badge>
              )}
              <Badge>{`platform: ${settings.platform}`}</Badge>
              <ButtonSecondary
                icon={<Info className="w-3.5 h-3.5" />}
                onClick={() => setAudioDevices((prev) => (prev.length > 0 ? [] : prev))}
              >
                {pick({ zh: "刷新设备", en: "Refresh" }, lang)}
              </ButtonSecondary>
            </div>
          </div>
        </Card>

        {/* ===== Record params card ===== */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label={pick(t.recordArea, lang)} hint="-video_size / -i">
              <div className="flex gap-2">
                <Input
                  value={settings.region}
                  placeholder="1920x1080"
                  onChange={(v) => update("region", v)}
                  className="flex-1"
                />
                <Input
                  value={settings.offset}
                  placeholder="+0,0"
                  onChange={(v) => update("offset", v)}
                  className="w-24"
                />
              </div>
            </Field>

            <Field label={pick(t.recordFps, lang)} hint={`-framerate ${settings.fps}`}>
              <Select value={String(settings.fps)} onChange={(v) => update("fps", parseInt(v))}>
                <option value="15">15</option>
                <option value="24">24</option>
                <option value="30">30</option>
                <option value="60">60</option>
              </Select>
            </Field>

            <Field label={pick(t.recordCodec, lang)} hint={`-c:v ${settings.vCodec}`}>
              <Select value={settings.vCodec} onChange={(v) => update("vCodec", v as any)}>
                <option value="libx264">libx264</option>
                <option value="libx265">libx265</option>
                <option value="h264_nvenc">h264_nvenc (NVIDIA)</option>
                <option value="h264_videotoolbox">h264_videotoolbox (macOS)</option>
                <option value="h264_qsv">h264_qsv (Intel)</option>
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={pick(t.recordAudio, lang)}
                hint={settings.captureAudio ? "audio on" : "audio off"}
              >
                <div className="flex flex-col gap-2">
                  <Toggle
                    checked={settings.captureAudio}
                    onChange={(v) => update("captureAudio", v)}
                    label={pick(t.recordAudio, lang)}
                  />
                  {settings.captureAudio && (
                    <Select value={settings.audioDevice} onChange={(v) => update("audioDevice", v)}>
                      <option value="default">Default</option>
                      {audioDevices.map((d) => (
                        <option key={d.id} value={d.id || d.name}>
                          {d.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </Field>
            </div>

            <Field label={pick(t.recordOutput, lang)}>
              <Input
                value={settings.outputName}
                onChange={(v) => update("outputName", v || "screen_recording.mp4")}
              />
            </Field>
          </div>
        </Card>

        {/* ===== Tips card ===== */}
        <Card>
          <div className="flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">{pick(t.recordHint, lang)}</p>
          </div>
        </Card>
      </div>
    </WorkArea>
  );
}
