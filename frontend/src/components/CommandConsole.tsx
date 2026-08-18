import { Copy, CircleHelp, ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import { useStore } from "../store/useStore";
import { t, pick } from "../lib/i18n";
import { copyText, fmtSize, estTimeLabel } from "../lib/format";
import type { CommandResult } from "../lib/command";
import { OpenInFolder } from "../wailsjs/go/main/App";
import { useState, useMemo } from "react";

export function CommandConsole({
  command,
  inputSize,
  onOpenFolder,
}: {
  command: CommandResult;
  inputSize: number;
  onOpenFolder?: () => void;
}) {
  const { lang, consoleCollapsed, toggleConsole, running, progress, toast } = useStore();
  const [copied, setCopied] = useState(false);

  const cmdString = useMemo(() => command.args.join(" "), [command.args]);
  const estOut = inputSize > 0 ? fmtSize(inputSize * command.sizeRatio) : "—";
  const pct = running && progress ? Math.max(0, Math.min(100, progress.percent)) : 0;
  const statusLabel = running
    ? pick(t.running, lang)
    : progress?.status === "done"
      ? pick(t.done, lang)
      : pick(t.ready, lang);
  const statusColor = running
    ? "bg-state-warning"
    : progress?.status === "done"
      ? "bg-state-success"
      : progress?.status === "error"
        ? "bg-state-error"
        : "bg-state-success";

  const handleCopy = async () => {
    const ok = await copyText(cmdString);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast(lang === "zh" ? "复制失败 / Copy failed" : "Copy failed", "error");
    }
  };

  return (
    <div
      className="shrink-0 bg-console border-t border-console-border flex flex-col transition-all"
      style={{ height: consoleCollapsed ? "36px" : "var(--ffs-console-h)" }}
    >
      {/* Console header */}
      <div className="h-9 shrink-0 px-4 flex items-center justify-between border-b border-console-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-console-text">{pick(t.command, lang)}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[11px] text-primary">{pick(t.live, lang)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="h-7 w-7 rounded flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-console-border text-console-text"
            aria-label={pick(t.copy, lang)}
            onClick={handleCopy}
            title={cmdString}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            className="h-7 w-7 rounded flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-console-border text-console-text"
            aria-label={pick(t.help, lang)}
            onClick={() =>
              toast(
                lang === "zh"
                  ? "命令可复制后直接在终端运行 / 添加 -y 覆盖输出"
                  : "Command can be run in a terminal / add -y to overwrite",
              )
            }
          >
            <CircleHelp className="w-4 h-4" />
          </button>
          <button
            className="h-7 w-7 rounded flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-console-border text-console-text"
            aria-label={consoleCollapsed ? pick(t.expand, lang) : pick(t.collapse, lang)}
            onClick={toggleConsole}
          >
            {consoleCollapsed ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {!consoleCollapsed && (
        <>
          {/* Terminal body */}
          <div className="flex-1 overflow-auto px-4 py-3 app-scroll relative">
            <code className="ffs-mono text-[13px] leading-relaxed break-all text-console-text">
              {command.tokens.map((tok, i) => (
                <span key={i} className={tokenClass(tok.type)}>
                  {tok.text}{" "}
                </span>
              ))}
            </code>
            {/* running progress bar */}
            {running && (
              <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-console-border">
                <div
                  className="h-full bg-primary progress-stripes transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>

          {/* Command breakdown */}
          <div className="shrink-0 px-4 py-2 border-t border-console-border max-h-[80px] overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] ffs-mono text-console-text">
              {command.breakdown.map((b, i) => (
                <BreakdownRow key={i} flag={b.flag} desc={b.desc} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Status bar */}
      <div className="h-7 shrink-0 px-4 flex items-center justify-between border-t border-console-border text-[11px] gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor} shrink-0`} />
          <span className="opacity-70 text-console-text truncate">
            {statusLabel}
            {running && progress && progress.speed ? ` · ${progress.speed}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="ffs-mono opacity-60 text-console-text">
            {pick(t.estOut, lang)} ~{estOut} · {pick(t.estTime, lang)}{" "}
            {estTimeLabel(command.estSec)}
          </span>
          {progress?.status === "done" && progress.outputPath && (
            <button
              className="flex items-center gap-1 text-primary hover:opacity-80"
              onClick={() => {
                if (onOpenFolder) onOpenFolder();
                else
                  OpenInFolder(progress.outputPath).catch((e: any) =>
                    toast(
                      lang === "zh"
                        ? "无法打开文件夹 / Failed to open folder: " + (e?.message || String(e))
                        : "Failed to open folder: " + (e?.message || String(e)),
                      "error",
                    ),
                  );
              }}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{pick(t.openFolder, lang)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ flag, desc }: { flag: string; desc: string }) {
  const { lang } = useStore();
  // desc strings are "中文 / English"; English mode shows only the English part.
  const parts = desc.split(" / ");
  const text = lang === "en" ? parts[1] || parts[0] : desc;
  // Decide token color by simple heuristic
  const isFile = /\.(mp4|mkv|mov|webm|avi|ts|mp3|aac|wav|m4a|flac)$/i.test(flag);
  return (
    <>
      <span className={isFile ? "ffs-tok-file" : "ffs-tok-flag"}>{flag}</span>
      <span className="opacity-80">{text}</span>
    </>
  );
}

function tokenClass(type: string): string {
  switch (type) {
    case "cmd":
      return "ffs-tok-cmd";
    case "flag":
      return "ffs-tok-flag";
    case "file":
      return "ffs-tok-file";
    case "str":
      return "ffs-tok-str";
    case "dim":
      return "ffs-tok-dim";
    default:
      return "ffs-tok-val";
  }
}
