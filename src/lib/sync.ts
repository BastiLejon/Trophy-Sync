import { and, eq, inArray } from "drizzle-orm";
import { db, nowIso, schema, type SyncItemResult } from "@/lib/db";
import { ensurePairing, importPsnLibrary, importXboxLibrary } from "@/lib/accounts";
import type { PsnClient, XboxClient } from "@/lib/providers/types";

const {
  psGames,
  psTrophies,
  gameMappings,
  trophyMappings,
  xboxAchievements,
  userPsTitles,
  userPsTrophies,
  userXboxAchievements,
  userXboxTitles,
  syncRuns,
  syncRunItems,
} = schema;

export interface SyncSummary {
  games: {
    total: number;
    mapped: number;
    pending: number;
    noCounterpart: number;
  };
  trophies: {
    earned: number;
    synced: number;
    alreadySynced: number;
    alreadyUnlockedOnXbox: number;
    pending: number;
    noCounterpart: number;
    gamePending: number;
    gameNoCounterpart: number;
  };
  gamerscoreAdded: number;
  gamerscoreSyncedTotal: number;
  import: {
    psnTitles: number;
    xboxTitles: number;
  };
}

/**
 * Führt einen kompletten Sync für einen Benutzer aus:
 *  1. PSN-Bibliothek importieren (Katalog + Fortschritt)
 *  2. Xbox-Bibliothek importieren (Katalog + echte Freischaltungen)
 *  3. Jede verdiente Trophäe über die Admin-Mappings auf ein Xbox-Achievement abbilden
 *     und – sofern noch nicht echt freigeschaltet – symbolisch gutschreiben.
 */
export async function runSync(
  userId: number,
  clients: { psn?: PsnClient; xbox?: XboxClient } = {},
): Promise<{ runId: number; summary: SyncSummary }> {
  // Vor dem ersten Datenzugriff: Konten exklusiv paaren (oder abbrechen, wenn schon anders gepaart).
  ensurePairing(userId);
  const run = db.insert(syncRuns).values({ userId, status: "running" }).returning().get();
  try {
    const psnImport = await importPsnLibrary(userId, clients.psn);
    const xboxImport = await importXboxLibrary(userId, clients.xbox);
    const summary = applyMappings(userId, run.id);
    summary.import = { psnTitles: psnImport.titles, xboxTitles: xboxImport.titles };
    db.update(syncRuns)
      .set({ status: "done", finishedAt: nowIso(), summary: JSON.stringify(summary) })
      .where(eq(syncRuns.id, run.id))
      .run();
    return { runId: run.id, summary };
  } catch (err) {
    db.update(syncRuns)
      .set({ status: "failed", finishedAt: nowIso(), error: err instanceof Error ? err.message : String(err) })
      .where(eq(syncRuns.id, run.id))
      .run();
    throw err;
  }
}

