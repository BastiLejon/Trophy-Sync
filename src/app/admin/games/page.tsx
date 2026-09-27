import Link from "next/link";
import { count, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { db, schema } from "@/lib/db";
import { decideGame, recomputeSuggestions } from "@/app/actions/admin";
import { Artwork, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import { percent } from "@/lib/format";

export default async function AdminGamesPage() {
  const [, { t }] = await Promise.all([requireAdmin(), getT()]);
  const { psGames, gameMappings, xboxTitles, psTrophies, trophyMappings } = schema;
  const rows = db
    .select({ game: psGames, mapping: gameMappings })
    .from(psGames)
    .leftJoin(gameMappings, eq(gameMappings.psGameId, psGames.id))
    .orderBy(sql`case ${gameMappings.status} when 'pending' then 0 when 'mapped' then 1 else 2 end`, psGames.name)
    .all();
  const titles = db.select().from(xboxTitles).orderBy(xboxTitles.name).all();
  const titleById = new Map(titles.map((x) => [x.id, x]));

  const countByStatus = (status: "pending" | "mapped") =>
    new Map(
      db
        .select({ psGameId: psTrophies.psGameId, n: count() })
        .from(trophyMappings)
        .innerJoin(psTrophies, eq(trophyMappings.psTrophyId, psTrophies.id))
        .where(eq(trophyMappings.status, status))
        .groupBy(psTrophies.psGameId)
        .all()
        .map((r) => [r.psGameId, r.n]),
    );
  const pendingTrophies = countByStatus("pending");
  const mappedTrophies = countByStatus("mapped");

  return (
    <div>
      <div className="mb-4 text-sm"><Link href="/admin" className="text-muted hover:text-foreground">← {t("common.backToAdmin")}</Link></div>
      <PageHeader
        title={t("adminGames.title")}
        subtitle={t("adminGames.subtitle")}
        actions={
          <form action={recomputeSuggestions}>
            <button className="btn-ghost">{t("adminGames.recompute")}</button>
          </form>
        }
      />
      <div className="space-y-3">
        {rows.map(({ game, mapping }) => {
          const status = mapping?.status ?? "pending";
          const suggestion = mapping?.suggestedXboxTitleId ? titleById.get(mapping.suggestedXboxTitleId) : null;
          const chosen = mapping?.xboxTitleId ? titleById.get(mapping.xboxTitleId) : null;
          const total = game.definedBronze + game.definedSilver + game.definedGold + game.definedPlatinum;
          return (
            <div key={game.id} className="card">
              <div className="flex flex-wrap items-center gap-4">
                <Artwork src={game.iconUrl} name={game.name} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{game.name}</span>
                    <span className="badge bg-ps/15 text-ps">{game.platform}</span>
                    <StatusBadge status={status} />
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {t("adminGames.trophiesCount", { n: total })} · {game.npCommunicationId}
                    {status === "mapped" && chosen && (
                      <>
                        {" "}· {t("adminGames.xbox")} <b className="text-foreground">{chosen.name}</b> · {t("adminGames.trophiesMapped", { n: mappedTrophies.get(game.id) ?? 0 })}
                        {(pendingTrophies.get(game.id) ?? 0) > 0 && <span className="text-warning"> · {t("adminGames.trophiesOpen", { n: pendingTrophies.get(game.id) ?? 0 })}</span>}
                      </>
                    )}
                    {status === "no_counterpart" && mapping?.note && <> · {mapping.note}</>}
                  </div>
                </div>
                {status === "mapped" && (
                  <Link href={`/admin/games/${game.id}`} className="btn-primary">{t("adminGames.assignTrophies")}</Link>
                )}
              </div>

              {status === "pending" && (
                <form action={decideGame} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto_auto]">
                  <input type="hidden" name="psGameId" value={game.id} />
                  <div>
                    <label className="mb-1 block text-xs text-muted">
                      {t("adminGames.xboxTitle")}{" "}
                      {suggestion && <>· {t("adminGames.suggestion")} <b className="text-foreground">{suggestion.name}</b> ({percent(mapping?.suggestionConfidence)})</>}
                    </label>
                    <select name="xboxTitleId" className="input" defaultValue={suggestion?.id ?? ""}>
                      <option value="">{t("adminGames.choose")}</option>
                      {titles.map((x) => (
                        <option key={x.id} value={x.id}>{x.name} ({t("adminGames.optionInfo", { n: x.achievementCount, g: x.totalGamerscore })})</option>
                      ))}
                    </select>
                    <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <input type="checkbox" name="autoAccept" value="on" defaultChecked /> {t("adminGames.autoAccept")}
                    </label>
                  </div>
                  <div className="flex items-end">
                    <button name="intent" value="map" className="btn-xbox">{t("adminGames.assign")}</button>
                  </div>
                  <div className="flex items-end">
                    <button name="intent" value="none" className="btn-ghost" formNoValidate>{t("adminGames.none")}</button>
                  </div>
                </form>
              )}
              {status !== "pending" && (
                <form action={decideGame} className="mt-3 flex justify-end">
                  <input type="hidden" name="psGameId" value={game.id} />
                  <button name="intent" value="reset" className="text-xs text-muted hover:text-foreground">{t("adminGames.reset")}</button>
                </form>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <div className="card text-sm text-muted">{t("adminGames.empty")}</div>}
      </div>
    </div>
  );
}
