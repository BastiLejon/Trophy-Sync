import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getProfileView } from "@/lib/profile";
import { formatDate, formatNumber } from "@/lib/format";
import { Alert, Artwork, PageHeader, Progress } from "@/components/ui";

export default async function ProfilePage() {
  const [user, { t, locale }] = await Promise.all([requireUser(), getT()]);
  if (!user.xbox) {
    return (
      <div>
        <PageHeader title={t("profile.title")} />
        <Alert>{t("profile.needXbox")} <Link href="/login/xbox" className="underline">{t("home.loginXbox")}</Link></Alert>
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
          <div className="text-xs uppercase tracking-wide text-muted">{t("profile.gamertag")}</div>
          <h1 className="truncate text-3xl font-bold">{user.xbox.gamertag}</h1>
          <div className="mt-1 text-sm text-muted">
            {t("profile.summary", { games: view.titles.length, achievements: view.totals.unlockedXbox + view.totals.unlockedSynced })}
            {user.psn && <> · {t("profile.linkedWith")} <span className="text-ps">{user.psn.onlineId}</span></>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">{t("profile.totalScore")}</div>
            <div className="text-3xl font-bold text-xbox">
              <span aria-hidden>G</span> {formatNumber(total, locale)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">{t("profile.fromXbox")}</div>
            <div className="text-xl font-semibold">{formatNumber(user.xbox.gamerscore, locale)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">{t("profile.fromSync")}</div>
            <div className="text-xl font-semibold text-ps">+{formatNumber(view.totals.gamerscoreSynced, locale)}</div>
          </div>
        </div>
      </section>

      <h2 className="mt-8 mb-3 text-lg font-semibold">{t("profile.games")}</h2>
      {view.titles.length === 0 && <div className="card text-sm text-muted">{t("profile.noGames")}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {view.titles.map((tt) => {
          const unlocked = tt.unlockedXbox + tt.unlockedSynced;
          const gs = tt.gamerscoreXbox + tt.gamerscoreSynced;
          const pct = tt.title.achievementCount ? (unlocked / tt.title.achievementCount) * 100 : 0;
          return (
            <Link key={tt.title.id} href={`/profile/${tt.title.id}`} className="card transition hover:border-xbox/60">
              <div className="flex items-center gap-3">
                <Artwork src={tt.title.iconUrl} name={tt.title.name} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{tt.title.name}</div>
                  <div className="text-xs text-muted">{t("profile.last", { date: formatDate(tt.lastActivityAt, locale) })}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>{t("profile.achievementsOf", { n: unlocked, total: tt.title.achievementCount })}</span>
                <span className="font-semibold text-xbox"><span aria-hidden>G</span> {gs} / {tt.title.totalGamerscore}</span>
              </div>
              <Progress value={pct} className="mt-2" />
              <div className="mt-2 flex gap-2 text-xs text-muted">
                {tt.unlockedXbox > 0 && <span className="badge bg-xbox/15 text-xbox">{tt.unlockedXbox} {t("source.xbox")}</span>}
                {tt.unlockedSynced > 0 && <span className="badge bg-ps/15 text-ps">{tt.unlockedSynced} {t("source.playstation")}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
