export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

/** Remembers the last language the visitor used; read by the proxy for un-prefixed URLs. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export const dirOf = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");

/** BCP 47 tag for Intl formatting. Arabic keeps Latin digits, matching the rest of the UI. */
export const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-US");

/** Native names, shown in the language switcher. */
export const localeNames: Record<Locale, string> = { ar: "العربية", en: "English" };

/** Picks a supported locale from an Accept-Language header (q-values respected). */
export function matchLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...rest] = part.trim().split(";");
      const q = rest.find((p) => p.trim().startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.map((x) => x.lang).find(isLocale) ?? null;
}
