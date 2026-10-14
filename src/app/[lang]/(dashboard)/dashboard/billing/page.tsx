import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BillingView } from "@/components/billing/billing-view";

function BillingFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

// Filters live in the URL (useSearchParams), so the view renders on the client under Suspense.
export default function BillingPage() {
  return (
    <Suspense fallback={<BillingFallback />}>
      <BillingView />
    </Suspense>
  );
}
