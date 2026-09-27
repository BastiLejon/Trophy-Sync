import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_PATH = ":memory:";
process.env.DEMO_MODE = "true";

const { seedDemoCatalog } = await import("../seed");
const { linkPsnAccount, linkXboxAccount, ensurePairing, PairingConflictError, unlinkPsn, releasePairing, listPairings } = await import("../accounts");
const { runSync } = await import("../sync");
const { DemoPsnClient } = await import("../providers/psn/demo");
const { DemoXboxClient } = await import("../providers/xbox/demo");
const { sealToken, openToken } = await import("../crypto");

describe("Konto-Paarungen", () => {
  let userA: number;

  beforeAll(async () => {
    await seedDemoCatalog();
    userA = linkPsnAccount(undefined, await new DemoPsnClient().getProfile(), null);
    userA = linkXboxAccount(userA, await new DemoXboxClient().getProfile(), null);
  });

  it("legt beim ersten Sync eine feste Paarung an", async () => {
    await runSync(userA, { psn: new DemoPsnClient(), xbox: new DemoXboxClient() });
    const pairings = listPairings();
    expect(pairings).toHaveLength(1);
    expect(pairings[0].psnOnlineId).toBe("DemoHunter_DE");
    expect(pairings[0].gamertag).toBe("DemoGamer");
  });

  it("sperrt das Lösen gepaarter Konten", () => {
    expect(() => unlinkPsn(userA)).toThrow("locked");
  });

  it("verhindert, dass ein gepaartes Xbox-Konto mit einem anderen PSN-Konto verwendet wird", async () => {
    // Neuer Benutzer mit anderem PSN-Konto, versucht das bereits gepaarte Xbox-Konto zu nutzen.
    let userB = linkPsnAccount(undefined, { accountId: "psn-other", onlineId: "OtherHunter", avatarUrl: null, trophyLevel: 1, earned: { bronze: 0, silver: 0, gold: 0, platinum: 0 } }, null);
    userB = linkXboxAccount(userB, await new DemoXboxClient().getProfile(), null);
    // Das Xbox-Konto ist bereits Benutzer A zugeordnet → Login landet bei A, nicht bei B.
    expect(userB).toBe(userA);
  });

  it("wirft einen Konflikt, wenn ein gepaartes PSN-Konto mit einem anderen Xbox-Konto gepaart werden soll", async () => {
    // Paarung freigeben, Konten neu kombinieren und Konflikt erzwingen.
    const [p] = listPairings();
    releasePairing(p.id);
    let userC = linkXboxAccount(undefined, { xuid: "xuid-other", gamertag: "OtherGamer", gamerpicUrl: null, gamerscore: 0 }, null);
    userC = linkPsnAccount(userC, { accountId: "psn-c", onlineId: "HunterC", avatarUrl: null, trophyLevel: 1, earned: { bronze: 0, silver: 0, gold: 0, platinum: 0 } }, null);
    ensurePairing(userC); // HunterC ↔ OtherGamer
    // Benutzer A (DemoHunter_DE ↔ DemoGamer) wird wieder gepaart.
    ensurePairing(userA);
    // Nun versucht ein Benutzer, DemoHunter_DE mit OtherGamer zu paaren → Konflikt.
    const { db, schema } = await import("../db");
    const { eq } = await import("drizzle-orm");
    db.delete(schema.xboxAccounts).where(eq(schema.xboxAccounts.xuid, "2533274800000001")).run();
    db.update(schema.xboxAccounts).set({ userId: userA }).where(eq(schema.xboxAccounts.xuid, "xuid-other")).run();
    expect(() => ensurePairing(userA)).toThrow(PairingConflictError);
  });
});

describe("Token-Verschlüsselung", () => {
  it("ver- und entschlüsselt symmetrisch", () => {
    const sealed = sealToken("secret-token-value");
    expect(sealed).not.toContain("secret-token-value");
    expect(sealed?.startsWith("enc1:")).toBe(true);
    expect(openToken(sealed)).toBe("secret-token-value");
  });
  it("lässt Klartext-Altbestand und leere Werte durch", () => {
    expect(openToken("plain")).toBe("plain");
    expect(openToken(null)).toBeNull();
    expect(sealToken(null)).toBeNull();
  });
});
