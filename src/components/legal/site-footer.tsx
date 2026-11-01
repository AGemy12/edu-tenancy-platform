import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";
import { SITE } from "@/lib/site";

const LINKS = [
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
  { key: "support", href: "/support" },
  { key: "zoomGuide", href: "/docs/zoom" },
] as const;

/** Public footer: links to the legal and support pages (Zoom's review needs them reachable). */
export async function SiteFooter() {
  const { t, rich } = await getI18n();

  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.key} href={l.href} className="hover:text-foreground hover:underline">
              {t(`legal.footer.${l.key}`)}
            </Link>
          ))}
        </nav>
        <p>{rich("legal.footer.rights", { owner: <bdi>{SITE.owner}</bdi> })}</p>
      </div>
    </footer>
  );
}
