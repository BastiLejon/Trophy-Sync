import type { Locale } from "@/lib/i18n";

const intl = (locale: Locale) => (locale === "de" ? "de-DE" : "en-GB");

export function formatDate(iso: string | null | undefined, locale: Locale = "en"): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString(intl(locale), { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined, locale: Locale = "en"): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleString(intl(locale), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatNumber(n: number, locale: Locale = "en"): string {
  return n.toLocaleString(intl(locale));
}

export function percent(score: number | null | undefined): string {
  return score == null ? "–" : `${Math.round(score * 100)} %`;
}
