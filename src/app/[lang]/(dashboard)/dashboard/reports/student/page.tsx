"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudentReportView } from "@/components/reports/student-report";
import { ReportsFallback } from "@/components/reports/reports-fallback";

function StudentReport() {
  const id = useSearchParams().get("id");
  return id ? <StudentReportView key={id} id={id} /> : null;
}

export default function StudentReportPage() {
  return (
    <Suspense fallback={<ReportsFallback />}>
      <StudentReport />
    </Suspense>
  );
}
