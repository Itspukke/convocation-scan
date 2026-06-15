import { LogIn, LogOut } from "lucide-react";
import type { EventDay, Mode } from "@/lib/attendance";

export const DAYS: EventDay[] = ["Friday", "Saturday", "Sunday"];

export function DayPicker({
  value,
  onChange,
}: {
  value: EventDay;
  onChange: (d: EventDay) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DAYS.map((d) => {
        const active = value === d;
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`tap flex h-14 items-center justify-center rounded-2xl text-[13px] font-semibold tracking-tight ${
              active
                ? "bg-white text-[#0a0d1a] shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_8px_30px_-12px_rgba(255,255,255,0.45)]"
                : "glass text-foreground"
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

export function ModePicker({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ModeButton
        active={value === "check-in"}
        onClick={() => onChange("check-in")}
        icon={<LogIn className="size-4" strokeWidth={1.8} />}
        label="Check-In"
      />
      <ModeButton
        active={value === "check-out"}
        onClick={() => onChange("check-out")}
        icon={<LogOut className="size-4" strokeWidth={1.8} />}
        label="Check-Out"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap flex h-14 items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold tracking-tight ${
        active
          ? "bg-white text-[#0a0d1a] shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_8px_30px_-12px_rgba(255,255,255,0.45)]"
          : "glass text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
      {children}
    </p>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/90">
      {children}
    </span>
  );
}
