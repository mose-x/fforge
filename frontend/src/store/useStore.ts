import { create } from "zustand";
import type { EngineStatus, MediaInfo, ProgressEvent } from "../lib/types";
import { EventsOn } from "../wailsjs/runtime/runtime";
import type { Lang } from "../lib/i18n";

export type PageId =
  | "convert"
  | "cut"
  | "filters"
  | "merge"
  | "audio"
  | "subtitles"
  | "gif"
  | "record"
  | "stream"
  | "info"
  | "coming-soon";
export type Theme = "dark" | "light";

interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

interface AppState {
  // UI
  theme: Theme;
  lang: Lang;
  page: PageId;
  consoleCollapsed: boolean;
  toasts: Toast[];
  // engine + media
  engine: EngineStatus | null;
  inputInfo: MediaInfo | null;
  inputFiles: MediaInfo[];
  progress: ProgressEvent | null;
  running: boolean;
  // actions
  init: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  setPage: (p: PageId) => void;
  toggleConsole: () => void;
  setEngine: (e: EngineStatus) => void;
  setInputInfo: (m: MediaInfo | null) => void;
  setInputFiles: (m: MediaInfo[]) => void;
  addInputFile: (m: MediaInfo) => void;
  removeInputFile: (idx: number) => void;
  clearInputFiles: () => void;
  setProgress: (p: ProgressEvent | null) => void;
  setRunning: (r: boolean) => void;
  toast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
  // update dialog
  showUpdate: boolean;
  setShowUpdate: (v: boolean) => void;
  // settings dialog
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

let progressBound = false;

export const useStore = create<AppState>((set, get) => ({
  theme: "dark",
  lang: "zh",
  page: "convert",
  consoleCollapsed: false,
  toasts: [],
  engine: null,
  inputInfo: null,
  inputFiles: [],
  progress: null,
  running: false,
  showUpdate: false,
  showSettings: false,

  init: () => {
    // Apply initial theme class to <html>
    const html = document.documentElement;
    const theme = get().theme;
    if (theme === "light") {
      html.classList.add("light");
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
    } else {
      html.classList.add("dark");
      html.classList.remove("light");
      html.setAttribute("data-theme", "dark");
    }
    // Listen for ffmpeg progress events once.
    if (!progressBound) {
      progressBound = true;
      EventsOn("ffmpeg:progress", (ev: ProgressEvent) => {
        set({ progress: ev });
        if (ev.status === "running") {
          set({ running: true });
        } else if (ev.status === "done") {
          set({ running: false });
          get().toast("✓ " + (get().lang === "zh" ? "转换完成 / Done" : "Done"), "success");
        } else if (ev.status === "error") {
          set({ running: false });
          get().toast(
            "✗ " +
              (get().lang === "zh" ? "转换失败 / Failed" : "Failed") +
              (ev.message ? ": " + ev.message : ""),
            "error",
          );
        }
      });
    }
  },

  setTheme: (theme) => {
    const html = document.documentElement;
    if (theme === "light") {
      html.classList.add("light");
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
    } else {
      html.classList.add("dark");
      html.classList.remove("light");
      html.setAttribute("data-theme", "dark");
    }
    set({ theme });
  },

  toggleTheme: () => {
    get().setTheme(get().theme === "dark" ? "light" : "dark");
  },

  setLang: (lang) => set({ lang }),
  setPage: (page) => set({ page }),
  toggleConsole: () => set({ consoleCollapsed: !get().consoleCollapsed }),
  setEngine: (engine) => set({ engine }),
  setInputInfo: (inputInfo) => set({ inputInfo }),
  setInputFiles: (inputFiles) => set({ inputFiles }),
  addInputFile: (m) => set({ inputFiles: [...get().inputFiles, m] }),
  removeInputFile: (idx) => set({ inputFiles: get().inputFiles.filter((_, i) => i !== idx) }),
  clearInputFiles: () => set({ inputFiles: [] }),
  setProgress: (progress) => set({ progress }),
  setRunning: (running) => set({ running }),

  toast: (message, type = "info") => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismissToast(id), 3800);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  setShowUpdate: (showUpdate) => set({ showUpdate }),
  setShowSettings: (showSettings) => set({ showSettings }),
}));
