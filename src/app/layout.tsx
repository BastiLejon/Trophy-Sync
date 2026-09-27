import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Trophy Sync",
  description: "PlayStation-Trophäen symbolisch als Xbox-Achievements spiegeln.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <html lang="de" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border bg-surface/60 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span className="inline-block h-3 w-3 rounded-full bg-ps" />
              <span className="inline-block h-3 w-3 rounded-full bg-xbox" />
              Trophy Sync
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <Link href="/" className="hover:text-foreground">Übersicht</Link>
              {user && (
                <>
                  <Link href="/sync" className="hover:text-foreground">Sync</Link>
                  <Link href="/profile" className="hover:text-foreground">Xbox-Profil</Link>
                </>
              )}
              <Link href="/admin" className="hover:text-foreground">Admin</Link>
            </nav>
            <div className="ml-auto flex items-center gap-3 text-sm">
              {env.demoMode && <span className="badge bg-warning/15 text-warning">Demo-Modus</span>}
              {user ? (
                <>
                  <span className="hidden text-muted sm:inline">
                    {user.psn ? <span className="text-ps">{user.psn.onlineId}</span> : null}
                    {user.psn && user.xbox ? " · " : null}
                    {user.xbox ? <span className="text-xbox">{user.xbox.gamertag}</span> : null}
                  </span>
                  <form action={logout}>
                    <button className="btn-ghost px-3 py-1">Abmelden</button>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted">
          Trophy Sync ist ein inoffizielles Fan-Projekt. Übertragene Achievements sind symbolisch und
          erscheinen nicht im echten Xbox-Profil.
        </footer>
      </body>
    </html>
  );
}
