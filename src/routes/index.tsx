import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, LogIn, LogOut } from "lucide-react";
import type { EventDay, Mode } from "@/lib/attendance";
import { OfflineBanner } from "@/components/OfflineBanner";
import fcLogo from "@/assets/fc-logo.jpeg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Holy Convocation · Select Day" },
      {
        name: "description",
        content: "Pick the event day and check-in mode for the Holy Convocation.",
      },
    ],
  }),
  component: SelectDayMode,
});

const DAYS: { day: EventDay; label: string }[] = [
  { day: "Friday", label: "Day One" },
  { day: "Saturday", label: "Day Two" },
  { day: "Sunday", label: "Day Three" },
];

function SelectDayMode() {
  const navigate = useNavigate();
  const [day, setDay] = useState<EventDay | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);

  const ready = day && mode;

  function confirm() {
    if (!ready) return;
    navigate({ to: "/scan", search: { day: day!, mode: mode! } });
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-background text-foreground">
      <OfflineBanner />

      <header className="safe-top relative flex flex-col items-center px-6 pt-4 text-center">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
            style={{ background: "radial-gradient(circle, oklch(1 0 0 / 0.18), transparent 70%)" }}
          />
          <img
            src={fcLogo.url}
            alt="First Church of Our Lord Jesus Christ"
            className="size-20 rounded-full object-cover ring-1 ring-white/15"
          />
        </div>
        <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
          1st Combined South African
        </p>
        <h1 className="mt-2 font-display text-[34px] leading-[1.02] tracking-tight">
          Holy Convocation
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          First Church of Our Lord Jesus Christ, Inc.
        </p>
      </header>

      <section className="relative flex-1 px-6 pt-10">
        <SectionLabel>Event Day</SectionLabel>
        <div className="mt-4 space-y-3">
          {DAYS.map((d) => (
            <DayCard
              key={d.day}
              day={d.day}
              label={d.label}
              active={day === d.day}
              onClick={() => setDay(d.day)}
            />
          ))}
        </div>

        <div className="mt-9">
          <SectionLabel>Mode</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ModeCard
              icon={<LogIn className="size-5" strokeWidth={1.6} />}
              label="Check-In"
              active={mode === "check-in"}
              onClick={() => setMode("check-in")}
            />
            <ModeCard
              icon={<LogOut className="size-5" strokeWidth={1.6} />}
              label="Check-Out"
              active={mode === "check-out"}
              onClick={() => setMode("check-out")}
            />
          </div>
        </div>
      </section>

      <footer className="safe-bottom relative px-6 pt-8">
        <button
          onClick={confirm}
          disabled={!ready}
          className={`tap flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold tracking-tight ${
            ready
              ? "bg-white text-[#0a0d1a] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.5)]"
              : "glass text-muted-foreground"
          }`}
        >
          {ready ? (
            <>
              Start Scanning <ArrowRight className="size-5" strokeWidth={2} />
            </>
          ) : (
            "Select day and mode"
          )}
        </button>
      </footer>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
      {children}
    </p>
  );
}

function DayCard({
  day,
  label,
  active,
  onClick,
}: {
  day: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap relative flex w-full items-center justify-between rounded-2xl px-5 py-5 text-left ${
        active
          ? "bg-white text-[#0a0d1a] shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_10px_40px_-12px_rgba(255,255,255,0.45)]"
          : "glass text-foreground"
      }`}
    >
      <div>
        <p
          className={`font-display text-[22px] leading-none tracking-tight ${
            active ? "text-[#0a0d1a]" : "text-foreground"
          }`}
        >
          {day}
        </p>
        <p
          className={`mt-1.5 text-[11px] uppercase tracking-[0.22em] ${
            active ? "text-[#0a0d1a]/60" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
      </div>
      <span
        className={`flex size-7 items-center justify-center rounded-full border ${
          active ? "border-[#0a0d1a]/20 bg-[#0a0d1a]" : "border-white/15"
        }`}
      >
        <span
          className={`size-2 rounded-full ${active ? "bg-white" : "bg-transparent"}`}
        />
      </span>
    </button>
  );
}

function ModeCard({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap flex h-32 flex-col items-center justify-center gap-3 rounded-2xl ${
        active
          ? "bg-white text-[#0a0d1a] shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_10px_40px_-12px_rgba(255,255,255,0.45)]"
          : "glass text-foreground"
      }`}
    >
      <span
        className={`flex size-11 items-center justify-center rounded-full ${
          active ? "bg-[#0a0d1a] text-white" : "bg-white/5 text-white"
        }`}
      >
        {icon}
      </span>
      <span className="text-[13px] font-medium tracking-tight">{label}</span>
    </button>
  );
}
