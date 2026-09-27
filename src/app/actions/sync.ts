"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PairingConflictError } from "@/lib/accounts";
import { runSync } from "@/lib/sync";

export type SyncActionState = { error?: string } | undefined;

export async function startSync(): Promise<SyncActionState> {
  const { t } = await getT();
  const user = await requireUser();
  if (!user.psn || !user.xbox) return { error: t("sync.error.needBoth") };
  let runId: number;
  try {
    ({ runId } = await runSync(user.userId));
  } catch (err) {
    if (err instanceof PairingConflictError) {
      return { error: t(err.kind === "psnTaken" ? "pairing.error.psnTaken" : "pairing.error.xboxTaken", { psn: err.psnOnlineId, xbox: err.gamertag }) };
    }
    return { error: t("sync.error.failed", { message: err instanceof Error ? err.message : String(err) }) };
  }
  redirect(`/sync/${runId}`);
}
