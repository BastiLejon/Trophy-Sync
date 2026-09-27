import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listSyncRuns } from "@/lib/sync";
import { getProfileView } from "@/lib/profile";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Alert, Artwork, PageHeader, Stat } from "@/components/ui";
import { unlinkPsnAction, unlinkXboxAction } from "@/app/actions/auth";
import type { SyncSummary } from "@/lib/sync";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const user = await currentUser();
  const params = await searchParams;
  const wantsLogin = params.login === "1";

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl">
        {wantsLogin && <div className="mb-6"><Alert>Bitte zuerst anmelden.</Alert></div>}
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Deine PlayStation-Trophäen als Xbox-Achievements.</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Melde dich mit beiden Konten an, um zu belegen, dass sie dir gehören. Trophy Sync liest deine
            PlayStation-Trophäen, ordnet sie den passenden Xbox-Achievements zu und zeigt dir dein
            zusammengeführtes Xbox-Profil inklusive Gamerscore.
          </p>
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountCard platform="ps" connected={false} />
          <AccountCard platform="xbox" connected={false} />
        </div>
        <ol className="mt-10 grid gap-4 text-sm text-muted sm:grid-cols-3">
          <li className="card"><b className="text-foreground">1. Konten verknüpfen</b><br />PlayStation und Xbox einloggen.</li>
          <li className="card"><b className="text-foreground">2. Sync starten</b><br />Trophäen werden über das Admin-Mapping auf Achievements abgebildet.</li>
          <li className="card"><b className="text-foreground">3. Profil ansehen</b><br />Dein Xbox-Profil inklusive symbolischem Gamerscore.</li>
        </ol>
      </div>
    );
  }

  const runs = listSyncRuns(user.userId);
  const lastRun = runs[0];
  const lastSummary = lastRun?.summary ? (JSON.parse(lastRun.summary) as SyncSummary) : null;
  const profile = user.xbox ? getProfileView(user.userId) : null;
  const ready = Boolean(user.psn && user.xbox);

  return (
    <div>
      <PageHeader
        title="Übersicht"
        subtitle="Verknüpfte Konten und Status der Synchronisierung."
        actions={
          ready ? (
            <Link href="/sync" className="btn-primary">Sync starten</Link>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <AccountCard
          platform="ps"
          connected={Boolean(user.psn)}
          name={user.psn?.onlineId}
          avatar={user.psn?.avatarUrl}
          detail={
            user.psn
              ? `Level ${user.psn.trophyLevel ?? "–"} · ${user.psn.earnedPlatinum} Platin · ${user.psn.earnedGold} Gold · ${user.psn.earnedSilver} Silber · ${user.psn.earnedBronze} Bronze`
              : undefined
          }
          isDemo={user.psn?.isDemo}
        />
        <AccountCard
          platform="xbox"
          connected={Boolean(user.xbox)}
          name={user.xbox?.gamertag}
          avatar={user.xbox?.gamerpicUrl}
          detail={user.xbox ? `Gamerscore ${formatNumber(user.xbox.gamerscore)} (Xbox Live)` : undefined}
          isDemo={user.xbox?.isDemo}
        />
      </div>

      {!ready && (
        <div className="mt-6">
          <Alert>Verknüpfe beide Konten, um die Synchronisierung zu starten.</Alert>
        </div>
      )}

      {ready && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Letzter Sync</h2>
          {lastRun && lastSummary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Zeitpunkt" value={formatDateTime(lastRun.finishedAt)} />
                <Stat label="Trophäen übertragen" value={formatNumber(lastSummary.trophies.synced + lastSummary.trophies.alreadySynced)} tone="xbox" hint={`davon neu: ${lastSummary.trophies.synced}`} />
                <Stat label="Symbolischer Gamerscore" value={`+${formatNumber(profile?.totals.gamerscoreSynced ?? 0)} G`} tone="xbox" />
                <Stat label="Nicht übertragbar / offen" value={formatNumber(lastSummary.trophies.noCounterpart + lastSummary.trophies.gameNoCounterpart + lastSummary.trophies.pending + lastSummary.trophies.gamePending)} tone="warning" />
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/sync/${lastRun.id}`} className="btn-ghost">Details ansehen</Link>
                <Link href="/profile" className="btn-xbox">Xbox-Profil öffnen</Link>
              </div>
            </>
          ) : (
            <div className="card text-sm text-muted">Noch kein Sync durchgeführt.</div>
          )}
        </section>
      )}
    </div>
  );
}

function AccountCard({
  platform,
  connected,
  name,
  avatar,
  detail,
  isDemo,
}: {
  platform: "ps" | "xbox";
  connected: boolean;
  name?: string;
  avatar?: string | null;
  detail?: string;
  isDemo?: boolean;
}) {
  const isPs = platform === "ps";
  return (
    <div className={`card border-t-4 ${isPs ? "border-t-ps" : "border-t-xbox"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{isPs ? "PlayStation Network" : "Xbox Live"}</div>
          {connected ? (
            <div className="mt-2 flex items-center gap-3">
              <Artwork src={avatar} name={name ?? "?"} size={44} rounded="rounded-full" />
              <div>
                <div className="font-semibold">{name}</div>
                <div className="text-xs text-muted">{detail}</div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {isPs ? "Beweise, dass dir das PlayStation-Konto gehört, und lies deine Trophäen aus." : "Beweise, dass dir das Xbox-Konto gehört, und lade deine Achievements."}
            </p>
          )}
        </div>
        {connected && isDemo && <span className="badge bg-warning/15 text-warning">Demo</span>}
      </div>
      <div className="mt-4 flex gap-2">
        {connected ? (
          <form action={isPs ? unlinkPsnAction : unlinkXboxAction}>
            <button className="btn-ghost">Verknüpfung lösen</button>
          </form>
        ) : (
          <Link href={isPs ? "/login/playstation" : "/login/xbox"} className={isPs ? "btn-ps" : "btn-xbox"}>
            {isPs ? "Mit PlayStation anmelden" : "Mit Xbox anmelden"}
          </Link>
        )}
      </div>
    </div>
  );
}
