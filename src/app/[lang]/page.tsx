import { BookOpenIcon, CalendarCheckIcon, GraduationCapIcon, VideoIcon } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";

const FEATURES = [
  { key: "students", icon: GraduationCapIcon },
  { key: "sessions", icon: VideoIcon },
  { key: "exams", icon: BookOpenIcon },
  { key: "reports", icon: CalendarCheckIcon },
] as const;

export default async function Home() {
  const { t } = await getI18n();

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-bold">{t("common.appName")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link href="/login">{t("landing.header.signIn")}</Link>
          </Button>
          <Button asChild>
            <Link href="/register">{t("landing.header.startFree")}</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-8 px-4 py-16 text-center md:py-24">
        <span className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
          {t("landing.hero.badge")}
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">{t("landing.hero.title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("landing.hero.text")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">{t("landing.hero.createCenter")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">{t("landing.hero.haveAccount")}</Link>
          </Button>
        </div>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.key} className="rounded-2xl border bg-card p-5 text-start shadow-soft">
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <f.icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{t(`landing.features.${f.key}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`landing.features.${f.key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
