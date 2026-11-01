import type { Metadata } from "next";
import { BookOpenIcon, ShieldCheckIcon } from "lucide-react";
import { ContactCard } from "@/components/legal/legal-page";
import { Prose } from "@/components/legal/prose";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";

const GUIDES = [
  { key: "zoom", href: "/docs/zoom", icon: BookOpenIcon },
  { key: "privacy", href: "/privacy", icon: ShieldCheckIcon },
] as const;

const FAQ = ["zoomError", "reconnect", "deleteData"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("legal.support.title"), description: t("legal.support.description") };
}

export default async function SupportPage() {
  const { t } = await getI18n();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10 md:py-14">
      <header className="space-y-3 border-b pb-8">
        <h1 className="text-3xl font-bold md:text-4xl">{t("legal.support.title")}</h1>
        <p className="leading-7 text-foreground/85">{t("legal.support.intro")}</p>
      </header>

      <ContactCard />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("legal.support.include.title")}</h2>
        <Prose text={t("legal.support.include.body")} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("legal.support.guides.title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <Link key={g.key} href={g.href} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft transition-colors hover:border-primary">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <g.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="font-medium">{t(`legal.support.guides.${g.key}`)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("legal.support.faq.title")}</h2>
        <div className="divide-y rounded-2xl border bg-card shadow-soft">
          {FAQ.map((k) => (
            <details key={k} className="group p-4">
              <summary className="cursor-pointer font-medium marker:text-muted-foreground">{t(`legal.support.faq.${k}.q`)}</summary>
              <p className="mt-2 leading-7 text-foreground/85">{t(`legal.support.faq.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
