import { useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Toasts } from "./components/Toasts";
import { FormatConvertPage } from "./pages/FormatConvert";
import { CutTrimPage } from "./pages/CutTrim";
import { VideoFiltersPage } from "./pages/VideoFilters";
import { ComingSoonPage } from "./pages/ComingSoon";
import { MergePage } from "./pages/Merge";
import { AudioPage } from "./pages/Audio";
import { SubtitlesPage } from "./pages/Subtitles";
import { GifPage } from "./pages/Gif";
import { RecordPage } from "./pages/Record";
import { StreamPage } from "./pages/Stream";
import { MediaInfoPage } from "./pages/MediaInfo";
import { useStore } from "./store/useStore";
import { EngineStatus as GetEngineStatus } from "./wailsjs/go/main/App";
import { t, pick } from "./lib/i18n";
import { UpdateDialog } from "./components/UpdateDialog";

export default function App() {
  const { page, lang, init, setEngine, showUpdate, setShowUpdate } = useStore();

  useEffect(() => {
    init();
    // Probe ffmpeg/ffprobe availability on startup.
    GetEngineStatus()
      .then((e) => setEngine(e))
      .catch(() => {});
  }, [init, setEngine]);

  const breadcrumb = useMemo(() => {
    switch (page) {
      case "audio":
      case "subtitles":
      case "gif":
        return pick(t.secAV, lang);
      case "record":
      case "stream":
      case "info":
        return pick(t.secAdv, lang);
      default:
        return pick(t.secMedia, lang);
    }
  }, [page, lang]);

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
              {page === "merge" && <MergePage />}
              {page === "audio" && <AudioPage />}
              {page === "subtitles" && <SubtitlesPage />}
              {page === "gif" && <GifPage />}
              {page === "record" && <RecordPage />}
              {page === "stream" && <StreamPage />}
              {page === "info" && <MediaInfoPage />}
              {page === "coming-soon" && <ComingSoonPage />}
            </div>
          </section>
        </main>
      </div>

      <Toasts />
      {showUpdate && <UpdateDialog onClose={() => setShowUpdate(false)} />}
      {/* hidden breadcrumb ref for accessibility */}
      <span className="sr-only">{breadcrumb}</span>
    </div>
  );
}
