import type {
  PsnProfile,
  PsnTitleWithTrophies,
  PsnTrophyDefinition,
  TrophyType,
  XboxAchievementInfo,
  XboxProfile,
  XboxTitleWithAchievements,
} from "./types";

/**
 * Demo-Daten für den Betrieb ohne echte Sony-/Microsoft-Zugangsdaten.
 * Die Spiele sind real, die Trophäen-/Achievement-Listen sind gekürzt und
 * teilweise vereinfacht. Absichtlich enthalten:
 *  - Spiele, die auf beiden Plattformen existieren (1:1 Mapping möglich)
 *  - PlayStation-Exklusivtitel (kein Gegenstück)
 *  - Trophäen, deren Xbox-Pendant anders heißt (Admin-Entscheidung nötig)
 *  - Platin-Trophäen (auf Xbox gibt es kein Äquivalent)
 */

type T = [id: number, name: string, detail: string, type: TrophyType, hidden?: boolean];
type A = [id: string, name: string, description: string, gamerscore: number, rarity?: number, secret?: boolean];

function trophies(list: T[]): PsnTrophyDefinition[] {
  return list.map(([trophyId, name, detail, type, hidden]) => ({
    trophyId,
    name,
    detail,
    type,
    hidden: Boolean(hidden),
    iconUrl: null,
    groupId: "default",
  }));
}

function achievements(list: A[], unlocked: Record<string, string> = {}): XboxAchievementInfo[] {
  return list.map(([achievementId, name, description, gamerscore, rarity, secret]) => ({
    achievementId,
    name,
    description,
    lockedDescription: description,
    gamerscore,
    iconUrl: null,
    isSecret: Boolean(secret),
    rarityPercent: rarity ?? null,
    unlocked: achievementId in unlocked,
    unlockedAt: unlocked[achievementId] ?? null,
  }));
}

function counts(defs: PsnTrophyDefinition[], earnedIds: number[]) {
  const c = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const d of defs) if (earnedIds.includes(d.trophyId)) c[d.type]++;
  return c;
}
function defined(defs: PsnTrophyDefinition[]) {
  const c = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const d of defs) c[d.type]++;
  return c;
}

function psTitle(
  npCommunicationId: string,
  name: string,
  platform: string,
  npServiceName: "trophy" | "trophy2",
  defs: PsnTrophyDefinition[],
  earned: Record<number, string>,
): PsnTitleWithTrophies {
  const earnedIds = Object.keys(earned).map(Number);
  const dates = Object.values(earned).sort();
  return {
    npCommunicationId,
    npServiceName,
    name,
    platform,
    iconUrl: null,
    defined: defined(defs),
    earned: counts(defs, earnedIds),
    progress: Math.round((earnedIds.length / defs.length) * 100),
    lastUpdatedAt: dates[dates.length - 1] ?? null,
    trophies: defs,
    earnedTrophies: defs.map((d) => ({
      trophyId: d.trophyId,
      earned: d.trophyId in earned,
      earnedAt: earned[d.trophyId] ?? null,
    })),
  };
}

/* ---------------------------------------------------------------------- */
/* PlayStation-Demo-Konto                                                  */
/* ---------------------------------------------------------------------- */

const hadesTrophies = trophies([
  [0, "Platinum Bounty", "Obtain all other trophies.", "platinum"],
  [1, "Escaped Tartarus", "Escape Tartarus.", "bronze"],
  [2, "Escaped Asphodel", "Escape Asphodel.", "bronze"],
  [3, "Escaped Elysium", "Escape Elysium.", "silver"],
  [4, "Is There No Escape?", "Escape the Underworld.", "gold"],
  [5, "Chthonic Colleagues", "Reach the maximum affinity with Nyx, Hypnos, Charon, Cerberus, Skelly, Meg and Dusa.", "silver"],
  [6, "The Useless Trinket", "Obtain the Useless Trinket.", "bronze"],
  [7, "Master of Arms", "Unlock every weapon aspect.", "gold"],
  [8, "Well-Stocked", "Obtain 90 bottles of Nectar.", "bronze"],
  [9, "Friends Forever", "Reach maximum affinity with any character.", "bronze"],
  [10, "Dark Nights", "Unlock every Mirror of Night upgrade.", "silver"],
  [11, "Blood Thirsty", "Obtain 50 Titan Blood.", "bronze"],
]);

