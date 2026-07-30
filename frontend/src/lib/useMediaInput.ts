import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { SelectMediaFile, ProbeMedia } from "../wailsjs/go/main/App";
import type { MediaInfo } from "./types";
import { t, pick } from "./i18n";

/**
 * Opens a file dialog, probes the chosen file and stores the result.
 * Returns the resolved MediaInfo or null if cancelled.
 */
export function useMediaInput() {
  const { setInputInfo, lang, toast } = useStore();

  const pickFile = useCallback(async (): Promise<MediaInfo | null> => {
    try {
      const path = await SelectMediaFile();
      if (!path) return null;
      const info = await ProbeMedia(path);
      setInputInfo(info);
      return info;
    } catch (e: any) {
      toast(
        (lang === "zh" ? "读取文件失败" : "Failed to read file") + ": " + (e?.message || String(e)),
        "error",
      );
      return null;
    }
  }, [setInputInfo, lang, toast]);

  return { pickFile };
}

// re-export for convenience
export { pick, t };
