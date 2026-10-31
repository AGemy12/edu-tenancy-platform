"use client";

import { createContext, useContext, useMemo } from "react";
import { dirOf, intlLocale, type Locale } from "./config";
import { createTranslator } from "./translate";
import type { Dictionary, MessageKey } from "./messages";

type DateInput = string | number | Date;

function createFormatters(locale: Locale) {
  const tag = intlLocale(locale);
  const fmt = (opts: Intl.DateTimeFormatOptions) => {
    const f = new Intl.DateTimeFormat(tag, opts);
    return (value: DateInput) => f.format(new Date(value));
  };
  const numberFmt = new Intl.NumberFormat(tag);
  const percentFmt = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 1 });
  const compactFmt = new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 });
  const listFmt = new Intl.ListFormat(tag, { type: "conjunction" });
  const relativeFmt = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  const shortDate = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" });
  const weekdayFmts = {
    long: new Intl.DateTimeFormat(tag, { weekday: "long", timeZone: "UTC" }),
    short: new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" }),
    narrow: new Intl.DateTimeFormat(tag, { weekday: "narrow", timeZone: "UTC" }),
  };
  const range = (opts: Intl.DateTimeFormatOptions) => {
    const f = new Intl.DateTimeFormat(tag, opts);
    return (from: DateInput, to: DateInput) => f.formatRange(new Date(from), new Date(to));
  };
  const moneyFmts = new Map<string, Intl.NumberFormat>();
  const moneyFmt = (currency: string, signed: boolean) => {
    const key = signed ? `${currency}±` : currency;
    let f = moneyFmts.get(key);
    if (!f) {
      f = new Intl.NumberFormat(tag, { style: "currency", currency, maximumFractionDigits: 2, signDisplay: signed ? "exceptZero" : "auto" });
      moneyFmts.set(key, f);
    }
    return f;
  };
  return {
    /** 12 Oct 2026 */
    date: fmt({ day: "numeric", month: "short", year: "numeric" }),
    /** 12 October 2026 */
    longDate: fmt({ dateStyle: "long" }),
    /** Mon, 12 Oct, 5:30 PM */
    dateTime: fmt({ weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    /** 12 October 2026 at 5:30 PM */
    longDateTime: fmt({ dateStyle: "long", timeStyle: "short" }),
    time: fmt({ hour: "numeric", minute: "2-digit" }),
    /** "1 November 2026" for a calendar day from the API ("2026-11-01"), whatever the viewer's zone. */
    dayUtc: fmt({ day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    /** October 2026 */
    month: fmt({ month: "long", year: "numeric" }),
    /** "Oct 26"; a UTC month such as "2026-10" from the API. */
    monthShort: fmt({ month: "short", year: "2-digit", timeZone: "UTC" }),
    /** "October 2026"; a UTC month such as "2026-10" from the API. */
    monthUtc: fmt({ month: "long", year: "numeric", timeZone: "UTC" }),
    number: (n: number) => numberFmt.format(n),
    /** 0.125 → 12.5% */
    percent: (n: number) => percentFmt.format(n),
    /** 12,500 → 12.5K, for chart axes. */
    compact: (n: number) => compactFmt.format(n),
    /** 1,250.50 EGP in the locale's currency style; `currency` is an ISO 4217 code. `signed` shows + or − (not on zero). */
    money: (n: number, currency: string, signed = false) => moneyFmt(currency, signed).format(n),
    /** 0 = Sunday … 6 = Saturday → the day's name (1 Jan 2023 was a Sunday). */
    weekday: (day: number, style: keyof typeof weekdayFmts = "long") => weekdayFmts[style].format(Date.UTC(2023, 0, 1 + day)),
    /** 5 PM */
    hour: fmt({ hour: "numeric" }),
    /** Monday 12 October */
    dayLong: fmt({ weekday: "long", day: "numeric", month: "long" }),
    /** 1 – 7 Nov 2026, sharing what both ends have in common. */
    dateRange: range({ day: "numeric", month: "short", year: "numeric" }),
    /** 5:00 – 6:00 PM */
    timeRange: range({ hour: "numeric", minute: "2-digit" }),
    /** "a, b and c" with the locale's separators. */
    list: (items: string[]) => listFmt.format(items),
    /** "now", "5 minutes ago", "yesterday"; past a week, the date. */
    relative: (value: DateInput, now = Date.now()) => {
      const seconds = (new Date(value).getTime() - now) / 1000;
      const abs = Math.abs(seconds);
      if (abs < 45) return relativeFmt.format(0, "second");
      if (abs < 3_600) return relativeFmt.format(Math.round(seconds / 60), "minute");
      if (abs < 86_400) return relativeFmt.format(Math.round(seconds / 3_600), "hour");
      if (abs < 7 * 86_400) return relativeFmt.format(Math.round(seconds / 86_400), "day");
      return shortDate.format(new Date(value));
    },
  };
}

export type I18n = ReturnType<typeof createTranslator<MessageKey>> & {
  locale: Locale;
  dir: "rtl" | "ltr";
  format: ReturnType<typeof createFormatters>;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Dictionary; children: React.ReactNode }) {
  const value = useMemo<I18n>(
    () => ({ ...createTranslator<MessageKey>(locale, messages), locale, dir: dirOf(locale), format: createFormatters(locale) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Locale, direction, `t`, `rich` and date/number formatters for the current page. */
export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export const useT = () => useI18n().t;
export const useLocale = () => useI18n().locale;
