import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listSyncRuns } from "@/lib/sync";
import { getProfileView } from "@/lib/profile";
import { getPairingForUser } from "@/lib/accounts";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n";
import { Alert, Artwork, PageHeader, Stat } from "@/components/ui";
import { unlinkPsnAction, unlinkXboxAction } from "@/app/actions/auth";
import type { SyncSummary } from "@/lib/sync";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [user, { t, locale }, params] = await Promise.all([currentUser(), getT(), searchParams]);
  const wantsLogin = params.login === "1";
  const error = typeof params.error === "string" ? params.error : null;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl">
        {wantsLogin && <div className="mb-6"><Alert>{t("common.loginRequired")}</Alert></div>}
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">{t("home.hero.title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">{t("home.hero.text")}</p>
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountCard t={t} platform="ps" connected={false} />
          <AccountCard t={t} platform="xbox" connected={false} />
        </div>
        <ol className="mt-10 grid gap-4 text-sm text-muted sm:grid-cols-3">
          <li className="card"><b className="text-foreground">{t("home.step1.title")}</b><br />{t("home.step1.text")}</li>
          <li className="card"><b className="text-foreground">{t("home.step2.title")}</b><br />{t("home.step2.text")}</li>
          <li className="card"><b className="text-foreground">{t("home.step3.title")}</b><br />{t("home.step3.text")}</li>
        </ol>
      </div>
    );
  }

  const runs = listSyncRuns(user.userId);
  const lastRun = runs[0];
  const lastSummary = lastRun?.summary ? (JSON.parse(lastRun.summary) as SyncSummary) : null;
  const profile = user.xbox ? getProfileView(user.userId) : null;
  const ready = Boolean(user.psn && user.xbox);
  const pairing = getPairingForUser(user.userId);

  return (
    <div>
      <PageHeader
        title={t("home.title")}
        subtitle={t("home.subtitle")}
        actions={ready ? <Link href="/sync" className="btn-primary">{t("home.startSync")}</Link> : null}
      />
      {error === "unlink_locked" && <div className="mb-4"><Alert tone="error">{t("home.error.unlinkLocked")}</Alert></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <AccountCard
          t={t}
          platform="ps"
          connected={Boolean(user.psn)}
          name={user.psn?.onlineId}
          avatar={user.psn?.avatarUrl}
          detail={
            user.psn
              ? t("home.psn.detail", {
                  level: user.psn.trophyLevel ?? "–",
                  platinum: user.psn.earnedPlatinum,
                  gold: user.psn.earnedGold,
                  silver: user.psn.earnedSilver,
                  bronze: user.psn.earnedBronze,
                })
              : undefined
          }
          isDemo={user.psn?.isDemo}
          locked={Boolean(pairing)}
          pairedWith={pairing?.gamertag}
        />
        <AccountCard
          t={t}
          platform="xbox"
          connected={Boolean(user.xbox)}
          name={user.xbox?.gamertag}
          avatar={user.xbox?.gamerpicUrl}
          detail={user.xbox ? t("home.xbox.detail", { score: formatNumber(user.xbox.gamerscore, locale) }) : undefined}
          isDemo={user.xbox?.isDemo}
          locked={Boolean(pairing)}
          pairedWith={pairing?.psnOnlineId}
        />
      </div>

      {!ready && (
        <div className="mt-6">
          <Alert>{t("home.linkBoth")}</Alert>
        </div>
      )}

      {ready && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{t("home.lastSync")}</h2>
          {lastRun && lastSummary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label={t("home.stat.time")} value={formatDateTime(lastRun.finishedAt, locale)} />
                <Stat
                  label={t("home.stat.transferred")}
                  value={formatNumber(lastSummary.trophies.synced + lastSummary.trophies.alreadySynced, locale)}
                  tone="xbox"
                  hint={t("home.stat.transferredHint", { n: lastSummary.trophies.synced })}
                />
                <Stat label={t("home.stat.syncedScore")} value={`+${formatNumber(profile?.totals.gamerscoreSynced ?? 0, locale)} G`} tone="xbox" />
                <Stat
                  label={t("home.stat.open")}
                  value={formatNumber(
                    lastSummary.trophies.noCounterpart + lastSummary.trophies.gameNoCounterpart + lastSummary.trophies.pending + lastSummary.trophies.gamePending,
                    locale,
                  )}
                  tone="warning"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/sync/${lastRun.id}`} className="btn-ghost">{t("home.viewDetails")}</Link>
                <Link href="/profile" className="btn-xbox">{t("home.openProfile")}</Link>
              </div>
            </>
          ) : (
            <div className="card text-sm text-muted">{t("home.noSync")}</div>
          )}
        </section>
      )}
    </div>
  );
}

function AccountCard({
  t,
  platform,
  connected,
  name,
  avatar,
  detail,
  isDemo,
  locked,
  pairedWith,
}: {
  t: Translator;
  platform: "ps" | "xbox";
  connected: boolean;
  name?: string;
  avatar?: string | null;
  detail?: string;
  isDemo?: boolean;
  locked?: boolean;
  pairedWith?: string;
}) {
  const isPs = platform === "ps";
  return (
    <div className={`card border-t-4 ${isPs ? "border-t-ps" : "border-t-xbox"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{isPs ? t("home.psn.label") : t("home.xbox.label")}</div>
          {connected ? (
            <div className="mt-2 flex items-center gap-3">
              <Artwork src={avatar} name={name ?? "?"} size={44} rounded="rounded-full" />
              <div>
                <div className="font-semibold">{name}</div>
                <div className="text-xs text-muted">{detail}</div>
                {pairedWith && <div className="text-xs text-muted">{t("home.pairedWith", { name: pairedWith })}</div>}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{isPs ? t("home.psn.text") : t("home.xbox.text")}</p>
          )}
        </div>
        {connected && isDemo && <span className="badge bg-warning/15 text-warning">{t("home.demo")}</span>}
      </div>
      <div className="mt-4 flex gap-2">
        {connected ? (
          locked ? (
            <span className="badge bg-surface-2 text-muted" title={t("home.error.unlinkLocked")}>🔒 {t("home.unlinkLocked")}</span>
          ) : (
            <form action={isPs ? unlinkPsnAction : unlinkXboxAction}>
              <button className="btn-ghost">{t("home.unlink")}</button>
            </form>
          )
        ) : (
          <Link href={isPs ? "/login/playstation" : "/login/xbox"} className={isPs ? "btn-ps" : "btn-xbox"}>
            {isPs ? t("home.loginPs") : t("home.loginXbox")}
          </Link>
        )}
      </div>
    </div>
  );
}
