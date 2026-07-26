import { CheckCircle2, XCircle, Info } from "lucide-react";
import { useStore } from "../store/useStore";

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto fade-in flex items-start gap-2.5 px-4 py-2.5 rounded-md border shadow-md bg-popover text-popover-foreground text-sm max-w-sm ${
            t.type === "success"
              ? "border-state-success/40"
              : t.type === "error"
              ? "border-state-error/40"
              : "border-border"
          }`}
        >
          {t.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-state-success shrink-0 mt-0.5" />
          ) : t.type === "error" ? (
            <XCircle className="w-4 h-4 text-state-error shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{t.message}</span>
          <button
            className="ml-auto text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => dismissToast(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
