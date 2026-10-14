import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";

/** The space picker sits between sign-in and the dashboard: no sidebar, just the brand bar. */
export default async function SpacesLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5 font-bold">
          <span className="size-9 rounded-xl bg-primary" aria-hidden="true" />
          {t("common.appName")}
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 justify-center px-4 py-6 md:py-10">{children}</div>
    </main>
  );
}
