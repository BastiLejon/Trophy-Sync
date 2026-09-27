import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { db, schema } from "@/lib/db";
import { adminLogout } from "@/app/actions/auth";
import { PageHeader, Stat } from "@/components/ui";
import { AdminLoginForm } from "./login-form";

export default async function AdminPage() {
  const [session, { t }] = await Promise.all([getSession(), getT()]);
  if (!session.isAdmin) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle.login")} />
        <div className="card">
          <AdminLoginForm labels={{ password: t("admin.password"), hint: t("admin.passwordHint"), submit: t("admin.login"), submitting: t("admin.loggingIn") }} />
        </div>
      </div>
    );
  }
  const { gameMappings, trophyMappings, psGames, xboxTitles, accountPairings } = schema;
  const c = (q: { get(): { n: number } | undefined }) => q.get()?.n ?? 0;
  const gamesPending = c(db.select({ n: count() }).from(gameMappings).where(eq(gameMappings.status, "pending")));
  const gamesMapped = c(db.select({ n: count() }).from(gameMappings).where(eq(gameMappings.status, "mapped")));
  const trophiesPending = c(db.select({ n: count() }).from(trophyMappings).where(eq(trophyMappings.status, "pending")));
  const psGameCount = c(db.select({ n: count() }).from(psGames));
  const xboxTitleCount = c(db.select({ n: count() }).from(xboxTitles));
  const pairingCount = c(db.select({ n: count() }).from(accountPairings));
  return (
    <div>
      <PageHeader
        title={t("admin.title")}
        subtitle={t("admin.subtitle")}
        actions={
          <form action={adminLogout}>
            <button className="btn-ghost">{t("admin.logout")}</button>
          </form>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={t("admin.stat.gamesPending")} value={gamesPending} tone={gamesPending ? "warning" : "xbox"} />
        <Stat label={t("admin.stat.trophiesPending")} value={trophiesPending} tone={trophiesPending ? "warning" : "xbox"} hint={t("admin.stat.trophiesPendingHint")} />
        <Stat label={t("admin.stat.gamesMapped")} value={`${gamesMapped} / ${psGameCount}`} />
        <Stat label={t("admin.stat.xboxTitles")} value={xboxTitleCount} />
        <Stat label={t("admin.stat.pairings")} value={pairingCount} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/games" className="btn-primary">{t("admin.goGames")}</Link>
        <Link href="/admin/catalog" className="btn-ghost">{t("admin.goCatalog")}</Link>
        <Link href="/admin/pairings" className="btn-ghost">{t("admin.goPairings")}</Link>
      </div>
      <div className="card mt-8 text-sm text-muted">{t("admin.howto")}</div>
    </div>
  );
}
