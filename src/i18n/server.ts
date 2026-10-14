import { lang } from "next/root-params";
import { defaultLocale, isLocale, type Locale } from "./config";
import { createTranslator } from "./translate";
import { getMessages, type MessageKey } from "./messages";

/** Locale of the current request, from the `[lang]` root segment (Server Components only). */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : defaultLocale;
}

/** `t` / `rich` for Server Components. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, ...createTranslator<MessageKey>(locale, await getMessages(locale)) };
}
