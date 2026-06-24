import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TabBar } from "@/components/TabBar";
import { OfflineBanner } from "@/components/OfflineBanner";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      <OfflineBanner />
      <div className="pb-28">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
