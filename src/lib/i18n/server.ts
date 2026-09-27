import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, makeTranslator, type Locale, type Translator } from "./index";

export const LOCALE_COOKIE = "locale";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT(): Promise<{ t: Translator; locale: Locale }> {
  const locale = await getLocale();
  return { t: makeTranslator(locale), locale };
}
