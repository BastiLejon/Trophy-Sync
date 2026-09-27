import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export interface SessionData {
  userId?: number;
  isAdmin?: boolean;
  /** CSRF-State für den Xbox-OAuth-Flow. */
  xboxOAuthState?: string;
}

const sessionOptions: SessionOptions = {
  password: env.sessionSecret,
  cookieName: "trophy_sync_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
