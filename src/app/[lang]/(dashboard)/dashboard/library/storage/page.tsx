import { StorageMonitor } from "@/components/library/storage-monitor";

// Center admin only: the component checks the role (the API enforces it too).
export default function LibraryStoragePage() {
  return <StorageMonitor />;
}
