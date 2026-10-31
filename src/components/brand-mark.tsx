import { GraduationCapIcon } from "lucide-react";

/** The platform's logo tile, shown beside the app name outside the dashboard. */
export function BrandMark() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
      <GraduationCapIcon className="size-5" />
    </span>
  );
}
