"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherReportView } from "@/components/reports/teacher-report";
import { ReportsFallback } from "@/components/reports/reports-fallback";

function TeacherReport() {
  const id = useSearchParams().get("id");
  return id ? <TeacherReportView key={id} id={id} /> : null;
}

export default function TeacherReportPage() {
  return (
    <Suspense fallback={<ReportsFallback />}>
      <TeacherReport />
    </Suspense>
  );
}
