import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, LogIn, LogOut, Check } from "lucide-react";
import type { EventDay, Mode } from "@/lib/attendance";
import { OfflineBanner } from "@/components/OfflineBanner";

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

const DAYS: { day: EventDay; date: string }[] = [
  { day: "Friday", date: "Day One" },
  { day: "Saturday", date: "Day Two" },
  { day: "Sunday", date: "Day Three" },
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

      {/* ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, oklch(0.82 0.16 86 / 0.18), transparent 70%)",
        }}
      />

      <header className="safe-top relative px-6 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
          1st Combined SA
        </p>
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-[1.05] text-foreground">
          Holy Convocation
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          First Church of Our Lord Jesus Christ, Inc.
        </p>
      </header>

      <section className="relative flex-1 px-5 pt-8">
        <SectionLabel>Event day</SectionLabel>
        <div className="mt-3 space-y-2.5">
          {DAYS.map((d) => {
            const active = day === d.day;
            return (
              <button
                key={d.day}
                onClick={() => setDay(d.day)}
                className={`tap group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left ${
                  active
                    ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_var(--color-primary)_inset]"
                    : "border-border bg-surface"
                }`}
              >
                <div>
                  <p
                    className={`font-display text-lg font-semibold ${
                      active ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {d.day}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{d.date}</p>
                </div>
                <Dot active={!!active} />
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          <SectionLabel>Mode</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <ModeCard
              icon={<LogIn className="size-5" />}
              label="Check-In"
              active={mode === "check-in"}
              onClick={() => setMode("check-in")}
              tint="primary"
            />
            <ModeCard
              icon={<LogOut className="size-5" />}
              label="Check-Out"
              active={mode === "check-out"}
              onClick={() => setMode("check-out")}
              tint="accent"
            />
          </div>
        </div>
      </section>

      <footer className="safe-bottom relative px-5 pt-6">
        <button
          onClick={confirm}
          disabled={!ready}
          className={`tap flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold ${
            ready
              ? "bg-primary text-primary-foreground shadow-[0_10px_30px_-12px_var(--color-primary)]"
              : "bg-surface-2 text-muted-foreground"
          }`}
        >
          {ready ? (
            <>
              Start Scanning <ArrowRight className="size-5" />
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
    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={`flex size-6 items-center justify-center rounded-full border ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
      }`}
    >
      {active && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

function ModeCard({
  icon,
  label,
  active,
  onClick,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  tint: "primary" | "accent";
}) {
  const activeBg = tint === "primary" ? "bg-primary/12 border-primary/60" : "bg-accent/15 border-accent/60";
  const iconColor = tint === "primary" ? "text-primary" : "text-accent";
  return (
    <button
      onClick={onClick}
      className={`tap flex h-28 flex-col items-start justify-between rounded-2xl border p-4 text-left ${
        active ? activeBg : "border-border bg-surface"
      }`}
    >
      <span
        className={`flex size-10 items-center justify-center rounded-xl ${
          active ? "bg-background/40" : "bg-surface-2"
        } ${active ? iconColor : "text-muted-foreground"}`}
      >
        {icon}
      </span>
      <span className="font-display text-[15px] font-semibold">{label}</span>
    </button>
  );
}
