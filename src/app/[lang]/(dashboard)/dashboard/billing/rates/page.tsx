"use client";

import { RateCardPage } from "@/components/billing/rate-card-page";

/** The center's price list: what students pay. */
export default function StudentPricesPage() {
  return <RateCardPage kind="STUDENT_FEE" />;
}
