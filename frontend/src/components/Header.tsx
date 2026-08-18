import { Moon, Sun, Settings, CircleHelp, Terminal, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { t, pick } from "../lib/i18n";
import type { Lang } from "../lib/i18n";
import { Environment } from "../wailsjs/runtime/runtime";

export function Header() {
  const { theme, lang, toggleTheme, setLang, toast, setShowUpdate, setShowSettings } = useStore();
  const [platform, setPlatform] = useState("");

  useEffect(() => {
    Environment()
      .then((env) => setPlatform(env.platform))
      .catch(() => {});
  }, []);

  return (
    <header
      className={`h-14 shrink-0 border-b border-border px-5 flex items-center justify-between bg-card drag-region ${platform === "darwin" ? "pl-[78px]" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0 no-drag">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Terminal className="w-[18px] h-[18px] text-primary-foreground" />
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="ffs-display font-semibold text-[15px] truncate">
            {pick(t.appName, lang)}
          </span>
          <span className="text-muted-foreground text-xs shrink-0">/ FFmpeg Studio</span>
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

        {/* Check Update */}
        <button
          className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          aria-label={pick(t.updateCheckBtn, lang)}
          title={pick(t.updateCheckBtn, lang)}
          onClick={() => setShowUpdate(true)}
        >
          <RefreshCw className="w-[18px] h-[18px]" />
        </button>

        {/* Settings */}
        <button
          className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          aria-label={pick(t.settings, lang)}
          onClick={() => setShowSettings(true)}
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
                ? "FFmpeg Studio · 基于 Wails + React 构建 / built with Wails + React"
                : "FFmpeg Studio · built with Wails + React",
            )
          }
        >
          <CircleHelp className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
