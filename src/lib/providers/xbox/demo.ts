import { demoXboxCatalog, demoXboxPlayedTitles, demoXboxProfile } from "../demo-data";
import type { XboxAchievementInfo, XboxClient, XboxProfile, XboxTitleInfo } from "../types";

/** Demo-Xbox-Client: liefert die Fixture-Daten, keine Netzwerkzugriffe. */
export class DemoXboxClient implements XboxClient {
  async getProfile(): Promise<XboxProfile> {
    const gamerscore = demoXboxPlayedTitles
      .flatMap((t) => t.achievements)
      .filter((a) => a.unlocked)
      .reduce((s, a) => s + a.gamerscore, 0);
    return { ...demoXboxProfile, gamerscore };
  }
  async getTitles(): Promise<XboxTitleInfo[]> {
    return demoXboxPlayedTitles.map((t) => {
      const { achievements, ...info } = t;
      void achievements;
      return info;
    });
  }
  async getTitleAchievements(titleId: string): Promise<XboxAchievementInfo[]> {
    const found = demoXboxCatalog.find((t) => t.titleId === titleId);
    if (!found) throw new Error(`Demo-Xbox-Titel ${titleId} nicht gefunden`);
    return found.achievements;
  }
}
