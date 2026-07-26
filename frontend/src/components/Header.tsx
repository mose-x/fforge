import { Moon, Sun, Settings, CircleHelp, Terminal } from "lucide-react";
import { useStore } from "../store/useStore";
import { t, pick } from "../lib/i18n";
import type { Lang } from "../lib/i18n";

export function Header() {
  const { theme, lang, toggleTheme, setLang, toast } = useStore();

  return (
    <header className="h-14 shrink-0 border-b border-border px-5 flex items-center justify-between bg-card drag-region">
      <div className="flex items-center gap-3 min-w-0 no-drag">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Terminal className="w-[18px] h-[18px] text-primary-foreground" />
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="ffs-display font-semibold text-[15px] truncate">
            {pick(t.appName, lang)}
          </span>
          <span className="text-muted-foreground text-xs shrink-0">
            / FFmpeg Studio
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 no-drag">
        {/* Language toggle pill */}
        <div className="flex items-center rounded-md border border-border p-0.5 text-xs">
          <button
            className={`h-7 px-2.5 rounded ${
              lang === "zh"
                ? "bg-primary-soft text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setLang("zh")}
          >
            中
          </button>
          <button
            className={`h-7 px-2.5 rounded ${
              lang === "en"
                ? "bg-primary-soft text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setLang("en" as Lang)}
          >
            EN
          </button>
        </div>

        {/* Theme toggle */}
        <button
          className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          aria-label={pick(t.theme, lang)}
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <Moon className="w-[18px] h-[18px]" />
          ) : (
            <Sun className="w-[18px] h-[18px]" />
          )}
        </button>

        {/* Settings */}
        <button
          className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          aria-label={pick(t.settings, lang)}
          onClick={() => toast(lang === "zh" ? "设置面板即将推出" : "Settings panel coming soon")}
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>

        {/* Help */}
        <button
          className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          aria-label={pick(t.help, lang)}
          onClick={() =>
            toast(
              lang === "zh"
                ? "FFmpeg Studio · 基于 Wails + React 构建"
                : "FFmpeg Studio · built with Wails + React"
            )
          }
        >
          <CircleHelp className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
