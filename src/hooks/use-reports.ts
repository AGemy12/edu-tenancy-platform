"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api, getErrorMessage } from "@/lib/api";
import type { BillingOptions } from "@/lib/types";
import { listKey } from "./use-resources";

/** Query params of every report (see ReportQueryDto): days in the center's time zone, both included. */
export type ReportParams = {
  from: string;
  to: string;
  teacherId?: string;
  courseId?: string;
  finance?: boolean;
};

// Keys sit under "list" so evaluating a session, grading an exam or editing a student refreshes reports too.

/** One report, e.g. useReport<StudentReport>(`/reports/students/${id}`, params). */
export function useReport<T>(path: string | null, params: ReportParams) {
  return useQuery({
    queryKey: [...listKey("/reports"), path, params],
    queryFn: async () => (await api.get<T>(path!, { params })).data,
    enabled: Boolean(path),
    placeholderData: (prev) => prev,
  });
}

/** The teachers, students and courses the viewer can narrow reports by. */
export function useReportOptions(enabled = true) {
  return useQuery({
    queryKey: listKey("/reports/options"),
    queryFn: async () => (await api.get<BillingOptions>("/reports/options")).data,
    staleTime: 5 * 60_000,
    enabled,
  });
}

/**
 * Downloads a report's PDF (`<path>/pdf`) in `lang` and saves it under the server's file name.
 * Errors come back as a Blob, so they're read here to keep the API's localized message.
 */
export async function downloadReportPdf(path: string, params: ReportParams, lang: "ar" | "en") {
  try {
    const res = await api.get<Blob>(`${path}/pdf`, { params: { ...params, lang }, responseType: "blob", timeout: 90_000 });
    const name = fileNameOf(res.headers["content-disposition"]) ?? "report.pdf";
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        const body = JSON.parse(await err.response.data.text()) as { message?: string };
        if (body.message) throw new Error(body.message);
      } catch (parsed) {
        if (parsed instanceof Error && !(parsed instanceof SyntaxError)) throw parsed;
      }
    }
    throw new Error(getErrorMessage(err));
  }
}

function fileNameOf(disposition: unknown) {
  if (typeof disposition !== "string") return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (star) return decodeURIComponent(star);
  return /filename="([^"]+)"/i.exec(disposition)?.[1] ?? null;
}
