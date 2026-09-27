import { setLocale } from "@/app/actions/locale";
import { LOCALES, type Locale } from "@/lib/i18n";

const LABELS: Record<Locale, string> = { en: "EN", de: "DE" };

export function LanguageSwitch({ current, label }: { current: Locale; label: string }) {
  return (
    <form action={setLocale} className="flex items-center gap-1" aria-label={label}>
      {LOCALES.map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          className={`rounded px-2 py-0.5 text-xs font-semibold ${l === current ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}
          aria-pressed={l === current}
        >
          {LABELS[l]}
        </button>
      ))}
    </form>
  );
}
