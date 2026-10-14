"use client";

import { CompassIcon, HomeIcon } from "lucide-react";
import StatusPage from "@/components/status-page";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";

export default function NotFound() {
  const t = useT();
  return (
    <StatusPage icon={CompassIcon} code={t("errors.notFound.code")} title={t("errors.notFound.title")} text={t("errors.notFound.text")}>
      <Button asChild>
        <Link href="/dashboard">
          <HomeIcon data-icon="inline-start" /> {t("errors.home")}
        </Link>
      </Button>
    </StatusPage>
  );
}
