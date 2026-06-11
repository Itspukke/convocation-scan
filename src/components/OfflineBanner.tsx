import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center safe-top">
      <div className="animate-rise-in pointer-events-auto flex items-center gap-2 rounded-full border border-warning/30 bg-warning/15 px-4 py-1.5 text-xs font-medium text-warning backdrop-blur-md">
        <WifiOff className="size-3.5" />
        Offline — scans will sync when back online
      </div>
    </div>
  );
}
