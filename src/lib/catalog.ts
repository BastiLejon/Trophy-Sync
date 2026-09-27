import { and, eq, inArray } from "drizzle-orm";
import { db, nowIso, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { bestCandidate } from "@/lib/matching";
import type {
  PsnTitle,
  PsnTrophyDefinition,
  XboxAchievementInfo,
  XboxTitleInfo,
} from "@/lib/providers/types";

const {
  psGames,
  psTrophies,
  xboxTitles,
  xboxAchievements,
  gameMappings,
  trophyMappings,
} = schema;

/* ---------- PlayStation-Katalog ---------- */

export function upsertPsGame(title: PsnTitle): schema.PsGame {
  const existing = db.select().from(psGames).where(eq(psGames.npCommunicationId, title.npCommunicationId)).get();
  const values = {
    npCommunicationId: title.npCommunicationId,
    npServiceName: title.npServiceName,
    name: title.name,
    platform: title.platform,
    iconUrl: title.iconUrl,
    definedBronze: title.defined.bronze,
    definedSilver: title.defined.silver,
    definedGold: title.defined.gold,
    definedPlatinum: title.defined.platinum,
  };
  if (existing) {
    db.update(psGames).set(values).where(eq(psGames.id, existing.id)).run();
    return { ...existing, ...values };
  }
  return db.insert(psGames).values(values).returning().get();
}

export function upsertPsTrophies(psGameId: number, defs: PsnTrophyDefinition[]): schema.PsTrophy[] {
  const out: schema.PsTrophy[] = [];
  for (const d of defs) {
    const values = {
      psGameId,
      trophyId: d.trophyId,
      name: d.name,
      detail: d.detail,
      type: d.type,
      hidden: d.hidden,
      iconUrl: d.iconUrl,
      groupId: d.groupId,
    };
    const row = db
      .insert(psTrophies)
      .values(values)
      .onConflictDoUpdate({ target: [psTrophies.psGameId, psTrophies.trophyId], set: values })
      .returning()
      .get();
    out.push(row);
  }
  return out;
}

/* ---------- Xbox-Katalog ---------- */

export function upsertXboxTitle(title: XboxTitleInfo): schema.XboxTitle {
  const values = {
    titleId: title.titleId,
    name: title.name,
    iconUrl: title.iconUrl,
    devices: title.devices.join(","),
    totalGamerscore: title.totalGamerscore,
    achievementCount: title.achievementCount,
  };
  return db
    .insert(xboxTitles)
    .values(values)
    .onConflictDoUpdate({ target: xboxTitles.titleId, set: values })
    .returning()
    .get();
}

export function upsertXboxAchievements(
  xboxTitleId: number,
  list: XboxAchievementInfo[],
): schema.XboxAchievement[] {
  const out: schema.XboxAchievement[] = [];
  for (const a of list) {
    const values = {
      xboxTitleId,
      achievementId: a.achievementId,
      name: a.name,
      description: a.description,
      lockedDescription: a.lockedDescription,
      gamerscore: a.gamerscore,
      iconUrl: a.iconUrl,
      isSecret: a.isSecret,
      rarityPercent: a.rarityPercent,
    };
    out.push(
      db
        .insert(xboxAchievements)
        .values(values)
        .onConflictDoUpdate({
          target: [xboxAchievements.xboxTitleId, xboxAchievements.achievementId],
          set: values,
        })
        .returning()
        .get(),
    );
  }
  // Summen am Titel aktuell halten.
  const all = db.select().from(xboxAchievements).where(eq(xboxAchievements.xboxTitleId, xboxTitleId)).all();
  db.update(xboxTitles)
    .set({
      achievementCount: all.length,
      totalGamerscore: all.reduce((s, a) => s + a.gamerscore, 0),
    })
    .where(eq(xboxTitles.id, xboxTitleId))
    .run();
  return out;
}

/* ---------- Mapping-Vorschläge ---------- */

/**
 * Stellt sicher, dass für ein PS-Spiel ein Mapping-Datensatz existiert und berechnet
 * (falls noch nicht entschieden) den besten Xbox-Vorschlag.
 */
export function ensureGameMapping(psGame: schema.PsGame): schema.GameMapping {
  const existing = db.select().from(gameMappings).where(eq(gameMappings.psGameId, psGame.id)).get();
  if (existing && existing.status !== "pending") return existing;

  const candidates = db.select().from(xboxTitles).all();
  const best = bestCandidate({ name: psGame.name }, candidates, (c) => ({ name: c.name }));
  const suggestion = best && best.score >= 0.6 ? best : null;

  if (existing) {
    db.update(gameMappings)
      .set({
        suggestedXboxTitleId: suggestion?.item.id ?? null,
        suggestionConfidence: suggestion?.score ?? null,
        updatedAt: nowIso(),
      })
      .where(eq(gameMappings.id, existing.id))
      .run();
    return db.select().from(gameMappings).where(eq(gameMappings.id, existing.id)).get()!;
  }
  return db
    .insert(gameMappings)
    .values({
      psGameId: psGame.id,
      status: "pending",
      suggestedXboxTitleId: suggestion?.item.id ?? null,
      suggestionConfidence: suggestion?.score ?? null,
    })
    .returning()
    .get();
}

/**
 * Berechnet Trophäen-Vorschläge für ein gemapptes Spiel. Bereits entschiedene Trophäen
 * bleiben unangetastet. Mit `autoAccept` werden sehr sichere Treffer direkt gemappt.
 */
export function refreshTrophySuggestions(
  psGameId: number,
  xboxTitleId: number,
  options: { autoAccept?: boolean; decidedBy?: string } = {},
): { suggested: number; autoMapped: number } {
  const trophies = db.select().from(psTrophies).where(eq(psTrophies.psGameId, psGameId)).all();
  const achievements = db.select().from(xboxAchievements).where(eq(xboxAchievements.xboxTitleId, xboxTitleId)).all();
  const existing = new Map(
    db
      .select()
      .from(trophyMappings)
      .where(inArray(trophyMappings.psTrophyId, trophies.map((t) => t.id).concat(-1)))
      .all()
      .map((m) => [m.psTrophyId, m]),
  );
  let suggested = 0;
  let autoMapped = 0;
  for (const trophy of trophies) {
    const current = existing.get(trophy.id);
    if (current && current.status !== "pending") continue;

    // Platin hat auf Xbox kein Gegenstück – automatisch als "kein Gegenstück" markieren.
    if (trophy.type === "platinum") {
      const values = {
        psTrophyId: trophy.id,
        xboxAchievementId: null,
        status: "no_counterpart" as const,
        suggestedXboxAchievementId: null,
        suggestionConfidence: null,
        note: "platinum",
        decidedBy: "system",
        decidedAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.insert(trophyMappings)
        .values(values)
        .onConflictDoUpdate({ target: trophyMappings.psTrophyId, set: values })
        .run();
      continue;
    }

    const best = bestCandidate(
      { name: trophy.name, detail: trophy.detail },
      achievements,
      (a) => ({ name: a.name, detail: a.description }),
    );
    const suggestion = best && best.score >= 0.5 ? best : null;
    const autoAccept = Boolean(options.autoAccept && suggestion && suggestion.score >= env.autoMapThreshold);
    if (suggestion) suggested++;
    if (autoAccept) autoMapped++;
    const values = {
      psTrophyId: trophy.id,
      xboxAchievementId: autoAccept ? suggestion!.item.id : null,
      status: autoAccept ? ("mapped" as const) : ("pending" as const),
      suggestedXboxAchievementId: suggestion?.item.id ?? null,
      suggestionConfidence: suggestion?.score ?? null,
      note: autoAccept ? `auto:${(suggestion!.score * 100).toFixed(0)}` : null,
      decidedBy: autoAccept ? (options.decidedBy ?? "auto") : null,
      decidedAt: autoAccept ? nowIso() : null,
      updatedAt: nowIso(),
    };
    db.insert(trophyMappings)
      .values(values)
      .onConflictDoUpdate({ target: trophyMappings.psTrophyId, set: values })
      .run();
  }
  return { suggested, autoMapped };
}

/** Admin-Entscheidung für ein Spiel. */
export function decideGameMapping(
  psGameId: number,
  decision: { xboxTitleId: number | null; note?: string | null; decidedBy: string; autoAcceptTrophies?: boolean },
) {
  const status: schema.MappingStatus = decision.xboxTitleId ? "mapped" : "no_counterpart";
  const values = {
    psGameId,
    xboxTitleId: decision.xboxTitleId,
    status,
    note: decision.note ?? null,
    decidedBy: decision.decidedBy,
    decidedAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.insert(gameMappings)
    .values(values)
    .onConflictDoUpdate({ target: gameMappings.psGameId, set: values })
    .run();
  if (decision.xboxTitleId) {
    // Beim Wechsel des Xbox-Titels sind alte Trophäen-Entscheidungen ungültig.
    const trophyIds = db.select({ id: psTrophies.id }).from(psTrophies).where(eq(psTrophies.psGameId, psGameId)).all().map((t) => t.id);
    if (trophyIds.length) {
      const stale = db
        .select({ id: trophyMappings.id, achId: xboxAchievements.id, titleId: xboxAchievements.xboxTitleId })
        .from(trophyMappings)
        .leftJoin(xboxAchievements, eq(trophyMappings.xboxAchievementId, xboxAchievements.id))
        .where(inArray(trophyMappings.psTrophyId, trophyIds))
        .all()
        .filter((m) => m.achId && m.titleId !== decision.xboxTitleId)
        .map((m) => m.id);
      if (stale.length) db.delete(trophyMappings).where(inArray(trophyMappings.id, stale)).run();
    }
    return refreshTrophySuggestions(psGameId, decision.xboxTitleId, {
      autoAccept: decision.autoAcceptTrophies ?? true,
      decidedBy: decision.decidedBy,
    });
  }
  return { suggested: 0, autoMapped: 0 };
}

/** Setzt ein Spiel-Mapping auf "offen" zurück. */
export function resetGameMapping(psGameId: number) {
  db.update(gameMappings)
    .set({ status: "pending", xboxTitleId: null, note: null, decidedBy: null, decidedAt: null, updatedAt: nowIso() })
    .where(eq(gameMappings.psGameId, psGameId))
    .run();
  const game = db.select().from(psGames).where(eq(psGames.id, psGameId)).get();
  if (game) ensureGameMapping(game);
}

/** Admin-Entscheidung für eine Trophäe. */
export function decideTrophyMapping(
  psTrophyId: number,
  decision: { xboxAchievementId: number | null; note?: string | null; decidedBy: string },
) {
  const status: schema.MappingStatus = decision.xboxAchievementId ? "mapped" : "no_counterpart";
  const values = {
    psTrophyId,
    xboxAchievementId: decision.xboxAchievementId,
    status,
    note: decision.note ?? null,
    decidedBy: decision.decidedBy,
    decidedAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.insert(trophyMappings)
    .values(values)
    .onConflictDoUpdate({ target: trophyMappings.psTrophyId, set: values })
    .run();
}

export function resetTrophyMapping(psTrophyId: number) {
  db.update(trophyMappings)
    .set({ status: "pending", xboxAchievementId: null, note: null, decidedBy: null, decidedAt: null, updatedAt: nowIso() })
    .where(eq(trophyMappings.psTrophyId, psTrophyId))
    .run();
}

/** Übernimmt alle offenen Trophäen-Vorschläge eines Spiels ab einer Mindestähnlichkeit. */
export function acceptTrophySuggestions(psGameId: number, minScore: number, decidedBy: string): number {
  const rows = db
    .select({ m: trophyMappings })
    .from(trophyMappings)
    .innerJoin(psTrophies, eq(trophyMappings.psTrophyId, psTrophies.id))
    .where(and(eq(psTrophies.psGameId, psGameId), eq(trophyMappings.status, "pending")))
    .all();
  let n = 0;
  for (const { m } of rows) {
    if (m.suggestedXboxAchievementId && (m.suggestionConfidence ?? 0) >= minScore) {
      decideTrophyMapping(m.psTrophyId, {
        xboxAchievementId: m.suggestedXboxAchievementId,
        note: `suggestion:${((m.suggestionConfidence ?? 0) * 100).toFixed(0)}`,
        decidedBy,
      });
      n++;
    }
  }
  return n;
}

/** Übersetzt maschinelle Notizen ("platinum", "auto:95", "suggestion:90"); Freitext bleibt unverändert. */
export function renderNote(t: (key: "mapping.note.platinum" | "mapping.note.auto" | "mapping.note.suggestion", vars?: Record<string, string | number>) => string, note: string | null | undefined): string | null {
  if (!note) return null;
  if (note === "platinum") return t("mapping.note.platinum");
  const m = /^(auto|suggestion):(\d+)$/.exec(note);
  if (m) return t(m[1] === "auto" ? "mapping.note.auto" : "mapping.note.suggestion", { p: m[2] });
  return note;
}
