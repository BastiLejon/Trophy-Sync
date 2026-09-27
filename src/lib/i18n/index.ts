import { DEFAULT_LOCALE, LOCALES, messages, type Locale, type MessageKey } from "./messages";

export type { Locale, MessageKey };
export { LOCALES, DEFAULT_LOCALE };

export type Vars = Record<string, string | number>;
export type Translator = (key: MessageKey, vars?: Vars) => string;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const template = messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

export function makeTranslator(locale: Locale): Translator {
  return (key, vars) => translate(locale, key, vars);
}