const stardewTrophies = trophies([
  [0, "Stardew Valley Master", "Obtain all other trophies.", "platinum"],
  [1, "Greenhorn", "Earn 15,000g.", "bronze"],
  [2, "Cowpoke", "Earn 50,000g.", "bronze"],
  [3, "Homesteader", "Earn 250,000g.", "silver"],
  [4, "Millionaire", "Earn 1,000,000g.", "gold"],
  [5, "A Complete Collection", "Complete the museum collection.", "gold"],
  [6, "Master Angler", "Catch every fish.", "silver"],
  [7, "Mystery of the Stardrops", "Find every stardrop.", "silver"],
  [8, "Beloved Farmer", "Reach 10 hearts with 8 people.", "silver"],
  [9, "Local Legend", "Restore the Pelican Town Community Center.", "gold"],
  [10, "Fector's Challenge", "Beat Journey of the Prairie King without dying.", "gold"],
]);

const celesteTrophies = trophies([
  [0, "Prologue", "Complete the Prologue.", "bronze"],
  [1, "Forsaken City", "Complete Chapter 1.", "bronze"],
  [2, "Old Site", "Complete Chapter 2.", "bronze"],
  [3, "Celestial Resort", "Complete Chapter 3.", "bronze"],
  [4, "Golden Ridge", "Complete Chapter 4.", "bronze"],
  [5, "Mirror Temple", "Complete Chapter 5.", "silver"],
  [6, "Reflection", "Complete Chapter 6.", "silver"],
  [7, "The Summit", "Complete Chapter 7.", "gold"],
  [8, "Won't Somebody Think Of The Strawberries?!", "Collect 175 strawberries.", "gold"],
  [9, "Heart of the Mountain", "Collect every crystal heart.", "silver"],
]);

const hollowKnightTrophies = trophies([
  [0, "Hollow Knight", "Obtain all trophies.", "platinum"],
  [1, "Enlightenment", "Discover the Seat of the Dreamer.", "bronze"],
  [2, "Illumination", "Obtain the Lumafly Lantern.", "bronze"],
  [3, "Grubfriend", "Rescue 23 Grubs.", "silver"],
  [4, "Metamorphosis", "Rescue every Grub.", "gold"],
  [5, "Steel Heart", "Complete Steel Soul mode.", "gold"],
  [6, "Hunter's Mark", "Complete the Hunter's Journal.", "gold"],
  [7, "The Hollow Knight", "Defeat the Hollow Knight.", "silver"],
  [8, "Neglect", "Complete the game in under 5 hours.", "gold"],
]);

const cyberpunkTrophies = trophies([
  [0, "Never Fade Away", "Obtain all trophies.", "platinum"],
  [1, "The Fool", "Become a mercenary.", "bronze"],
  [2, "The Devil", "Help Takemura reach Hanako Arasaka.", "silver"],
  [3, "The Star", "Leave Night City with the Aldecaldos.", "gold"],
  [4, "The Wheel of Fortune", "Interrogate the Voodoo Boys contact.", "bronze"],
  [5, "V for Vendetta", "Survive a lethal shot thanks to the Second Heart cyberware.", "bronze", true],
  [6, "Legend of the Afterlife", "Reach max Street Cred.", "silver"],
  [7, "Autojock", "Buy all vehicles available for purchase.", "gold"],
  [8, "Gun Fu", "Kill or incapacitate three enemies in quick succession with a revolver.", "bronze"],
]);

const ghostTrophies = trophies([
  [0, "Living Legend", "Obtain all trophies.", "platinum"],
  [1, "Mono No Aware", "Complete Act 1.", "bronze"],
  [2, "Honor the Fallen", "Complete Act 2.", "silver"],
  [3, "Ghost of Tsushima", "Complete Act 3.", "gold"],
  [4, "Body, Mind and Spirit", "Obtain all charms.", "silver"],
  [5, "Cooper Clan Cosplayer", "Find the Sly Cooper armor.", "bronze", true],
]);

