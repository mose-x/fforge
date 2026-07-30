import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { RunFFmpeg, SelectOutputPath } from "../wailsjs/go/main/App";
import type { RunRequest } from "./types";
import type { CommandResult } from "./command";
import { t, pick } from "./i18n";

/**
 * Runs an ffmpeg job. The CommandResult.args contain the *display names*
 * (input basename / output filename); we substitute the real absolute paths
 * before execution so ffmpeg reads/writes the correct files.
 *
 * If no output path is supplied, the user is prompted with a save dialog.
 */
export function useRunner() {
  const { engine, lang, toast, setRunning, setProgress } = useStore();

  const run = useCallback(
    async (
      command: CommandResult,
      inputName: string,
      inputPath: string,
      outputName: string,
      duration: number,
      outputPath?: string,
    ): Promise<boolean> => {
      if (!engine?.ffmpegAvailable) {
        toast(pick(t.ffmpegMissing, lang), "error");
        return false;
      }
      if (!inputPath) {
        toast(lang === "zh" ? "请先选择输入文件" : "Please select an input file first", "error");
        return false;
      }

      // resolve output path
      let outPath = outputPath;
      if (!outPath) {
        try {
          outPath = await SelectOutputPath(outputName || "output.mp4");
        } catch {
          /* cancelled */
        }
        if (!outPath) return false;
      }

      // substitute real paths into args (display names -> absolute paths)
      const args = command.args.map((a) => {
        if (a === inputName) return inputPath;
        if (a === outputName) return outPath;
        return a;
      });
      // drop the leading "ffmpeg" token (we call the binary directly)
      const realArgs = args.slice(1);

      const req: RunRequest = {
        args: realArgs,
        outputPath: outPath,
        duration: duration || 0,
      };

      setProgress({
        percent: 0,
        timeSec: 0,
        speed: "",
        frame: 0,
        status: "running",
        message: "",
        outputPath: outPath,
      });
      setRunning(true);
      try {
        await RunFFmpeg(req);
        return true;
      } catch (e: any) {
        // error event already toasted via store listener; surface here too if needed
        toast(
          (lang === "zh" ? "执行失败" : "Execution failed") + ": " + (e?.message || String(e)),
          "error",
        );
        return false;
      }
    },
    [engine, lang, toast, setRunning, setProgress],
  );

  return { run };
}
