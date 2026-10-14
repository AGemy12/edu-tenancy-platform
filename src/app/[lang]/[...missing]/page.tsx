import { notFound } from "next/navigation";

/** Any /ar/... or /en/... URL that matches no page shows the localized 404 in [lang]/not-found. */
export default function Missing() {
  notFound();
}