const ratchetTrophies = trophies([
  [0, "Master of the Multiverse", "Obtain all trophies.", "platinum"],
  [1, "Rift Apart", "Complete the game.", "gold"],
  [2, "Nine Times, No Less", "Reach max level with every weapon.", "gold"],
  [3, "Glitched Out", "Complete every Glitch mission.", "silver"],
  [4, "Bolt Collector", "Collect 1,000,000 bolts.", "bronze"],
]);

export const demoPsnProfile: PsnProfile = {
  accountId: "demo-psn-0001",
  onlineId: "DemoHunter_DE",
  avatarUrl: null,
  trophyLevel: 312,
  earned: { bronze: 0, silver: 0, gold: 0, platinum: 0 },
};

export const demoPsnTitles: PsnTitleWithTrophies[] = [
  psTitle("NPWR21215_00", "Hades", "PS5", "trophy2", hadesTrophies, {
    1: "2024-03-02T19:12:00Z",
    2: "2024-03-04T21:40:00Z",
    3: "2024-03-09T20:05:00Z",
    4: "2024-03-15T22:31:00Z",
    6: "2024-03-01T18:00:00Z",
    8: "2024-04-01T17:20:00Z",
    9: "2024-03-20T20:10:00Z",
    11: "2024-04-10T19:45:00Z",
  }),
  psTitle("NPWR11064_00", "Stardew Valley", "PS4", "trophy", stardewTrophies, {
    1: "2023-11-11T10:00:00Z",
    2: "2023-11-18T12:30:00Z",
    3: "2023-12-24T15:00:00Z",
    6: "2024-01-05T20:00:00Z",
    7: "2024-01-20T21:15:00Z",
    9: "2024-02-02T19:00:00Z",
  }),
  psTitle("NPWR14033_00", "Celeste", "PS4", "trophy", celesteTrophies, {
    0: "2023-08-01T20:00:00Z",
    1: "2023-08-01T20:45:00Z",
    2: "2023-08-02T21:00:00Z",
    3: "2023-08-05T19:30:00Z",
    4: "2023-08-08T22:00:00Z",
    5: "2023-08-12T21:10:00Z",
    6: "2023-08-15T20:20:00Z",
    7: "2023-08-20T23:00:00Z",
  }),
  psTitle("NPWR13126_00", "Hollow Knight", "PS4", "trophy", hollowKnightTrophies, {
    1: "2023-05-10T18:00:00Z",
    2: "2023-05-10T19:30:00Z",
    3: "2023-05-20T20:00:00Z",
    7: "2023-06-15T22:45:00Z",
  }),
  psTitle("NPWR23078_00", "Cyberpunk 2077", "PS5", "trophy2", cyberpunkTrophies, {
    1: "2024-05-01T20:00:00Z",
    4: "2024-05-06T21:00:00Z",
    5: "2024-05-09T22:10:00Z",
    8: "2024-05-03T20:30:00Z",
    2: "2024-06-01T23:00:00Z",
  }),
  psTitle("NPWR16585_00", "Ghost of Tsushima", "PS5", "trophy2", ghostTrophies, {
    1: "2022-09-10T20:00:00Z",
    2: "2022-09-25T21:00:00Z",
    3: "2022-10-08T22:30:00Z",
    5: "2022-09-12T19:00:00Z",
  }),
  psTitle("NPWR20486_00", "Ratchet & Clank: Rift Apart", "PS5", "trophy2", ratchetTrophies, {
    1: "2022-01-15T20:00:00Z",
    4: "2022-01-10T18:00:00Z",
  }),
];

// Profilzähler aus den Titeln ableiten.
for (const t of demoPsnTitles) {
  demoPsnProfile.earned.bronze += t.earned.bronze;
  demoPsnProfile.earned.silver += t.earned.silver;
  demoPsnProfile.earned.gold += t.earned.gold;
  demoPsnProfile.earned.platinum += t.earned.platinum;
}

/* ---------------------------------------------------------------------- */
/* Xbox-Demo-Konto und Xbox-Katalog                                        */
/* ---------------------------------------------------------------------- */

export const demoXboxProfile: XboxProfile = {
  xuid: "2533274800000001",
  gamertag: "DemoGamer",
  gamerpicUrl: null,
  gamerscore: 0,
};

