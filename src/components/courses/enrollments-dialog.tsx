"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2Icon, UserPlusIcon, UserRoundXIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useList } from "@/hooks/use-resources";
import { useI18n } from "@/i18n/provider";
import { api, getErrorMessage } from "@/lib/api";
import type { Course, CourseDetail, Student } from "@/lib/types";

/** Who is enrolled in a course: add students the caller can see, remove enrolled ones. */
export default function EnrollmentsDialog({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={Boolean(course)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("courses.enrollments.title")}</DialogTitle>
          <DialogDescription>
            <bdi>{course?.title}</bdi>
          </DialogDescription>
        </DialogHeader>
        {course && <Enrollments courseId={course.id} />}
      </DialogContent>
    </Dialog>
  );
}

function Enrollments({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [pick, setPick] = useState("");
  const key = ["course", courseId];
  const detail = useQuery({ queryKey: key, queryFn: async () => (await api.get<CourseDetail>(`/courses/${courseId}`)).data });
  const students = useList<Student>("/students");

  const enrolled = detail.data?.enrollments ?? [];
  const enrolledIds = new Set(enrolled.map((e) => e.studentId));
  const available = (students.data ?? []).filter((s) => !enrolledIds.has(s.id));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["list"] });
  };
  const add = useMutation({
    mutationFn: (studentId: string) => api.post(`/courses/${courseId}/enrollments`, { studentId }),
    onSuccess: () => {
      toast.success(t("courses.enrollments.added"));
      setPick("");
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.saveFailed"))),
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => api.delete(`/courses/${courseId}/enrollments/${studentId}`),
    onSuccess: () => {
      toast.success(t("courses.enrollments.removed"));
      refresh();
    },
    onError: (e) => toast.error(getErrorMessage(e, t("common.toast.deleteFailed"))),
  });

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (pick) add.mutate(pick);
        }}
      >
        <Select value={pick || undefined} onValueChange={setPick} disabled={available.length === 0}>
          <SelectTrigger className="min-w-0 flex-1" aria-label={t("courses.enrollments.addLabel")}>
            <SelectValue
              placeholder={
                students.isPending
                  ? t("common.labels.loading")
                  : available.length === 0
                    ? t("courses.enrollments.noneLeft")
                    : t("courses.enrollments.addLabel")
              }
            />
          </SelectTrigger>
          <SelectContent>
            {available.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.user.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={!pick || add.isPending}>
          {add.isPending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon data-icon="inline-start" />}
          {t("courses.enrollments.add")}
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <Badge variant="secondary">{t("courses.enrollments.count", { count: enrolled.length })}</Badge>
      </div>

      {detail.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : enrolled.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <UsersIcon className="size-5" aria-hidden="true" />
          </span>
          <p className="font-semibold">{t("courses.enrollments.empty")}</p>
          <p className="text-sm text-muted-foreground">{t("courses.enrollments.emptyHint")}</p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {enrolled.map((e) => (
            <li key={e.studentId} className="flex items-center gap-3 px-3 py-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
                aria-hidden="true"
              >
                {e.student.user.fullName.trim().charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  <bdi>{e.student.user.fullName}</bdi>
                </p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {e.student.user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(e.studentId)}
                aria-label={t("courses.enrollments.remove", { name: e.student.user.fullName })}
              >
                <UserRoundXIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
