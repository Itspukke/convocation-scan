import { Link } from "@tanstack/react-router";
import { UserCheck, BarChart3 } from "lucide-react";

export function TabBar() {
  return (
    <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-3">
      <div className="glass pointer-events-auto flex w-full max-w-sm items-center justify-around rounded-full px-2 py-2 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]">
        <TabLink to="/check-in" icon={<UserCheck className="size-[18px]" strokeWidth={1.8} />} label="Check-In" />
        <TabLink to="/reports" icon={<BarChart3 className="size-[18px]" strokeWidth={1.8} />} label="Reports" />
      </div>
    </nav>
  );
}

function TabLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="tap group flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-medium tracking-tight text-muted-foreground"
      activeProps={{
        className:
          "tap flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold tracking-tight bg-white text-[#0a0d1a] shadow-[0_6px_24px_-8px_rgba(255,255,255,0.55)]",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}
