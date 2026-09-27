import { describe, expect, it } from "vitest";
import { bestCandidate, nameSimilarity, normalizeName, rankCandidates } from "../matching";

describe("normalizeName", () => {
  it("entfernt Plattform- und Editions-Rauschen", () => {
    expect(normalizeName("Hollow Knight: Voidheart Edition")).toBe("hollow knight");
    expect(normalizeName("Stardew Valley™ (PS4)")).toBe("stardew valley");
    expect(normalizeName("Final Fantasy VII Remake")).toBe("final fantasy 7 remake");
    expect(normalizeName("Ratchet & Clank: Rift Apart")).toBe("ratchet and clank rift apart");
  });
});

describe("nameSimilarity", () => {
  it("erkennt identische Titel trotz Zusätzen", () => {
    expect(nameSimilarity("Hades", "Hades")).toBe(1);
    expect(nameSimilarity("Hollow Knight", "Hollow Knight: Voidheart Edition")).toBeGreaterThan(0.9);
    expect(nameSimilarity("Cyberpunk 2077", "Cyberpunk 2077")).toBe(1);
  });
  it("trennt unterschiedliche Titel", () => {
    expect(nameSimilarity("Hades", "Forza Horizon 5")).toBeLessThan(0.4);
    expect(nameSimilarity("Ghost of Tsushima", "Celeste")).toBeLessThan(0.4);
  });
});

describe("rankCandidates", () => {
  const xbox = [
    { name: "Gunslinger", description: "Töte oder betäube drei Gegner in kurzer Folge mit einem Revolver." },
    { name: "The Fool", description: "Werde ein Söldner." },
    { name: "Autojock", description: "Kaufe alle Fahrzeuge, die zum Verkauf stehen." },
  ];
  const accessor = (c: (typeof xbox)[number]) => ({ name: c.name, detail: c.description });

  it("findet umbenannte Achievements über die Beschreibung", () => {
    const best = bestCandidate(
      { name: "Gun Fu", detail: "Töte oder betäube drei Gegner in kurzer Folge mit einem Revolver." },
      xbox,
      accessor,
    );
    expect(best?.item.name).toBe("Gunslinger");
    expect(best!.score).toBeGreaterThanOrEqual(0.85);
  });

  it("liefert keine Kandidaten unter der Mindestähnlichkeit", () => {
    const ranked = rankCandidates({ name: "Platinum Bounty", detail: "Erhalte alle anderen Trophäen." }, xbox, accessor);
    expect(ranked.every((c) => c.score < 0.5)).toBe(true);
  });
});
