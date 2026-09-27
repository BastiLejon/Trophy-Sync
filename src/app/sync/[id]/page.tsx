import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSyncRun } from "@/lib/sync";
import type { SyncItemResult } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Artwork, GamerscoreBadge, PageHeader, Stat, TrophyBadge } from "@/components/ui";

const RESULT_LABEL: Record<SyncItemResult, { label: string; cls: string; group: "ok" | "skip" | "open" | "none" }> = {
  synced: { label: "neu übertragen", cls: "bg-xbox/15 text-xbox", group: "ok" },
  already_synced: { label: "bereits übertragen", cls: "bg-xbox/10 text-xbox", group: "ok" },
  already_unlocked_on_xbox: { label: "auf Xbox schon freigeschaltet", cls: "bg-surface-2 text-muted", group: "skip" },
  trophy_pending: { label: "Trophäe wartet auf Admin-Mapping", cls: "bg-warning/15 text-warning", group: "open" },
  trophy_no_counterpart: { label: "kein Achievement-Gegenstück", cls: "bg-surface-2 text-muted", group: "none" },
  game_pending: { label: "Spiel wartet auf Admin-Mapping", cls: "bg-warning/15 text-warning", group: "open" },
  game_no_counterpart: { label: "Spiel existiert nicht auf Xbox", cls: "bg-surface-2 text-muted", group: "none" },
};

export default async function SyncRunPage({ params }: PageProps<"/sync/[id]">) {
  const user = await requireUser();
  const { id } = await params;
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
        title={`Sync #${run.id}`}
        subtitle={`Abgeschlossen ${formatDateTime(run.finishedAt)} · ${summary.import.psnTitles} PlayStation-Spiele und ${summary.import.xboxTitles} Xbox-Titel gelesen.`}
        actions={<Link href="/profile" className="btn-xbox">Xbox-Profil öffnen</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Neu übertragen" value={formatNumber(summary.trophies.synced)} tone="xbox" hint={`+${formatNumber(summary.gamerscoreAdded)} G Gamerscore`} />
        <Stat label="Bereits übertragen" value={formatNumber(summary.trophies.alreadySynced)} tone="muted" hint="aus früheren Läufen" />
        <Stat label="Auf Xbox schon freigeschaltet" value={formatNumber(summary.trophies.alreadyUnlockedOnXbox)} tone="muted" hint="echte Freischaltung hat Vorrang" />
        <Stat label="Verdiente Trophäen gesamt" value={formatNumber(summary.trophies.earned)} tone="ps" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Spiele gemappt" value={`${summary.games.mapped} / ${summary.games.total}`} />
        <Stat label="Spiele ohne Xbox-Version" value={formatNumber(summary.games.noCounterpart)} tone="muted" hint={`${summary.trophies.gameNoCounterpart} Trophäen betroffen`} />
        <Stat label="Spiele warten auf Admin" value={formatNumber(summary.games.pending)} tone="warning" hint={`${summary.trophies.gamePending} Trophäen betroffen`} />
        <Stat label="Trophäen ohne / offenes Mapping" value={`${summary.trophies.noCounterpart} / ${summary.trophies.pending}`} tone="warning" hint="in gemappten Spielen" />
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Details pro Spiel</h2>
      <div className="space-y-3">
        {games.map(({ game, items }) => {
          const ok = items.filter((i) => RESULT_LABEL[i.item.result].group === "ok").length;
          const gs = items.filter((i) => RESULT_LABEL[i.item.result].group === "ok").reduce((s, i) => s + i.item.gamerscore, 0);
          const gameLevel = items[0]?.item.result;
          return (
            <details key={game.id} className="card p-0" open={ok > 0 && items.length <= 12}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <Artwork src={game.iconUrl} name={game.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{game.name}</div>
                  <div className="text-xs text-muted">{game.platform} · {items.length} verdiente Trophäen</div>
                </div>
                {gameLevel === "game_pending" || gameLevel === "game_no_counterpart" ? (
                  <span className={`badge ${RESULT_LABEL[gameLevel].cls}`}>{RESULT_LABEL[gameLevel].label}</span>
                ) : (
                  <>
                    <span className="badge bg-xbox/15 text-xbox">{ok} / {items.length} übertragen</span>
                    <GamerscoreBadge value={gs} />
                  </>
                )}
              </summary>
              <div className="border-t border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {items.map(({ item, trophy, achievement }) => {
                      const r = RESULT_LABEL[item.result];
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
                            <span className={`badge ${r.cls}`}>{r.label}</span>
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
