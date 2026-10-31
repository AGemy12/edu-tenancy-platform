"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/provider";
import type { SupportRequestState } from "@/lib/types";

const TONE: Record<SupportRequestState, "warning" | "success" | "destructive" | "secondary"> = {
  PENDING: "warning",
  APPROVED: "success",
  DENIED: "destructive",
  REVOKED: "destructive",
  CANCELED: "secondary",
  EXPIRED: "secondary",
};

/** Where a support request stands, the same on the platform's side and the center's. */
export function SupportStateBadge({ state }: { state: SupportRequestState }) {
  const t = useT();
  return <Badge variant={TONE[state]}>{t(`support.state.${state}`)}</Badge>;
}