function xboxTitle(
  titleId: string,
  name: string,
  devices: string[],
  list: A[],
  unlocked: Record<string, string> = {},
  lastPlayedAt: string | null = null,
): XboxTitleWithAchievements {
  const achs = achievements(list, unlocked);
  return {
    titleId,
    name,
    iconUrl: null,
    devices,
    totalGamerscore: achs.reduce((s, a) => s + a.gamerscore, 0),
    achievementCount: achs.length,
    lastPlayedAt,
    achievements: achs,
  };
}

/** Titel, die das Demo-Xbox-Konto tatsächlich gespielt hat (mit echten Freischaltungen). */
export const demoXboxPlayedTitles: XboxTitleWithAchievements[] = [
  xboxTitle(
    "1551648579",
    "Forza Horizon 5",
    ["XboxSeries", "PC"],
    [
      ["1", "Welcome to Mexico", "Complete the initial drive.", 10, 92.1],
      ["2", "Horizon Festival", "Open the Horizon Festival.", 10, 80.4],
      ["3", "Star Struck", "Earn 100 stars in skill events.", 20, 40.2],
      ["4", "Wheelspinner", "Win 50 Wheelspins.", 15, 33.7],
      ["5", "Hall of Fame", "Join the Hall of Fame.", 100, 6.2],
    ],
    { "1": "2023-01-10T18:00:00Z", "2": "2023-01-10T18:30:00Z", "3": "2023-02-01T20:00:00Z" },
    "2024-07-20T21:00:00Z",
  ),
  xboxTitle(
    "1897494023",
    "Hades",
    ["XboxSeries", "XboxOne", "PC"],
    [
      ["1", "Escaped Tartarus", "Escape Tartarus.", 15, 75.0],
      ["2", "Escaped Asphodel", "Escape Asphodel.", 20, 55.3],
      ["3", "Escaped Elysium", "Escape Elysium.", 30, 38.1],
      ["4", "Is There No Escape?", "Escape the Underworld.", 100, 25.4],
      ["5", "Chthonic Colleagues", "Reach the maximum affinity with Nyx, Hypnos, Charon, Cerberus, Skelly, Meg and Dusa.", 50, 4.1],
      ["6", "The Useless Trinket", "Obtain the Useless Trinket.", 10, 70.2],
      ["7", "Master of Arms", "Unlock every weapon aspect.", 100, 3.8],
      ["8", "Well-Stocked", "Obtain 90 bottles of Nectar.", 25, 12.0],
      ["9", "Friends Forever", "Reach maximum affinity with any character.", 25, 20.9],
      ["10", "Dark Nights", "Unlock every Mirror of Night upgrade.", 50, 9.8],
      ["11", "Blood Thirsty", "Obtain 50 Titan Blood.", 50, 7.6],
      ["12", "Souls of the Fallen", "Collect 200,000 Darkness.", 25, 5.0],
    ],
    { "1": "2023-09-01T20:00:00Z", "6": "2023-09-01T19:30:00Z" },
    "2023-09-05T20:00:00Z",
  ),
  xboxTitle(
    "1656155371",
    "Stardew Valley",
    ["XboxOne", "XboxSeries"],
    [
      ["1", "Greenhorn", "Earn 15,000g.", 20, 80.0],
      ["2", "Cowpoke", "Earn 50,000g.", 40, 60.0],
      ["3", "Homesteader", "Earn 250,000g.", 60, 35.0],
      ["4", "Millionaire", "Earn 1,000,000g.", 100, 12.0],
      ["5", "A Complete Collection", "Complete the museum collection.", 100, 4.0],
      ["6", "Master Angler", "Catch every fish.", 40, 6.0],
      ["7", "Mystery of the Stardrops", "Find every stardrop.", 40, 7.5],
      ["8", "Beloved Farmer", "Reach 10 hearts with 8 people.", 100, 5.0],
      ["9", "Local Legend", "Restore the Pelican Town Community Center.", 100, 11.0],
      ["10", "Fector's Challenge", "Beat Journey of the Prairie King without dying.", 100, 0.9],
    ],
    {},
    "2024-02-11T10:00:00Z",
  ),
];

