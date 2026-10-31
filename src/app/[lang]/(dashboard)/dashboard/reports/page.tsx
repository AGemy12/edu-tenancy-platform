import { Suspense } from "react";
import { ReportsFallback } from "@/components/reports/reports-fallback";
import { ReportsHub } from "@/components/reports/reports-hub";

// Filters and tabs live in the URL (useSearchParams), so the view renders on the client under Suspense.
export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsFallback />}>
      <ReportsHub />
    </Suspense>
  );
}
