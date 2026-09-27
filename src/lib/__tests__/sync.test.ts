import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_PATH = ":memory:";
process.env.DEMO_MODE = "true";

const { runSync, getSyncRun } = await import("../sync");
const { seedDemoCatalog } = await import("../seed");
const { linkPsnAccount, linkXboxAccount } = await import("../accounts");
const { DemoPsnClient } = await import("../providers/psn/demo");
const { DemoXboxClient } = await import("../providers/xbox/demo");
const { decideGameMapping, acceptTrophySuggestions, decideTrophyMapping } = await import("../catalog");
const { db, schema } = await import("../db");
const { eq } = await import("drizzle-orm");

describe("Sync-Engine (Demo-Daten)", () => {
  let userId: number;

  beforeAll(async () => {
    await seedDemoCatalog();
    const psn = new DemoPsnClient();
    const xbox = new DemoXboxClient();
    userId = linkPsnAccount(undefined, await psn.getProfile(), null);
    userId = linkXboxAccount(userId, await xbox.getProfile(), null);
  });

  it("überträgt gemappte Trophäen und klassifiziert den Rest", async () => {
    const { runId, summary } = await runSync(userId, { psn: new DemoPsnClient(), xbox: new DemoXboxClient() });
    expect(summary.games.total).toBe(7);
    expect(summary.games.mapped).toBe(3); // Hades, Stardew, Celeste
    expect(summary.games.noCounterpart).toBe(1); // Ratchet
    expect(summary.games.pending).toBe(3); // Hollow Knight, Cyberpunk, Ghost

    // Hades: 8 verdient, 2 davon bereits echt auf Xbox (Escaped Tartarus, Useless Trinket)
    expect(summary.trophies.alreadyUnlockedOnXbox).toBe(2);
    expect(summary.trophies.synced).toBeGreaterThan(10);
    expect(summary.trophies.gamePending).toBeGreaterThan(0);
    expect(summary.trophies.gameNoCounterpart).toBe(2);
    expect(summary.gamerscoreAdded).toBeGreaterThan(0);

    const run = getSyncRun(runId, userId);
    expect(run?.items.length).toBe(summary.trophies.earned);
  });

  it("ist idempotent: zweiter Lauf schreibt nichts Neues gut", async () => {
    const { summary } = await runSync(userId, { psn: new DemoPsnClient(), xbox: new DemoXboxClient() });
    expect(summary.trophies.synced).toBe(0);
    expect(summary.trophies.alreadySynced).toBeGreaterThan(10);
    expect(summary.gamerscoreAdded).toBe(0);
  });

  it("nimmt Admin-Entscheidungen beim nächsten Lauf auf", async () => {
    const hk = db.select().from(schema.psGames).where(eq(schema.psGames.name, "Hollow Knight")).get()!;
    const hkXbox = db.select().from(schema.xboxTitles).where(eq(schema.xboxTitles.titleId, "1900024337")).get()!;
    const res = decideGameMapping(hk.id, { xboxTitleId: hkXbox.id, decidedBy: "test", autoAcceptTrophies: true });
    expect(res.autoMapped).toBeGreaterThan(3);
    acceptTrophySuggestions(hk.id, 0.5, "test");

    const { summary } = await runSync(userId, { psn: new DemoPsnClient(), xbox: new DemoXboxClient() });
    expect(summary.games.mapped).toBe(4);
    expect(summary.trophies.synced).toBe(4); // 4 verdiente Hollow-Knight-Trophäen
  });

  it("entfernt symbolische Freischaltungen, wenn ein Mapping aufgehoben wird", async () => {
    const trophy = db
      .select({ t: schema.psTrophies })
      .from(schema.psTrophies)
      .innerJoin(schema.psGames, eq(schema.psTrophies.psGameId, schema.psGames.id))
      .where(eq(schema.psGames.name, "Celeste"))
      .all()
      .find((r) => r.t.name === "The Summit")!.t;
    decideTrophyMapping(trophy.id, { xboxAchievementId: null, decidedBy: "test", note: "Test" });
    const { summary } = await runSync(userId, { psn: new DemoPsnClient(), xbox: new DemoXboxClient() });
    expect(summary.trophies.noCounterpart).toBeGreaterThanOrEqual(1);
    const still = db
      .select()
      .from(schema.userXboxAchievements)
      .where(eq(schema.userXboxAchievements.psTrophyId, trophy.id))
      .get();
    expect(still).toBeUndefined();
  });
});
