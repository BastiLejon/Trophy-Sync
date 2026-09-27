import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTitleView } from "@/lib/profile";
import { formatDate, formatNumber } from "@/lib/format";
import { Artwork, GamerscoreBadge, Progress, SourceBadge, TrophyBadge } from "@/components/ui";

export default async function TitlePage({ params }: PageProps<"/profile/[titleId]">) {
  const user = await requireUser();
  const { titleId } = await params;
  const view = getTitleView(user.userId, Number(titleId));
  if (!view) notFound();
  const { title, achievements, stats } = view;
  const pct = stats.total ? (stats.unlocked / stats.total) * 100 : 0;
  return (
    <div>
      <div className="mb-4 text-sm"><Link href="/profile" className="text-muted hover:text-foreground">← Xbox-Profil</Link></div>
      <section className="card flex flex-wrap items-center gap-5">
        <Artwork src={title.iconUrl} name={title.name} size={80} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{title.name}</h1>
          <div className="mt-1 text-sm text-muted">{title.devices.split(",").filter(Boolean).join(" · ") || "Xbox"}</div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span>{stats.unlocked} / {stats.total} Achievements</span>
            <span className="font-semibold text-xbox"><span aria-hidden>G</span> {formatNumber(stats.gamerscore)} / {formatNumber(title.totalGamerscore)}</span>
          </div>
          <Progress value={pct} className="mt-2 max-w-md" />
        </div>
        <div className="text-right text-sm">
          <div className="text-muted">Xbox: <b className="text-foreground">{formatNumber(stats.gamerscoreXbox)} G</b></div>
          <div className="text-muted">PS-Sync: <b className="text-ps">+{formatNumber(stats.gamerscoreSynced)} G</b></div>
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
                  <span className="font-semibold">{hidden ? "Geheimes Achievement" : a.name}</span>
                  {unlocked && <SourceBadge source={unlocked.source} />}
                  {a.rarityPercent != null && <span className="text-xs text-muted">{a.rarityPercent.toFixed(1)} % der Spieler</span>}
                </div>
                <div className="text-sm text-muted">{hidden ? a.lockedDescription || "Details werden nach dem Freischalten angezeigt." : a.description}</div>
                {unlocked?.source === "playstation" && sourceTrophy && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>Quelle:</span>
                    <TrophyBadge type={sourceTrophy.type} />
                    <span className="text-foreground">{sourceTrophy.name}</span>
                    {sourceGame && <span>({sourceGame.name}, {sourceGame.platform})</span>}
                  </div>
                )}
              </div>
              <div className="text-right">
                <GamerscoreBadge value={a.gamerscore} muted={!unlocked} />
                <div className="mt-1 text-xs text-muted">{unlocked ? `Freigeschaltet ${formatDate(unlocked.unlockedAt)}` : "Gesperrt"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
