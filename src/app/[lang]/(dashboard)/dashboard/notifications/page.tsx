import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsView } from "@/components/notifications/notifications-view";

// The tab and filter live in the URL (useSearchParams), so the view renders on the client under Suspense.
export default function NotificationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-4xl rounded-2xl" />}>
      <NotificationsView />
    </Suspense>
  );
}
