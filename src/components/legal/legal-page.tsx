import { MailIcon } from "lucide-react";
import { intlLocale } from "@/i18n/config";
import { getMessages, type MessageKey } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";
import { SITE } from "@/lib/site";
import { Prose } from "./prose";

type Doc = "privacy" | "terms" | "zoomGuide";

/** A long public document (privacy policy, terms, Zoom guide): title, contents, sections, contact. */
export async function LegalPage({ doc }: { doc: Doc }) {
  const { t, locale } = await getI18n();
  // Sections render in dictionary order, so adding one to `legal.<doc>.sections` is enough.
  const ids = Object.keys((await getMessages(locale)).legal[doc].sections);
  const key = (path: string) => `legal.${doc}.${path}` as MessageKey;
  const params = { owner: SITE.owner, email: SITE.email };
  const updated = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: "UTC" }).format(new Date(SITE.updated));

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <header className="space-y-3 border-b pb-8">
        <h1 className="text-3xl font-bold md:text-4xl">{t(key("title"))}</h1>
        <p className="text-sm text-muted-foreground">{t("legal.updated", { date: updated })}</p>
        <p className="leading-7 text-foreground/85">{t(key("intro"), params)}</p>
      </header>

      <nav aria-labelledby="contents" className="my-8 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 id="contents" className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("legal.contents")}
        </h2>
        <ol className="grid list-decimal gap-x-8 gap-y-1.5 ps-5 text-sm sm:grid-cols-2">
          {ids.map((id) => (
            <li key={id}>
              <a href={`#${id}`} className="text-primary hover:underline">
                {t(key(`sections.${id}.title`))}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {ids.map((id) => (
          <section key={id} id={id} className="scroll-mt-6 space-y-3">
            <h2 className="text-xl font-semibold">{t(key(`sections.${id}.title`))}</h2>
            <Prose text={t(key(`sections.${id}.body`), params)} />
          </section>
        ))}
        <ContactCard />
      </div>
    </article>
  );
}

/** The support email, as a mailto link. */
export async function ContactCard() {
  const { t } = await getI18n();
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="text-xl font-semibold">{t("legal.contact.title")}</h2>
      <p className="text-foreground/85">{t("legal.contact.text")}</p>
      <a href={`mailto:${SITE.email}`} dir="ltr" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
        <MailIcon className="size-4" aria-hidden="true" />
        {SITE.email}
      </a>
    </section>
  );
}
