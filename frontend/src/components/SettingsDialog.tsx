import { useEffect, useState } from "react";
import { GetSettings, SaveSettings, CheckProxy } from "../wailsjs/go/main/App";
import type { config } from "../wailsjs/go/models";
import { useStore } from "../store/useStore";
import { t, pick } from "../lib/i18n";
import { X, Settings, Globe, Loader2 } from "lucide-react";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { lang, toast } = useStore();
  const [settings, setSettings] = useState<config.AppSettings | null>(null);
  const [checking, setChecking] = useState<Record<string, boolean>>({});

  useEffect(() => {
    GetSettings()
      .then((s) => setSettings(s))
      .catch(() => {});
  }, []);

  if (!settings) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-[480px] max-w-[90vw] rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Loader2 className="animate-spin text-muted" />
        </div>
      </div>
    );
  }

  const save = (next: config.AppSettings) => {
    setSettings(next);
    SaveSettings(next)
      .then(() => toast(pick(t.settingsSaved, lang), "success"))
      .catch((e: unknown) => toast(e instanceof Error ? e.message : String(e), "error"));
  };
  const patchProxy = (p: Partial<config.ProxySettings>) =>
    save({ ...settings, proxy: { ...settings.proxy, ...p } });

  const checkProxy = async (target: string, label: string) => {
    if (
      settings.proxy?.enabled &&
      settings.proxy.mode === "custom" &&
      !settings.proxy.url?.trim()
    ) {
      toast(pick(t.proxyUrlRequired, lang), "info");
      return;
    }
    setChecking((c) => ({ ...c, [target]: true }));
    try {
      await CheckProxy(target);
      toast(pick(t.proxyCheckSuccess, lang).replace("{{target}}", label), "success");
    } catch (e: unknown) {
      toast(
        pick(t.proxyCheckFail, lang)
          .replace("{{target}}", label)
          .replace("{{error}}", e instanceof Error ? e.message : String(e)),
        "error",
      );
    } finally {
      setChecking((c) => ({ ...c, [target]: false }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-[90vw] rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings size={18} />
            {pick(t.settings, lang)}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Proxy */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Globe size={16} />
              {pick(t.settingsProxy, lang)}
            </span>
            <button
              className={`relative w-10 h-6 rounded-full transition-colors ${
                settings.proxy?.enabled ? "bg-blue-600" : "bg-border"
              }`}
              onClick={() => patchProxy({ enabled: !settings.proxy?.enabled })}
            >
              <span
                className={`absolute top-1 block w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.proxy?.enabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {settings.proxy?.enabled && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["system", "custom"] as const).map((m) => (
                  <button
                    key={m}
                    className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${
                      settings.proxy?.mode === m
                        ? "bg-blue-600 text-white"
                        : "bg-background text-muted hover:text-foreground"
                    }`}
                    onClick={() => patchProxy({ mode: m })}
                  >
                    {pick(m === "system" ? t.proxySystem : t.proxyCustom, lang)}
                  </button>
                ))}
              </div>

              {settings.proxy?.mode === "custom" && (
                <div className="flex gap-2">
                  {(["http", "socks5"] as const).map((p) => (
                    <button
                      key={p}
                      className={`px-3 py-1.5 rounded-md text-xs ${
                        settings.proxy?.protocol === p
                          ? "bg-primary-soft text-primary"
                          : "bg-background text-muted"
                      }`}
                      onClick={() => patchProxy({ protocol: p })}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                  <input
                    className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                    placeholder={
                      settings.proxy?.protocol === "socks5" ? "127.0.0.1:1080" : "127.0.0.1:7890"
                    }
                    value={settings.proxy?.url || ""}
                    onChange={(e) => patchProxy({ url: e.target.value })}
                    onBlur={(e) => patchProxy({ url: e.target.value.trim() })}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                  onClick={() => checkProxy("https://www.baidu.com", pick(t.proxyCheckBaidu, lang))}
                >
                  {checking["https://www.baidu.com"] && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  {pick(t.proxyCheckBaidu, lang)}
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
                  onClick={() => checkProxy("https://www.google.com", "Google")}
                >
                  {checking["https://www.google.com"] && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  {pick(t.proxyCheckGoogle, lang)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* GitHub mirror */}
        <div className="space-y-2">
          <span className="text-sm font-medium">{pick(t.githubMirror, lang)}</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
            placeholder="https://ghfast.top"
            value={settings.githubMirror || ""}
            onChange={(e) => setSettings({ ...settings, githubMirror: e.target.value })}
            onBlur={(e) => setSettings({ ...settings, githubMirror: e.target.value.trim() })}
          />
          <p className="text-xs text-muted">{pick(t.githubMirrorDesc, lang)}</p>
          <button
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
            onClick={() =>
              save({ ...settings, githubMirror: (settings.githubMirror || "").trim() })
            }
          >
            {pick(t.settingsSaved, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
