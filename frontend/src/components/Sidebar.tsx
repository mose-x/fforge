import {
  ArrowRightLeft,
  Scissors,
  Layers,
  SlidersHorizontal,
  Music,
  Captions,
  Image as ImageIcon,
  MonitorPlay,
  Radio,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useStore, type PageId } from "../store/useStore";
import { t, pick, type Str } from "../lib/i18n";

interface NavItem {
  id: PageId;
  icon: LucideIcon;
  zh: string;
  en: string;
}

const MEDIA: NavItem[] = [
  { id: "convert", icon: ArrowRightLeft, zh: "格式转换", en: "Format Convert" },
  { id: "cut", icon: Scissors, zh: "视频剪辑", en: "Cut & Trim" },
  { id: "merge", icon: Layers, zh: "视频合并", en: "Merge" },
  { id: "filters", icon: SlidersHorizontal, zh: "滤镜效果", en: "Filters" },
];

const AV: NavItem[] = [
  { id: "audio", icon: Music, zh: "音频处理", en: "Audio" },
  { id: "subtitles", icon: Captions, zh: "字幕处理", en: "Subtitles" },
  { id: "gif", icon: ImageIcon, zh: "GIF 动图", en: "GIF" },
];

const ADV: NavItem[] = [
  { id: "record", icon: MonitorPlay, zh: "录屏录制", en: "Screen Record" },
  { id: "stream", icon: Radio, zh: "流媒体", en: "Streaming" },
  { id: "info", icon: Info, zh: "媒体信息", en: "Media Info" },
];

function NavRow({ item }: { item: NavItem }) {
  const { page, setPage, lang } = useStore();
  const active = page === item.id;
  const Icon = item.icon;
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        setPage(item.id);
      }}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
        active
          ? "bg-primary-soft text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <div className="flex-1 flex flex-col min-w-0">
        <span className="truncate">{lang === "zh" ? item.zh : item.en}</span>
        {lang === "zh" && <span className="text-xs text-muted-foreground">{item.en}</span>}
      </div>
    </a>
  );
}

function SectionTitle({ s }: { s: Str }) {
  const { lang } = useStore();
  return (
    <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {pick(s, lang)}
    </div>
  );
}

export function Sidebar() {
  const { engine, lang } = useStore();
  const installed = engine?.ffmpegAvailable;
  const version = engine?.version || "ffmpeg";
  const statusText = installed ? pick(t.ready, lang) : pick(t.notInstalled, lang);

  return (
    <aside
      className="w-64 shrink-0 border-r border-border flex flex-col bg-card hidden md:flex"
      style={{ width: "var(--ffs-sidebar-w)" }}
    >
      <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3">
        <SectionTitle s={t.secMedia} />
        <div className="space-y-0.5 mb-4">
          {MEDIA.map((it) => (
            <NavRow key={`${it.zh}-${it.en}`} item={it} />
          ))}
        </div>

        <SectionTitle s={t.secAV} />
        <div className="space-y-0.5 mb-4">
          {AV.map((it) => (
            <NavRow key={`${it.zh}-${it.en}`} item={it} />
          ))}
        </div>

        <SectionTitle s={t.secAdv} />
        <div className="space-y-0.5">
          {ADV.map((it) => (
            <NavRow key={`${it.zh}-${it.en}`} item={it} />
          ))}
        </div>
      </nav>

      {/* Engine status */}
      <div
        className="m-3 p-3 rounded-md border border-border"
        style={{ backgroundColor: "color-mix(in srgb, var(--ffs-muted) 40%, transparent)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`w-2 h-2 rounded-full ${installed ? "bg-state-success" : "bg-state-error"}`}
          />
          <span className="ffs-mono text-xs">{version}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">{statusText}</div>
      </div>
    </aside>
  );
}
