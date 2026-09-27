import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTitleView } from "@/lib/profile";
import { formatDate, formatNumber } from "@/lib/format";
import { Artwork, GamerscoreBadge, Progress } from "@/components/ui";
import { SourceBadge, TrophyBadge } from "@/components/badges";

export default async function TitlePage({ params }: PageProps<"/profile/[titleId]">) {
  const [user, { t, locale }, { titleId }] = await Promise.all([requireUser(), getT(), params]);
  const view = getTitleView(user.userId, Number(titleId));
  if (!view) notFound();
  const { title, achievements, stats } = view;
  const pct = stats.total ? (stats.unlocked / stats.total) * 100 : 0;
  return (
    <div>
      <div className="mb-4 text-sm"><Link href="/profile" className="text-muted hover:text-foreground">← {t("title.backToProfile")}</Link></div>
      <section className="card flex flex-wrap items-center gap-5">
        <Artwork src={title.iconUrl} name={title.name} size={80} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{title.name}</h1>
          <div className="mt-1 text-sm text-muted">{title.devices.split(",").filter(Boolean).join(" · ") || "Xbox"}</div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span>{t("profile.achievementsOf", { n: stats.unlocked, total: stats.total })}</span>
            <span className="font-semibold text-xbox"><span aria-hidden>G</span> {formatNumber(stats.gamerscore, locale)} / {formatNumber(title.totalGamerscore, locale)}</span>
          </div>
          <Progress value={pct} className="mt-2 max-w-md" />
        </div>
        <div className="text-right text-sm">
          <div className="text-muted">{t("title.xboxScore")} <b className="text-foreground">{formatNumber(stats.gamerscoreXbox, locale)} G</b></div>
          <div className="text-muted">{t("title.syncScore")} <b className="text-ps">+{formatNumber(stats.gamerscoreSynced, locale)} G</b></div>
        </div>
      </section>

      <div className="mt-6 space-y-2">
        {achievements.map(({ achievement: a, unlocked, sourceTrophy, sourceGame }) => {
          const hidden = a.isSecret && !unlocked;
          return (
            <div key={a.id} className={`card flex items-center gap-4 py-3 ${unlocked ? "" : "opacity-60"}`}>
              <Artwork src={a.iconUrl} name={hidden ? "?" : a.name} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{hidden ? t("title.secret") : a.name}</span>
                  {unlocked && <SourceBadge source={unlocked.source} />}
                  {a.rarityPercent != null && <span className="text-xs text-muted">{t("title.rarity", { p: a.rarityPercent.toFixed(1) })}</span>}
                </div>
                <div className="text-sm text-muted">{hidden ? a.lockedDescription || t("title.secretHint") : a.description}</div>
                {unlocked?.source === "playstation" && sourceTrophy && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{t("title.source")}</span>
                    <TrophyBadge type={sourceTrophy.type} />
                    <span className="text-foreground">{sourceTrophy.name}</span>
                    {sourceGame && <span>({sourceGame.name}, {sourceGame.platform})</span>}
                  </div>
                )}
              </div>
              <div className="text-right">
                <GamerscoreBadge value={a.gamerscore} muted={!unlocked} />
                <div className="mt-1 text-xs text-muted">{unlocked ? t("title.unlockedOn", { date: formatDate(unlocked.unlockedAt, locale) }) : t("title.locked")}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
