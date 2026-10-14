import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, defaultLocale, isLocale, matchLocale } from "@/i18n/config";

const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/**
 * 1. Every page lives under /ar or /en: un-prefixed URLs are redirected to the visitor's
 *    language (cookie → Accept-Language → Arabic).
 * 2. Lightweight route guard. Real auth is enforced by the API; this only redirects
 *    visitors without a session cookie away from the dashboard (and signed-in users
 *    away from the auth pages).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const [, first, ...rest] = pathname.split("/");

  if (!isLocale(first)) {
    const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookie) ? cookie : (matchLocale(req.headers.get("accept-language")) ?? defaultLocale);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = first;
  const path = `/${rest.join("/")}`;
  const hasSession = req.cookies.get("edu.session")?.value === "1";

  if ((path.startsWith("/dashboard") || path.startsWith("/spaces")) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(path) && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (req.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}

export const config = {
  // Everything except Next internals and files with an extension (favicon, images…).
  matcher: ["/((?!_next/|api/|.*\\.[^/]+$).*)"],
};
