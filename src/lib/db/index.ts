import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Eine Datenbankverbindung pro Prozess. In der Next.js-Dev-Umgebung wird das Modul
 * bei Hot-Reloads mehrfach geladen, daher wird die Instanz global gecacht.
 */
type Db = ReturnType<typeof createDb>;

function createDb() {
  const file =
    env.databasePath === ":memory:" ? ":memory:" : path.resolve(process.cwd(), env.databasePath);
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}

const globalForDb = globalThis as unknown as { __trophySyncDb?: Db };

export const db: Db = globalForDb.__trophySyncDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__trophySyncDb = db;

export { schema };
export const nowIso = () => new Date().toISOString();
export type { SyncItemResult, MappingStatus, AchievementSource } from "./schema";