/** Weitere Titel im Xbox-Katalog (vom Admin importiert, vom Demo-Konto nicht gespielt). */
export const demoXboxCatalogOnly: XboxTitleWithAchievements[] = [
  xboxTitle("1785906873", "Celeste", ["XboxOne", "XboxSeries"], [
    ["1", "Prologue", "Complete the Prologue.", 5, 90.0],
    ["2", "Forsaken City", "Complete Chapter 1.", 10, 75.0],
    ["3", "Old Site", "Complete Chapter 2.", 10, 60.0],
    ["4", "Celestial Resort", "Complete Chapter 3.", 15, 48.0],
    ["5", "Golden Ridge", "Complete Chapter 4.", 15, 40.0],
    ["6", "Mirror Temple", "Complete Chapter 5.", 20, 32.0],
    ["7", "Reflection", "Complete Chapter 6.", 25, 27.0],
    ["8", "The Summit", "Complete Chapter 7.", 50, 22.0],
    ["9", "Won't Somebody Think Of The Strawberries?!", "Collect 175 strawberries.", 100, 5.0],
    ["10", "Heart of the Mountain", "Collect every crystal heart.", 100, 2.0],
  ]),
  xboxTitle("1900024337", "Hollow Knight: Voidheart Edition", ["XboxOne", "XboxSeries"], [
    ["1", "Enlightenment", "Discover the Seat of the Dreamer.", 15, 70.0],
    ["2", "Illumination", "Obtain the Lumafly Lantern.", 15, 55.0],
    ["3", "Grubfriend", "Rescue 23 Grubs.", 30, 25.0],
    ["4", "Metamorphosis", "Rescue every Grub.", 60, 8.0],
    ["5", "Steel Heart", "Complete Steel Soul mode.", 100, 1.2],
    ["6", "Hunter's Mark", "Complete the Hunter's Journal.", 60, 4.0],
    ["7", "The Hollow Knight", "Defeat the Hollow Knight.", 40, 20.0],
    ["8", "Speedrun 1", "Complete the game in under 10 hours.", 40, 6.0],
    ["9", "Speedrun 2", "Complete the game in under 5 hours.", 60, 2.5],
  ]),
  xboxTitle("1739224406", "Cyberpunk 2077", ["XboxSeries", "XboxOne"], [
    ["1", "The Fool", "Become a mercenary.", 15, 85.0],
    ["2", "The Devil", "Help Takemura reach Hanako Arasaka.", 30, 20.0],
    ["3", "The Star", "Leave Night City with the Aldecaldos.", 30, 15.0],
    ["4", "The Wheel of Fortune", "Interrogate the Voodoo Boys contact.", 15, 45.0],
    ["5", "V for Vendetta", "Survive a lethal shot thanks to the Second Heart cyberware.", 15, 10.0, true],
    ["6", "Legend of the Afterlife", "Reach max Street Cred.", 30, 25.0],
    ["7", "Autojock", "Buy all vehicles available for purchase.", 30, 5.0],
    ["8", "Gunslinger", "Kill or incapacitate three enemies in quick succession with a revolver.", 15, 30.0],
    ["9", "Christmas Tree Attack", "Complete a Breach Protocol with at least 3 daemons uploaded.", 15, 12.0],
  ]),
];

export const demoXboxCatalog = [...demoXboxPlayedTitles, ...demoXboxCatalogOnly];

/* ---------------------------------------------------------------------- */
/* Admin-Entscheidungen, die beim Seeding als "bereits erledigt" gesetzt   */
/* werden, damit der Demo-Sync sofort Ergebnisse zeigt.                    */
/* ---------------------------------------------------------------------- */

export const demoSeedGameDecisions: {
  npCommunicationId: string;
  xboxTitleId: string | null;
  note?: string;
}[] = [
  { npCommunicationId: "NPWR21215_00", xboxTitleId: "1897494023" },
  { npCommunicationId: "NPWR11064_00", xboxTitleId: "1656155371" },
  { npCommunicationId: "NPWR14033_00", xboxTitleId: "1785906873" },
  {
    npCommunicationId: "NPWR20486_00",
    xboxTitleId: null,
    note: "PlayStation exclusive (Insomniac), no Xbox release.",
  },
];
