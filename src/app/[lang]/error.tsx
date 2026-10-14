"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { HomeIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import StatusPage from "@/components/status-page";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useT } from "@/i18n/provider";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage icon={TriangleAlertIcon} title={t("errors.failed.title")} text={t("errors.failed.text")}>
      <Button onClick={() => retry()}>
        <RotateCwIcon data-icon="inline-start" /> {t("common.actions.retry")}
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard">
          <HomeIcon data-icon="inline-start" /> {t("errors.home")}
        </Link>
      </Button>
      {error.digest && (
        <p className="w-full text-xs text-muted-foreground" dir="ltr">
          {t("errors.failed.reference", { digest: error.digest })}
        </p>
      )}
    </StatusPage>
  );
}
