import type { ReactNode } from "react";

/** Platzhalter-Icon mit Initialen, falls kein Bild vorhanden ist. */
export function Artwork({
  src,
  name,
  size = 48,
  rounded = "rounded-lg",
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  rounded?: string;
}) {
  if (src) {
    return <img src={src} alt="" width={size} height={size} className={`${rounded} shrink-0 object-cover`} style={{ width: size, height: size }} />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return (
    <div
      aria-hidden
      className={`${rounded} flex shrink-0 items-center justify-center font-bold text-white`}
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 55% 38%), hsl(${(hue + 40) % 360} 55% 25%))`, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

const trophyColors: Record<string, string> = {
  bronze: "bg-bronze/20 text-bronze",
  silver: "bg-silver/20 text-silver",
  gold: "bg-gold/20 text-gold",
  platinum: "bg-platinum/20 text-platinum",
};

export function TrophyBadge({ type }: { type: string }) {
  const label = { bronze: "Bronze", silver: "Silber", gold: "Gold", platinum: "Platin" }[type] ?? type;
  return <span className={`badge ${trophyColors[type] ?? "bg-surface-2"}`}>🏆 {label}</span>;
}

export function GamerscoreBadge({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <span className={`badge ${muted ? "bg-surface-2 text-muted" : "bg-xbox/15 text-xbox"}`}>
      <span aria-hidden>G</span> {value}
    </span>
  );
}

export function SourceBadge({ source }: { source: "xbox" | "playstation" }) {
  return source === "xbox" ? (
    <span className="badge bg-xbox/15 text-xbox">Xbox</span>
  ) : (
    <span className="badge bg-ps/15 text-ps">PS-Sync</span>
  );
}

export function StatusBadge({ status }: { status: "pending" | "mapped" | "no_counterpart" }) {
  if (status === "mapped") return <span className="badge bg-xbox/15 text-xbox">gemappt</span>;
  if (status === "no_counterpart") return <span className="badge bg-surface-2 text-muted">kein Gegenstück</span>;
  return <span className="badge bg-warning/15 text-warning">offen</span>;
}

export function Progress({ value, className = "" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-2 ${className}`}>
      <div className="h-full rounded-full bg-xbox" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "ps" | "xbox" | "warning" | "muted" }) {
  const color = { default: "text-foreground", ps: "text-ps", xbox: "text-xbox", warning: "text-warning", muted: "text-muted" }[tone];
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const cls = {
    info: "border-ps/40 bg-ps/10 text-foreground",
    error: "border-danger/40 bg-danger/10 text-foreground",
    success: "border-xbox/40 bg-xbox/10 text-foreground",
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
