import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/legal/site-footer";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";

/** Public pages anyone can open without signing in: privacy, terms, support, guides. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <BrandMark />
            {t("common.appName")}
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
