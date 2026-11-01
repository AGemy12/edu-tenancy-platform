import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("legal.terms.title"), description: t("legal.terms.description") };
}

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
