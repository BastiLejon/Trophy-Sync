import Link from "next/link";
import { env, xboxOAuthConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { loginDemoXbox } from "@/app/actions/auth";
import { Alert, PageHeader } from "@/components/ui";

export default async function XboxLoginPage({ searchParams }: PageProps<"/login/xbox">) {
  const [{ t }, params] = await Promise.all([getT(), searchParams]);
  const error = typeof params.error === "string" ? params.error : null;
  const configured = xboxOAuthConfigured();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("xboxLogin.title")} subtitle={t("xboxLogin.subtitle")} />
      {error && (
        <div className="mb-4">
          <Alert tone="error">
            {error === "not_configured"
              ? t("xboxLogin.error.notConfigured")
              : error === "state_mismatch"
                ? t("xboxLogin.error.state")
                : t("xboxLogin.error.failed", { message: error })}
          </Alert>
        </div>
      )}
      <div className="card border-t-4 border-t-xbox">
        <h2 className="font-semibold">{t("xboxLogin.msAccount")}</h2>
        <p className="mt-2 text-sm text-muted">{t("xboxLogin.explain", { scope: "XboxLive.signin" })}</p>
        <div className="mt-4">
          {configured ? (
            <a href="/api/auth/xbox/start" className="btn-xbox">{t("xboxLogin.button")}</a>
          ) : (
            <button className="btn-xbox" disabled>{t("xboxLogin.button")}</button>
          )}
        </div>
        {!configured && <p className="mt-3 text-xs text-muted">{t("xboxLogin.notConfigured")}</p>}
      </div>

      {env.demoMode && (
        <div className="card mt-4">
          <h2 className="font-semibold">{t("xboxLogin.demo.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("xboxLogin.demo.text")}</p>
          <form action={loginDemoXbox} className="mt-3">
            <button className="btn-ghost">{t("xboxLogin.demo.button")}</button>
          </form>
        </div>
      )}
      <div className="mt-6 text-sm">
        <Link href="/" className="text-muted hover:text-foreground">← {t("common.back")}</Link>
      </div>
    </div>
  );
}
