import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { adminLogout } from "@/app/actions/auth";
import { PageHeader, Stat } from "@/components/ui";
import { AdminLoginForm } from "./login-form";

export default async function AdminPage() {
  const session = await getSession();
  if (!session.isAdmin) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Admin" subtitle="Mapping zwischen PlayStation-Spielen/Trophäen und Xbox-Titeln/Achievements pflegen." />
        <div className="card">
          <AdminLoginForm />
        </div>
      </div>
    );
  }
  const { gameMappings, trophyMappings, psGames, xboxTitles, users } = schema;
  const c = (q: { get(): { n: number } | undefined }) => q.get()?.n ?? 0;
  const gamesPending = c(db.select({ n: count() }).from(gameMappings).where(eq(gameMappings.status, "pending")));
  const gamesMapped = c(db.select({ n: count() }).from(gameMappings).where(eq(gameMappings.status, "mapped")));
  const trophiesPending = c(db.select({ n: count() }).from(trophyMappings).where(eq(trophyMappings.status, "pending")));
  const psGameCount = c(db.select({ n: count() }).from(psGames));
  const xboxTitleCount = c(db.select({ n: count() }).from(xboxTitles));
  const userCount = c(db.select({ n: count() }).from(users));
  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Das Mapping wird einmalig gepflegt und gilt für alle Nutzer."
        actions={
          <form action={adminLogout}>
            <button className="btn-ghost">Admin abmelden</button>
          </form>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Spiele warten auf Entscheidung" value={gamesPending} tone={gamesPending ? "warning" : "xbox"} />
        <Stat label="Trophäen warten auf Entscheidung" value={trophiesPending} tone={trophiesPending ? "warning" : "xbox"} hint="in bereits gemappten Spielen" />
        <Stat label="Spiele gemappt" value={`${gamesMapped} / ${psGameCount}`} />
        <Stat label="Xbox-Titel im Katalog" value={xboxTitleCount} />
        <Stat label="Registrierte Nutzer" value={userCount} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/games" className="btn-primary">Spiel-Mappings bearbeiten</Link>
        <Link href="/admin/catalog" className="btn-ghost">Xbox-Katalog verwalten</Link>
      </div>
      <div className="card mt-8 text-sm text-muted">
        <b className="text-foreground">Ablauf:</b> Neue PlayStation-Spiele tauchen automatisch auf, sobald ein Nutzer synchronisiert.
        Für jedes Spiel wird ein Xbox-Titel vorgeschlagen (Namensähnlichkeit). Nach deiner Entscheidung werden die
        Trophäen des Spiels mit den Achievements abgeglichen; sehr sichere Treffer werden automatisch übernommen,
        der Rest wartet auf deine Bestätigung. Platin-Trophäen haben auf Xbox kein Gegenstück und werden automatisch
        entsprechend markiert.
      </div>
    </div>
  );
}
