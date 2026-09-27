import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProfileView } from "@/lib/profile";
import { formatDate, formatNumber } from "@/lib/format";
import { Alert, Artwork, PageHeader, Progress } from "@/components/ui";

export default async function ProfilePage() {
  const user = await requireUser();
  if (!user.xbox) {
    return (
      <div>
        <PageHeader title="Xbox-Profil" />
        <Alert>Bitte zuerst ein Xbox-Konto verknüpfen. <Link href="/login/xbox" className="underline">Mit Xbox anmelden</Link></Alert>
      </div>
    );
  }
  const view = getProfileView(user.userId);
  const total = user.xbox.gamerscore + view.totals.gamerscoreSynced;
  return (
    <div>
      <section className="card flex flex-wrap items-center gap-5 border-t-4 border-t-xbox">
        <Artwork src={user.xbox.gamerpicUrl} name={user.xbox.gamertag} size={88} rounded="rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted">Gamertag</div>
          <h1 className="truncate text-3xl font-bold">{user.xbox.gamertag}</h1>
          <div className="mt-1 text-sm text-muted">
            {view.titles.length} Spiele · {view.totals.unlockedXbox + view.totals.unlockedSynced} Achievements
            {user.psn && <> · verknüpft mit <span className="text-ps">{user.psn.onlineId}</span></>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Gamerscore gesamt</div>
            <div className="text-3xl font-bold text-xbox">
              <span aria-hidden>G</span> {formatNumber(total)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">davon Xbox</div>
            <div className="text-xl font-semibold">{formatNumber(user.xbox.gamerscore)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">davon PS-Sync</div>
            <div className="text-xl font-semibold text-ps">+{formatNumber(view.totals.gamerscoreSynced)}</div>
          </div>
        </div>
      </section>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Spiele</h2>
      {view.titles.length === 0 && <div className="card text-sm text-muted">Noch keine Spiele. Führe einen Sync aus.</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {view.titles.map((t) => {
          const unlocked = t.unlockedXbox + t.unlockedSynced;
          const gs = t.gamerscoreXbox + t.gamerscoreSynced;
          const pct = t.title.achievementCount ? (unlocked / t.title.achievementCount) * 100 : 0;
          return (
            <Link key={t.title.id} href={`/profile/${t.title.id}`} className="card transition hover:border-xbox/60">
              <div className="flex items-center gap-3">
                <Artwork src={t.title.iconUrl} name={t.title.name} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t.title.name}</div>
                  <div className="text-xs text-muted">Zuletzt: {formatDate(t.lastActivityAt)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>{unlocked} / {t.title.achievementCount} Achievements</span>
                <span className="font-semibold text-xbox"><span aria-hidden>G</span> {gs} / {t.title.totalGamerscore}</span>
              </div>
              <Progress value={pct} className="mt-2" />
              <div className="mt-2 flex gap-2 text-xs text-muted">
                {t.unlockedXbox > 0 && <span className="badge bg-xbox/15 text-xbox">{t.unlockedXbox} Xbox</span>}
                {t.unlockedSynced > 0 && <span className="badge bg-ps/15 text-ps">{t.unlockedSynced} PS-Sync</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
