import React from "react";
import { ChevronDown } from "lucide-react";

// ---------- Card ----------
export function Card({
  className = "",
  children,
  span,
}: {
  className?: string;
  children: React.ReactNode;
  span?: "full";
}) {
  const spanClass = span === "full" ? "lg:col-span-2" : "";
  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 min-w-0 ${spanClass} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-sm font-semibold">{title}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

// ---------- Field ----------
export function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      {children}
      {hint && <span className="ffs-mono text-[11px] text-muted-foreground truncate">{hint}</span>}
    </div>
  );
}

// ---------- Select (native, styled) ----------
export function Select({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-input border border-border rounded-md h-9 pl-3 pr-8 text-sm w-full appearance-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

// ---------- Input ----------
export function Input({
  value,
  onChange,
  placeholder,
  mono = true,
  disabled,
  className = "",
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className={`bg-input border border-border rounded-md h-9 px-3 text-sm ${
        mono ? "ffs-mono" : ""
      } focus:outline-none focus:ring-1 focus:ring-ring w-full ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
    />
  );
}

// ---------- Segmented control ----------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  activeStyle = "card",
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  activeStyle?: "card" | "primary";
}) {
  const h = size === "md" ? "h-8" : "h-7";
  return (
    <div className="flex bg-muted rounded-md p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        const base = `flex-1 ${h} px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors`;
        if (active) {
          if (activeStyle === "primary") {
            return (
              <button
                key={o.value}
                className={`${base} bg-primary text-primary-foreground font-medium`}
              >
                {o.label}
              </button>
            );
          }
          return (
            <button key={o.value} className={`${base} bg-card shadow-sm text-primary`}>
              {o.label}
            </button>
          );
        }
        return (
          <button
            key={o.value}
            className={`${base} text-muted-foreground hover:text-foreground`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Pill toggle group ----------
export function PillGroup<T extends string>({
  options,
  value,
  onChange,
  variant = "solid",
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  variant?: "solid" | "soft";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        const base = "h-8 px-3 rounded-full text-xs border transition-colors cursor-pointer";
        if (active) {
          if (variant === "soft") {
            return (
              <button
                key={o.value}
                className={`${base} border-primary bg-primary-soft text-primary font-medium`}
              >
                {o.label}
              </button>
            );
          }
          return (
            <button
              key={o.value}
              className={`${base} border-primary bg-primary text-primary-foreground font-medium`}
            >
              {o.label}
            </button>
          );
        }
        return (
          <button
            key={o.value}
            className={`${base} border-border text-muted-foreground hover:bg-muted hover:text-foreground`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Toggle switch ----------
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 h-9">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform peer-checked:translate-x-4" />
      </label>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

// ---------- Range slider ----------
export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="ffs-range w-full"
    />
  );
}

// ---------- Primary / secondary buttons ----------
export function ButtonPrimary({
  icon,
  children,
  onClick,
  disabled,
  className = "",
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function ButtonSecondary({
  icon,
  children,
  onClick,
  disabled,
  className = "",
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-9 px-4 rounded-md border border-border text-sm hover:bg-muted flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

// ---------- Badge / chip ----------
export function Badge({ children, mono = true }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={`rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground ${
        mono ? "ffs-mono" : ""
      }`}
    >
      {children}
    </span>
  );
}
