"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { DirectionProvider } from "@/components/ui/direction";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { dirOf, type Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";
import type { Dictionary } from "@/i18n/messages";

export function Providers({ locale, messages, children }: { locale: Locale; messages: Dictionary; children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  const dir = dirOf(locale);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} messages={messages}>
        <DirectionProvider dir={dir}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>{children}</TooltipProvider>
            {/* Toasts sit on the inline-end side; the upload panel uses the start side. */}
            <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} richColors closeButton dir={dir} />
          </QueryClientProvider>
        </DirectionProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
