import { useEffect, useState, useCallback } from "react";
import { CheckUpdate, DownloadUpdate, ApplyUpdate, GetAppInfo } from "../wailsjs/go/main/App";
import { EventsOn, BrowserOpenURL } from "../wailsjs/runtime/runtime";
import type { main } from "../wailsjs/go/models";
import type { UpdateProgress } from "../lib/types";
import { useStore } from "../store/useStore";
import { t, pick } from "../lib/i18n";
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";

type Stage =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error"
  | "latest"
  | "manual";

export function UpdateDialog({ onClose }: { onClose: () => void }) {
  const { lang, toast } = useStore();
  const [stage, setStage] = useState<Stage>("checking");
  const [appInfo, setAppInfo] = useState<main.AppInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<main.UpdateInfo | null>(null);
  const [progress, setProgress] = useState({ percent: 0, message: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    GetAppInfo()
      .then((info) => setAppInfo(info))
      .catch(() => {});
    const off = EventsOn("update:progress", (p: UpdateProgress) => {
      setProgress({ percent: p.percent || 0, message: p.message || "" });
      if (p.stage === "done") {
        setStage("ready");
      }
    });
    doCheck();
    return off;
  }, []);

  const doCheck = useCallback(async () => {
    setStage("checking");
    setError("");
    try {
      const info = await CheckUpdate();
      setUpdateInfo(info);
      if (info.hasUpdate && info.manualInstall) {
        setStage("manual");
      } else if (info.hasUpdate) {
        setStage("available");
      } else {
        setStage("latest");
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      setStage("error");
    }
  }, []);

  const doDownload = useCallback(async () => {
    if (!updateInfo) return;
    setStage("downloading");
    setError("");
    try {
      await DownloadUpdate(updateInfo.downloadUrl, updateInfo.sha256);
    } catch (e: any) {
      setError(e?.message || String(e));
      setStage("error");
    }
  }, [updateInfo]);

  const doApply = useCallback(async () => {
    try {
      await ApplyUpdate();
      toast(pick(t.updateRestarting, lang), "info");
    } catch (e: any) {
      setError(e?.message || String(e));
      setStage("error");
    }
  }, [lang, toast]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-[90vw] rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{pick(t.updateTitle, lang)}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Version info */}
        {appInfo && (
          <div className="mb-4 text-sm text-muted">
            {pick(t.updateCurrentVersion, lang)}:{" "}
            <span className="text-foreground font-medium">v{appInfo.version}</span>
          </div>
        )}

        {/* Checking */}
        {stage === "checking" && (
          <div className="flex items-center gap-3 py-6 text-muted">
            <Loader2 size={20} className="animate-spin" />
            <span>{pick(t.updateChecking, lang)}</span>
          </div>
        )}

        {/* Latest */}
        {stage === "latest" && (
          <div className="flex items-center gap-3 py-6 text-green-500">
            <CheckCircle2 size={20} />
            <span>{pick(t.updateLatest, lang)}</span>
          </div>
        )}

        {/* Available */}
        {stage === "available" && updateInfo && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-foreground">
              <RefreshCw size={20} className="text-blue-500" />
              <span>
                {pick(t.updateNewVersion, lang)}:{" "}
                <span className="font-semibold text-blue-500">v{updateInfo.latestVersion}</span>
              </span>
            </div>
            {updateInfo.changelog && (
              <div className="rounded-lg border border-border bg-background p-3 max-h-40 overflow-auto">
                <pre className="text-xs text-muted whitespace-pre-wrap font-mono">
                  {updateInfo.changelog}
                </pre>
              </div>
            )}
            <button
              onClick={doDownload}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              {pick(t.updateDownload, lang)}
            </button>
          </div>
        )}

        {/* Manual (major-version) install */}
        {stage === "manual" && updateInfo && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-foreground">
              <AlertCircle size={20} className="text-amber-500" />
              <span>
                {pick(t.updateMajor, lang)}:{" "}
                <span className="font-semibold text-amber-500">v{updateInfo.latestVersion}</span>
              </span>
            </div>
            {updateInfo.changelog && (
              <div className="rounded-lg border border-border bg-background p-3 max-h-40 overflow-auto">
                <pre className="text-xs text-muted whitespace-pre-wrap font-mono">
                  {updateInfo.changelog}
                </pre>
              </div>
            )}
            <p className="text-sm text-muted">{pick(t.updateMajorHint, lang)}</p>
            <button
              onClick={() => {
                if (updateInfo.installerUrl) BrowserOpenURL(updateInfo.installerUrl);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-white font-medium hover:bg-amber-700 transition-colors"
            >
              <Download size={16} />
              {pick(t.updateDownloadInstaller, lang)}
            </button>
          </div>
        )}

        {/* Downloading */}
        {stage === "downloading" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 text-muted">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">{progress.message || pick(t.updateDownloading, lang)}</span>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="text-right text-xs text-muted">{progress.percent}%</div>
          </div>
        )}

        {/* Ready to apply */}
        {stage === "ready" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-green-500">
              <CheckCircle2 size={20} />
              <span>{pick(t.updateReady, lang)}</span>
            </div>
            <button
              onClick={doApply}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-white font-medium hover:bg-green-700 transition-colors"
            >
              <RefreshCw size={16} />
              {pick(t.updateApply, lang)}
            </button>
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-red-500">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
            <button
              onClick={doCheck}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-foreground hover:bg-background transition-colors"
            >
              <RotateCcw size={16} />
              {pick(t.updateRetry, lang)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