/** Rein datenbankbasierter Teil des Syncs (ohne Netzwerk) – separat testbar. */
export function applyMappings(userId: number, runId: number): SyncSummary {
  const summary: SyncSummary = {
    games: { total: 0, mapped: 0, pending: 0, noCounterpart: 0 },
    trophies: {
      earned: 0,
      synced: 0,
      alreadySynced: 0,
      alreadyUnlockedOnXbox: 0,
      pending: 0,
      noCounterpart: 0,
      gamePending: 0,
      gameNoCounterpart: 0,
    },
    gamerscoreAdded: 0,
    gamerscoreSyncedTotal: 0,
    import: { psnTitles: 0, xboxTitles: 0 },
  };

  const titles = db
    .select({ game: psGames, mapping: gameMappings })
    .from(userPsTitles)
    .innerJoin(psGames, eq(userPsTitles.psGameId, psGames.id))
    .leftJoin(gameMappings, eq(gameMappings.psGameId, psGames.id))
    .where(eq(userPsTitles.userId, userId))
    .all();

  const earned = db
    .select({ trophy: psTrophies, earnedAt: userPsTrophies.earnedAt })
    .from(userPsTrophies)
    .innerJoin(psTrophies, eq(userPsTrophies.psTrophyId, psTrophies.id))
    .where(eq(userPsTrophies.userId, userId))
    .all();
  const earnedByGame = new Map<number, typeof earned>();
  for (const e of earned) {
    const list = earnedByGame.get(e.trophy.psGameId) ?? [];
    list.push(e);
    earnedByGame.set(e.trophy.psGameId, list);
  }

  const mappingRows = earned.length
    ? db
        .select()
        .from(trophyMappings)
        .where(inArray(trophyMappings.psTrophyId, earned.map((e) => e.trophy.id)))
        .all()
    : [];
  const trophyMap = new Map(mappingRows.map((m) => [m.psTrophyId, m]));

  const unlockedRows = db
    .select()
    .from(userXboxAchievements)
    .where(eq(userXboxAchievements.userId, userId))
    .all();
  const unlocked = new Map(unlockedRows.map((u) => [u.xboxAchievementId, u]));

  const achievementIds = mappingRows.map((m) => m.xboxAchievementId).filter((x): x is number => x !== null);
  const achievementById = new Map(
    (achievementIds.length
      ? db.select().from(xboxAchievements).where(inArray(xboxAchievements.id, achievementIds)).all()
      : []
    ).map((a) => [a.id, a]),
  );

  const items: (typeof syncRunItems.$inferInsert)[] = [];

  for (const { game, mapping } of titles) {
    summary.games.total++;
    const gameStatus = mapping?.status ?? "pending";
    if (gameStatus === "mapped") summary.games.mapped++;
    else if (gameStatus === "no_counterpart") summary.games.noCounterpart++;
    else summary.games.pending++;

    for (const { trophy, earnedAt } of earnedByGame.get(game.id) ?? []) {
      summary.trophies.earned++;
      let result: SyncItemResult;
      let xboxAchievementId: number | null = null;
      let gamerscore = 0;

      if (gameStatus === "pending") {
        result = "game_pending";
        summary.trophies.gamePending++;
      } else if (gameStatus === "no_counterpart") {
        result = "game_no_counterpart";
        summary.trophies.gameNoCounterpart++;
      } else {
        const tm = trophyMap.get(trophy.id);
        if (!tm || tm.status === "pending") {
          result = "trophy_pending";
          summary.trophies.pending++;
        } else if (tm.status === "no_counterpart" || !tm.xboxAchievementId) {
          result = "trophy_no_counterpart";
          summary.trophies.noCounterpart++;
        } else {
          xboxAchievementId = tm.xboxAchievementId;
          const ach = achievementById.get(xboxAchievementId);
          gamerscore = ach?.gamerscore ?? 0;
          const existing = unlocked.get(xboxAchievementId);
          if (existing?.source === "xbox") {
            result = "already_unlocked_on_xbox";
            summary.trophies.alreadyUnlockedOnXbox++;
          } else if (existing?.source === "playstation") {
            result = "already_synced";
            summary.trophies.alreadySynced++;
            summary.gamerscoreSyncedTotal += gamerscore;
          } else {
            db.insert(userXboxAchievements)
              .values({ userId, xboxAchievementId, unlockedAt: earnedAt, source: "playstation", psTrophyId: trophy.id })
              .run();
            unlocked.set(xboxAchievementId, {
              id: 0,
              userId,
              xboxAchievementId,
              unlockedAt: earnedAt,
              source: "playstation",
              psTrophyId: trophy.id,
            });
            if (ach) {
              db.insert(userXboxTitles)
                .values({ userId, xboxTitleId: ach.xboxTitleId, lastPlayedAt: earnedAt })
                .onConflictDoNothing()
                .run();
            }
            result = "synced";
            summary.trophies.synced++;
            summary.gamerscoreAdded += gamerscore;
            summary.gamerscoreSyncedTotal += gamerscore;
          }
        }
      }
      items.push({ runId, psGameId: game.id, psTrophyId: trophy.id, xboxAchievementId, result, gamerscore });
    }
  }

  // Symbolische Freischaltungen entfernen, deren Mapping inzwischen aufgehoben wurde.
  const validSynced = new Set(items.filter((i) => i.result === "synced" || i.result === "already_synced").map((i) => i.xboxAchievementId));
  for (const u of unlockedRows) {
    if (u.source === "playstation" && !validSynced.has(u.xboxAchievementId)) {
      db.delete(userXboxAchievements).where(eq(userXboxAchievements.id, u.id)).run();
    }
  }

  if (items.length) {
    for (let i = 0; i < items.length; i += 200) db.insert(syncRunItems).values(items.slice(i, i + 200)).run();
  }
  return summary;
}

export function getSyncRun(runId: number, userId: number) {
  const run = db.select().from(syncRuns).where(and(eq(syncRuns.id, runId), eq(syncRuns.userId, userId))).get();
  if (!run) return null;
  const items = db
    .select({
      item: syncRunItems,
      game: psGames,
      trophy: psTrophies,
      achievement: xboxAchievements,
    })
    .from(syncRunItems)
    .innerJoin(psGames, eq(syncRunItems.psGameId, psGames.id))
    .leftJoin(psTrophies, eq(syncRunItems.psTrophyId, psTrophies.id))
    .leftJoin(xboxAchievements, eq(syncRunItems.xboxAchievementId, xboxAchievements.id))
    .where(eq(syncRunItems.runId, runId))
    .all();
  return { run, summary: run.summary ? (JSON.parse(run.summary) as SyncSummary) : null, items };
}

export function listSyncRuns(userId: number) {
  return db.select().from(syncRuns).where(eq(syncRuns.userId, userId)).orderBy(syncRuns.id).all().reverse();
}
