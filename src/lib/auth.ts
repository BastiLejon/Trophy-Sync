import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAccounts } from "@/lib/accounts";

export async function currentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  const accounts = getAccounts(session.userId);
  if (!accounts.psn && !accounts.xbox) return null;
  return { userId: session.userId, ...accounts, isAdmin: Boolean(session.isAdmin) };
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/?login=1");
  return user;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.isAdmin) redirect("/admin");
  return session;
}
