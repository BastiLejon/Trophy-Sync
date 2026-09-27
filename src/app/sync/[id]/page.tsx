import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getSyncRun } from "@/lib/sync";
import type { SyncItemResult } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Artwork, GamerscoreBadge, PageHeader, Stat } from "@/components/ui";
import { TrophyBadge } from "@/components/badges";

const RESULT_STYLE: Record<SyncItemResult, { cls: string; group: "ok" | "skip" | "open" | "none" }> = {
  synced: { cls: "bg-xbox/15 text-xbox", group: "ok" },
  already_synced: { cls: "bg-xbox/10 text-xbox", group: "ok" },
  already_unlocked_on_xbox: { cls: "bg-surface-2 text-muted", group: "skip" },
  trophy_pending: { cls: "bg-warning/15 text-warning", group: "open" },
  trophy_no_counterpart: { cls: "bg-surface-2 text-muted", group: "none" },
  game_pending: { cls: "bg-warning/15 text-warning", group: "open" },
  game_no_counterpart: { cls: "bg-surface-2 text-muted", group: "none" },
};

export default async function SyncRunPage({ params }: PageProps<"/sync/[id]">) {
  const [user, { t, locale }, { id }] = await Promise.all([requireUser(), getT(), params]);
  const data = getSyncRun(Number(id), user.userId);
  if (!data || !data.summary) notFound();
  const { run, summary, items } = data;

  const byGame = new Map<number, { game: (typeof items)[number]["game"]; items: typeof items }>();
  for (const it of items) {
    const g = byGame.get(it.game.id) ?? { game: it.game, items: [] };
    g.items.push(it);
    byGame.set(it.game.id, g);
  }
  const games = [...byGame.values()].sort((a, b) => {
    const score = (g: typeof a) => g.items.filter((i) => i.item.result === "synced").length;
    return score(b) - score(a) || a.game.name.localeCompare(b.game.name);
  });

  return (
    <div>
      <PageHeader
        title={t("syncRun.title", { id: run.id })}
        subtitle={t("syncRun.subtitle", { time: formatDateTime(run.finishedAt, locale), ps: summary.import.psnTitles, xbox: summary.import.xboxTitles })}
        actions={<Link href="/profile" className="btn-xbox">{t("home.openProfile")}</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("syncRun.stat.new")} value={formatNumber(summary.trophies.synced, locale)} tone="xbox" hint={t("syncRun.stat.newHint", { n: formatNumber(summary.gamerscoreAdded, locale) })} />
        <Stat label={t("syncRun.stat.already")} value={formatNumber(summary.trophies.alreadySynced, locale)} tone="muted" hint={t("syncRun.stat.alreadyHint")} />
        <Stat label={t("syncRun.stat.onXbox")} value={formatNumber(summary.trophies.alreadyUnlockedOnXbox, locale)} tone="muted" hint={t("syncRun.stat.onXboxHint")} />
        <Stat label={t("syncRun.stat.earned")} value={formatNumber(summary.trophies.earned, locale)} tone="ps" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("syncRun.stat.gamesMapped")} value={`${summary.games.mapped} / ${summary.games.total}`} />
        <Stat label={t("syncRun.stat.gamesNone")} value={formatNumber(summary.games.noCounterpart, locale)} tone="muted" hint={t("syncRun.stat.gamesNoneHint", { n: summary.trophies.gameNoCounterpart })} />
        <Stat label={t("syncRun.stat.gamesPending")} value={formatNumber(summary.games.pending, locale)} tone="warning" hint={t("syncRun.stat.gamesPendingHint", { n: summary.trophies.gamePending })} />
        <Stat label={t("syncRun.stat.trophiesOpen")} value={`${summary.trophies.noCounterpart} / ${summary.trophies.pending}`} tone="warning" hint={t("syncRun.stat.trophiesOpenHint")} />
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">{t("syncRun.perGame")}</h2>
      <div className="space-y-3">
        {games.map(({ game, items }) => {
          const ok = items.filter((i) => RESULT_STYLE[i.item.result].group === "ok").length;
          const gs = items.filter((i) => RESULT_STYLE[i.item.result].group === "ok").reduce((s, i) => s + i.item.gamerscore, 0);
          const gameLevel = items[0]?.item.result;
          return (
            <details key={game.id} className="card p-0" open={ok > 0 && items.length <= 12}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <Artwork src={game.iconUrl} name={game.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{game.name}</div>
                  <div className="text-xs text-muted">{game.platform} · {t("syncRun.earnedCount", { n: items.length })}</div>
                </div>
                {gameLevel === "game_pending" || gameLevel === "game_no_counterpart" ? (
                  <span className={`badge ${RESULT_STYLE[gameLevel].cls}`}>{t(`result.${gameLevel}`)}</span>
                ) : (
                  <>
                    <span className="badge bg-xbox/15 text-xbox">{t("syncRun.transferredCount", { ok, total: items.length })}</span>
                    <GamerscoreBadge value={gs} />
                  </>
                )}
              </summary>
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {items.map(({ item, trophy, achievement }) => {
                      const r = RESULT_STYLE[item.result];
                      return (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {trophy && <TrophyBadge type={trophy.type} />}
                              <div>
                                <div className="font-medium">{trophy?.name}</div>
                                <div className="text-xs text-muted">{trophy?.detail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted">→</td>
                          <td className="px-4 py-2">
                            {achievement ? (
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{achievement.name}</div>
                                  <div className="text-xs text-muted">{achievement.description}</div>
                                </div>
                                <GamerscoreBadge value={achievement.gamerscore} muted={r.group !== "ok"} />
                              </div>
                            ) : (
                              <span className="text-xs text-muted">–</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <span className={`badge ${r.cls}`}>{t(`result.${item.result}`)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
