import { Terminal } from "lucide-react";
import { useStore } from "../store/useStore";
import { t, pick } from "../lib/i18n";
import { buildConvertCommand, DEFAULT_CONVERT } from "../lib/command";

/**
 * Placeholder page for nav items not yet implemented.
 * Reuses the format-convert command as a neutral console preview.
 */
export function ComingSoonPage() {
  const { lang } = useStore();
  const command = buildConvertCommand({ ...DEFAULT_CONVERT, inputName: "input.mp4" });
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="h-14 shrink-0 border-b border-border px-4 md:px-6 flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-muted-foreground">{pick(t.secMedia, lang)}</span>
          <span className="ffs-display font-semibold text-lg truncate">
            {pick(t.comingSoon, lang)}
          </span>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
          <Terminal className="w-6 h-6" />
        </div>
        <p className="ffs-display text-lg font-semibold">{pick(t.comingSoon, lang)}</p>
        <p className="text-sm text-muted-foreground max-w-md">
          {lang === "zh"
            ? "该页面为占位页。所有功能模块均已实现，请从左侧导航选择。"
            : "This is a placeholder page. All modules are implemented — select from the sidebar."}
        </p>
      </div>
      <div className="shrink-0 bg-console border-t border-console-border h-9 flex items-center px-4">
        <span className="text-xs text-console-text opacity-70">{command.args.join(" ")}</span>
      </div>
    </div>
  );
}
