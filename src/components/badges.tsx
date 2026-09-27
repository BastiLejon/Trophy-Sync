import { getT } from "@/lib/i18n/server";

const trophyColors: Record<string, string> = {
  bronze: "bg-bronze/20 text-bronze",
  silver: "bg-silver/20 text-silver",
  gold: "bg-gold/20 text-gold",
  platinum: "bg-platinum/20 text-platinum",
};

export async function TrophyBadge({ type }: { type: string }) {
  const { t } = await getT();
  const key = ({ bronze: "trophy.bronze", silver: "trophy.silver", gold: "trophy.gold", platinum: "trophy.platinum" } as const)[type];
  return <span className={`badge ${trophyColors[type] ?? "bg-surface-2"}`}>🏆 {key ? t(key) : type}</span>;
}

export async function SourceBadge({ source }: { source: "xbox" | "playstation" }) {
  const { t } = await getT();
  return source === "xbox" ? (
    <span className="badge bg-xbox/15 text-xbox">{t("source.xbox")}</span>
  ) : (
    <span className="badge bg-ps/15 text-ps">{t("source.playstation")}</span>
  );
}

export async function StatusBadge({ status }: { status: "pending" | "mapped" | "no_counterpart" }) {
  const { t } = await getT();
  if (status === "mapped") return <span className="badge bg-xbox/15 text-xbox">{t("status.mapped")}</span>;
  if (status === "no_counterpart") return <span className="badge bg-surface-2 text-muted">{t("status.noCounterpart")}</span>;
  return <span className="badge bg-warning/15 text-warning">{t("status.pending")}</span>;
}
