"use client";

import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { localeNames } from "@/i18n/config";
import { switchLocale } from "@/i18n/navigation";
import { useI18n } from "@/i18n/provider";

/** One-click toggle between Arabic and English, labelled in the other language's own script. */
export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const target = locale === "ar" ? "en" : "ar";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" className="h-10 gap-1.5 px-3.5" onClick={() => switchLocale(target)} aria-label={t("common.language.switchTo")}>
          <LanguagesIcon className="size-4" />
          <span lang={target} className="text-sm">
            {target === "en" ? "EN" : localeNames.ar}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("common.language.switchTo")}</TooltipContent>
    </Tooltip>
  );
}
