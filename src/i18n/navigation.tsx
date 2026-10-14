"use client";

import { useMemo } from "react";
import NextLink from "next/link";
import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { useLocale } from "./provider";

/**
 * Locale-aware drop-ins for next/link and next/navigation. App code works with
 * locale-less paths ("/dashboard/library"); these add or strip the "/ar" | "/en" prefix.
 */

export function localizePath(locale: Locale, path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path; // relative, query-only or external
  const first = path.split(/[/?#]/)[1];
  if (isLocale(first)) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

export function stripLocale(pathname: string) {
  const [, first, ...rest] = pathname.split("/");
  return isLocale(first) ? `/${rest.join("/")}` : pathname;
}

type LinkProps = React.ComponentProps<typeof NextLink>;

export function Link({ href, ...props }: LinkProps) {
  const locale = useLocale();
  const localized =
    typeof href === "string" ? localizePath(locale, href) : { ...href, pathname: href.pathname ? localizePath(locale, href.pathname) : href.pathname };
  return <NextLink href={localized} {...props} />;
}

export function useRouter() {
  const router = useNextRouter();
  const locale = useLocale();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localizePath(locale, href), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(localizePath(locale, href), options),
      prefetch: (href: string) => router.prefetch(localizePath(locale, href)),
    }),
    [router, locale],
  );
}

/** Current path without the locale prefix. */
export function usePathname() {
  return stripLocale(useNextPathname());
}

/**
 * Switches language on the current page. Each locale has its own root layout
 * (lang/dir on <html>), so this is a full navigation rather than a client transition.
 */
export function switchLocale(target: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  const { pathname, search, hash } = window.location;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load is intended: <html lang/dir> comes from the root layout
  window.location.assign(`/${target}${stripLocale(pathname) === "/" ? "" : stripLocale(pathname)}${search}${hash}`);
}
