"use client";

import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/provider";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("common.theme.toggle")}>
          <SunIcon className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <SunIcon /> {t("common.theme.light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <MoonIcon /> {t("common.theme.dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <MonitorIcon /> {t("common.theme.system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
