import { demoPsnProfile, demoPsnTitles } from "../demo-data";
import type { PsnClient, PsnProfile, PsnTitle } from "../types";

/** Demo-PSN-Client: liefert die Fixture-Daten, keine Netzwerkzugriffe. */
export class DemoPsnClient implements PsnClient {
  async getProfile(): Promise<PsnProfile> {
    return demoPsnProfile;
  }
  async getTitles(): Promise<PsnTitle[]> {
    return demoPsnTitles.map((t) => {
      const { trophies, earnedTrophies, ...title } = t;
      void trophies;
      void earnedTrophies;
      return title;
    });
  }
  async getTitleTrophies(title: PsnTitle) {
    const found = demoPsnTitles.find((t) => t.npCommunicationId === title.npCommunicationId);
    if (!found) throw new Error(`Demo-Titel ${title.npCommunicationId} nicht gefunden`);
    return { trophies: found.trophies, earnedTrophies: found.earnedTrophies };
  }
}
