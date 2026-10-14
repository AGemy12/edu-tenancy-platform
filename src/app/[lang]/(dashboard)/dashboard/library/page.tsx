import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LibraryBrowser } from "@/components/library/library-browser";

function LibraryFallback() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-48" />
      <div className="flex gap-6">
        <Skeleton className="hidden h-96 w-64 shrink-0 rounded-3xl lg:block" />
        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// The browser reads its folder and filters from the URL (useSearchParams), so it renders
// on the client under a Suspense boundary.
export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryFallback />}>
      <LibraryBrowser />
    </Suspense>
  );
}
