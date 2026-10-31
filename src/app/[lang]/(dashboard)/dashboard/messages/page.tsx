import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MessagesView } from "@/components/messages/messages-view";

// The open conversation lives in the URL (?c=), so the view renders on the client under Suspense.
export default function MessagesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[calc(100dvh-8rem)] rounded-2xl" />}>
      <MessagesView />
    </Suspense>
  );
}
