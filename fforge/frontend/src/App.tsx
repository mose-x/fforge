import { useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Toasts } from "./components/Toasts";
import { FormatConvertPage } from "./pages/FormatConvert";
import { CutTrimPage } from "./pages/CutTrim";
import { VideoFiltersPage } from "./pages/VideoFilters";
import { ComingSoonPage } from "./pages/ComingSoon";
import { useStore } from "./store/useStore";
import { EngineStatus as GetEngineStatus } from "./wailsjs/go/main/App";
import { t, pick } from "./lib/i18n";

export default function App() {
  const { page, lang, init, setEngine } = useStore();

  useEffect(() => {
    init();
    // Probe ffmpeg/ffprobe availability on startup.
    GetEngineStatus()
      .then((e) => setEngine(e))
      .catch(() => {});
  }, [init, setEngine]);

  const breadcrumb = useMemo(() => pick(t.secMedia, lang), [lang]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="fade-in flex-1 flex flex-col min-w-0 overflow-hidden" key={page}>
              {page === "convert" && <FormatConvertPage />}
              {page === "cut" && <CutTrimPage />}
              {page === "filters" && <VideoFiltersPage />}
              {page === "coming-soon" && <ComingSoonPage />}
            </div>
          </section>
        </main>
      </div>

      <Toasts />
      {/* hidden breadcrumb ref for accessibility */}
      <span className="sr-only">{breadcrumb}</span>
    </div>
  );
}
