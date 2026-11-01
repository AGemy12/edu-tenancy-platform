import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("legal.zoomGuide.title"), description: t("legal.zoomGuide.description") };
}

/** Zoom Marketplace "Documentation URL": how to add, use and remove the app. */
export default function ZoomGuidePage() {
  return <LegalPage doc="zoomGuide" />;
}
