import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import { Providers } from "@/components/providers";
import { dirOf, isLocale, locales } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

const fontSans = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

// Both languages are prerendered; anything else 404s (the proxy redirects un-prefixed URLs).
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t("common.appName"), template: `%s · ${t("common.appName")}` },
    description: t("common.appTagline"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  const messages = await getMessages(locale);

  return (
    <html lang={locale} dir={dirOf(locale)} suppressHydrationWarning className={cn("h-full antialiased", fontSans.variable)}>
      <body className="flex min-h-full flex-col">
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
