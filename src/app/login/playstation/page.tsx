import Link from "next/link";
import { env } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { loginDemoPsn } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui";
import { NpssoForm } from "./npsso-form";

const NPSSO_URL = "https://ca.account.sony.com/api/v1/ssocookie";

/** Ersetzt {link}/{code}-Platzhalter durch React-Elemente. */
function withSlots(template: string, slots: Record<string, React.ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    return m && m[1] in slots ? <span key={i}>{slots[m[1]]}</span> : <span key={i}>{part}</span>;
  });
}

export default async function PlaystationLoginPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("psLogin.title")} subtitle={t("psLogin.subtitle")} />

      <div className="card border-t-4 border-t-ps">
        <h2 className="font-semibold">{t("psLogin.how")}</h2>
        <p className="mt-2 text-sm text-muted">{t("psLogin.explain")}</p>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="badge bg-ps/15 text-ps">1</span>
            <span>
              {withSlots(t("psLogin.step1"), {
                link: (
                  <a href="https://www.playstation.com/" target="_blank" rel="noreferrer" className="text-ps underline">
                    playstation.com
                  </a>
                ),
              })}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="badge bg-ps/15 text-ps">2</span>
            <span>
              {withSlots(t("psLogin.step2"), {
                link: (
                  <a href={NPSSO_URL} target="_blank" rel="noreferrer" className="break-all text-ps underline">
                    {NPSSO_URL}
                  </a>
                ),
                code: <code className="rounded bg-surface-2 px-1">{'{ "npsso": "…" }'}</code>,
              })}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="badge bg-ps/15 text-ps">3</span>
            <span>{t("psLogin.step3")}</span>
          </li>
        </ol>
        <div className="mt-5">
          <NpssoForm labels={{ label: t("psLogin.tokenLabel"), placeholder: t("psLogin.tokenPlaceholder"), submit: t("psLogin.submit"), submitting: t("psLogin.submitting") }} />
        </div>
        <p className="mt-3 text-xs text-muted">{t("psLogin.privacy")}</p>
      </div>

      {env.demoMode && (
        <div className="card mt-4">
          <h2 className="font-semibold">{t("psLogin.demo.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("psLogin.demo.text")}</p>
          <form action={loginDemoPsn} className="mt-3">
            <button className="btn-ghost">{t("psLogin.demo.button")}</button>
          </form>
        </div>
      )}
      <div className="mt-6 text-sm">
        <Link href="/" className="text-muted hover:text-foreground">← {t("common.back")}</Link>
      </div>
    </div>
  );
}
