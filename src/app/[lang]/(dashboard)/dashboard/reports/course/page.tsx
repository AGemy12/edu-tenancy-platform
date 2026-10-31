"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CourseReportView } from "@/components/reports/course-report";
import { ReportsFallback } from "@/components/reports/reports-fallback";

function CourseReport() {
  const id = useSearchParams().get("id");
  return id ? <CourseReportView key={id} id={id} /> : null;
}

export default function CourseReportPage() {
  return (
    <Suspense fallback={<ReportsFallback />}>
      <CourseReport />
    </Suspense>
  );
}
