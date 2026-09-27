import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const { xboxTitles, xboxAchievements, userXboxTitles, userXboxAchievements, psTrophies, psGames } = schema;

export interface ProfileTitle {
  title: schema.XboxTitle;
  unlockedXbox: number;
  unlockedSynced: number;
  gamerscoreXbox: number;
  gamerscoreSynced: number;
  lastActivityAt: string | null;
}

/** Liefert die "Xbox-Profil"-Sicht: alle Titel mit echten und symbolischen Freischaltungen. */
export function getProfileView(userId: number) {
  const titles = db
    .select({ title: xboxTitles, lastPlayedAt: userXboxTitles.lastPlayedAt })
    .from(userXboxTitles)
    .innerJoin(xboxTitles, eq(userXboxTitles.xboxTitleId, xboxTitles.id))
    .where(eq(userXboxTitles.userId, userId))
    .all();

  const unlocked = db
    .select({ u: userXboxAchievements, a: xboxAchievements })
    .from(userXboxAchievements)
    .innerJoin(xboxAchievements, eq(userXboxAchievements.xboxAchievementId, xboxAchievements.id))
    .where(eq(userXboxAchievements.userId, userId))
    .all();

  const byTitle = new Map<number, ProfileTitle>();
  for (const { title, lastPlayedAt } of titles) {
    byTitle.set(title.id, { title, unlockedXbox: 0, unlockedSynced: 0, gamerscoreXbox: 0, gamerscoreSynced: 0, lastActivityAt: lastPlayedAt });
  }
  let gamerscoreXbox = 0;
  let gamerscoreSynced = 0;
  let unlockedXbox = 0;
  let unlockedSynced = 0;
  for (const { u, a } of unlocked) {
    const t = byTitle.get(a.xboxTitleId);
    if (!t) continue;
    if (u.source === "xbox") {
      t.unlockedXbox++;
      t.gamerscoreXbox += a.gamerscore;
      gamerscoreXbox += a.gamerscore;
      unlockedXbox++;
    } else {
      t.unlockedSynced++;
      t.gamerscoreSynced += a.gamerscore;
      gamerscoreSynced += a.gamerscore;
      unlockedSynced++;
    }
    if (u.unlockedAt && (!t.lastActivityAt || u.unlockedAt > t.lastActivityAt)) t.lastActivityAt = u.unlockedAt;
  }
  const list = [...byTitle.values()].sort((x, y) => (y.lastActivityAt ?? "").localeCompare(x.lastActivityAt ?? ""));
  return { titles: list, totals: { gamerscoreXbox, gamerscoreSynced, unlockedXbox, unlockedSynced } };
}

export function getTitleView(userId: number, xboxTitleId: number) {
  const title = db.select().from(xboxTitles).where(eq(xboxTitles.id, xboxTitleId)).get();
  if (!title) return null;
  const rows = db
    .select({
      a: xboxAchievements,
      u: userXboxAchievements,
      trophy: psTrophies,
      game: psGames,
    })
    .from(xboxAchievements)
    .leftJoin(
      userXboxAchievements,
      and(eq(userXboxAchievements.xboxAchievementId, xboxAchievements.id), eq(userXboxAchievements.userId, userId)),
    )
    .leftJoin(psTrophies, eq(userXboxAchievements.psTrophyId, psTrophies.id))
    .leftJoin(psGames, eq(psTrophies.psGameId, psGames.id))
    .where(eq(xboxAchievements.xboxTitleId, xboxTitleId))
    .all();
  const achievements = rows
    .map((r) => ({
      achievement: r.a,
      unlocked: r.u ?? null,
      sourceTrophy: r.trophy ?? null,
      sourceGame: r.game ?? null,
    }))
    .sort((x, y) => {
      const ux = x.unlocked ? 1 : 0;
      const uy = y.unlocked ? 1 : 0;
      if (ux !== uy) return uy - ux;
      return (y.unlocked?.unlockedAt ?? "").localeCompare(x.unlocked?.unlockedAt ?? "");
    });
  const earned = achievements.filter((a) => a.unlocked);
  return {
    title,
    achievements,
    stats: {
      unlocked: earned.length,
      total: achievements.length,
      gamerscore: earned.reduce((s, a) => s + a.achievement.gamerscore, 0),
      gamerscoreXbox: earned.filter((a) => a.unlocked?.source === "xbox").reduce((s, a) => s + a.achievement.gamerscore, 0),
      gamerscoreSynced: earned.filter((a) => a.unlocked?.source === "playstation").reduce((s, a) => s + a.achievement.gamerscore, 0),
    },
  };
}
