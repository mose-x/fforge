import React from "react";
import { Play } from "lucide-react";
import { useStore } from "../store/useStore";
import { CommandConsole } from "./CommandConsole";
import { ButtonPrimary, ButtonSecondary } from "./ui";
import type { CommandResult } from "../lib/command";
import type { Str } from "../lib/i18n";
import { pick } from "../lib/i18n";

export interface PageAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function WorkArea({
  breadcrumb,
  title,
  previewLabel,
  primary,
  children,
  command,
  inputSize,
  onOpenFolder,
}: {
  breadcrumb: Str;
  title: Str;
  previewLabel: string;
  primary: PageAction;
  children: React.ReactNode;
  command: CommandResult;
  inputSize: number;
  onOpenFolder?: () => void;
}) {
  const { lang } = useStore();
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Work area header */}
      <div className="h-14 shrink-0 border-b border-border px-4 md:px-6 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-muted-foreground truncate">{pick(breadcrumb, lang)}</span>
          <span className="ffs-display font-semibold text-lg truncate">{pick(title, lang)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ButtonSecondary icon={<Play className="w-4 h-4" />} disabled={primary.disabled}>
            {previewLabel}
          </ButtonSecondary>
          <ButtonPrimary
            icon={primary.icon}
            onClick={primary.onClick}
            disabled={primary.disabled}
          >
            {primary.label}
          </ButtonPrimary>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 app-scroll" data-scroll-region="primary">
        {children}
      </div>

      {/* Command console */}
      <CommandConsole command={command} inputSize={inputSize} onOpenFolder={onOpenFolder} />
    </div>
  );
}
