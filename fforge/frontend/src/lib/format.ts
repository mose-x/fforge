// Time / size formatting helpers shared across pages.

/** Format seconds as HH:MM:SS (no decimals), matching the design time codes. */
export function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/** Parse a HH:MM:SS or MM:SS or seconds string into seconds. Returns 0 on failure. */
export function parseTime(input: string): number {
  if (!input) return 0;
  const trimmed = input.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
  const parts = trimmed.split(":").map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return 0;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return sec;
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

/** Human-readable file size. */
export function fmtSize(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Estimate output size (MB) from input size + ratio, used for the status bar. */
export function estOutputSize(inputBytes: number, ratio: number): string {
  if (!inputBytes) return "—";
  const est = inputBytes * ratio;
  return fmtSize(est);
}

/** Rough time estimate for the status bar (purely cosmetic). */
export function estTimeLabel(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "~0m00s";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `~${m}m${pad2(s)}s`;
}

/** Copy text to clipboard with a legacy fallback. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
