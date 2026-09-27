"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { runSync } from "@/lib/sync";

export type SyncActionState = { error?: string } | undefined;

export async function startSync(): Promise<SyncActionState> {
  const user = await requireUser();
  if (!user.psn || !user.xbox) return { error: "Bitte zuerst beide Konten verknüpfen." };
  let runId: number;
  try {
    ({ runId } = await runSync(user.userId));
  } catch (err) {
    return { error: `Sync fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` };
  }
  redirect(`/sync/${runId}`);
}
