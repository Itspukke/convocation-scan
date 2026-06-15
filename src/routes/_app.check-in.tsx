import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Phone, X } from "lucide-react";
import {
  confirmAttendance,
  displayName,
  findMemberByPhone,
  formatTime,
  initials,
  normalizePhone,
  type EventDay,
  type Member,
  type Mode,
  type Outcome,
} from "@/lib/attendance";
import { Avatar } from "@/components/Avatar";
import { DayPicker, ModePicker, Pill, SectionLabel } from "@/components/DayModeSelectors";
import fcLogo from "@/assets/fc-logo.jpeg.asset.json";

export const Route = createFileRoute("/_app/check-in")({
  head: () => ({
    meta: [
      { title: "Check-In · Holy Convocation" },
      { name: "description", content: "Check members in and out by phone number." },
    ],
  }),
  component: CheckInScreen,
});

type Step =
  | { kind: "entry" }
  | { kind: "profile"; member: Member }
  | { kind: "result"; outcome: Outcome };

function CheckInScreen() {
  const [day, setDay] = useState<EventDay>("Friday");
  const [mode, setMode] = useState<Mode>("check-in");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>({ kind: "entry" });
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  function reset() {
    setPhone("");
    setLookupError(null);
    setStep({ kind: "entry" });
  }

  async function find() {
    setLoading(true);
    setLookupError(null);
    const res = await findMemberByPhone(phone);
    setLoading(false);
    if (!res.ok) {
      setStep({ kind: "result", outcome: { kind: "error", title: res.title, message: res.message } });
      return;
    }
    setStep({ kind: "profile", member: res.member });
  }

  async function confirm() {
    if (step.kind !== "profile") return;
    setLoading(true);
    const outcome = await confirmAttendance(step.member, day, mode);
    setLoading(false);
    setStep({ kind: "result", outcome });
  }

  return (
    <main className="safe-top relative flex min-h-[100dvh] flex-col px-5 pt-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={fcLogo.url}
            alt="First Church of Our Lord Jesus Christ"
            className="size-12 rounded-full object-cover ring-1 ring-white/15"
          />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
              Holy Convocation
            </p>
            <h1 className="mt-0.5 font-display text-[22px] leading-none tracking-tight">Check-In</h1>
          </div>
        </div>
        <Pill>
          <span className="size-1.5 rounded-full bg-white" />
          {day} · {mode === "check-in" ? "In" : "Out"}
        </Pill>
      </header>

      <section className="mt-8">
        <SectionLabel>Event Day</SectionLabel>
        <div className="mt-3"><DayPicker value={day} onChange={setDay} /></div>
      </section>

      <section className="mt-6">
        <SectionLabel>Mode</SectionLabel>
        <div className="mt-3"><ModePicker value={mode} onChange={setMode} /></div>
      </section>

      <section className="mt-8 flex-1">
        <SectionLabel>Phone Number</SectionLabel>
        <PhoneInput value={phone} onChange={setPhone} />
        {lookupError && (
          <p className="mt-3 text-center text-[12px] text-[color:var(--warning)]">{lookupError}</p>
        )}
      </section>

      <footer className="pt-6">
        <button
          onClick={find}
          disabled={loading || normalizePhone(phone).length < 6}
          className="tap flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-semibold tracking-tight text-[#0a0d1a] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.5)] disabled:bg-white/30 disabled:text-[#0a0d1a]/40 disabled:shadow-none"
        >
          {loading ? "Searching…" : (<>Find Member <ArrowRight className="size-5" strokeWidth={2} /></>)}
        </button>
      </footer>

      {step.kind === "profile" && (
        <ProfileSheet
          member={step.member}
          day={day}
          mode={mode}
          loading={loading}
          onCancel={reset}
          onConfirm={confirm}
        />
      )}

      {step.kind === "result" && (
        <ResultSheet outcome={step.outcome} onNext={reset} />
      )}
    </main>
  );
}

function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  function push(d: string) {
    onChange((value + d).slice(0, 16));
  }
  function back() { onChange(value.slice(0, -1)); }

  return (
    <div className="mt-3">
      <div className="glass flex items-center gap-3 rounded-2xl px-5 py-5">
        <Phone className="size-5 text-muted-foreground" strokeWidth={1.6} />
        <input
          ref={ref}
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter phone number"
          className="w-full bg-transparent font-display text-[26px] tracking-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {value && (
          <button onClick={() => onChange("")} className="tap text-muted-foreground" aria-label="Clear">
            <X className="size-5" strokeWidth={1.8} />
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {["1","2","3","4","5","6","7","8","9"].map((n) => (
          <KeyBtn key={n} onClick={() => push(n)}>{n}</KeyBtn>
        ))}
        <KeyBtn onClick={() => push("+")}>+</KeyBtn>
        <KeyBtn onClick={() => push("0")}>0</KeyBtn>
        <KeyBtn onClick={back} aria-label="Backspace">
          <Delete className="mx-auto size-5" strokeWidth={1.8} />
        </KeyBtn>
      </div>
    </div>
  );
}

function KeyBtn({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      onClick={onClick}
      className="tap glass h-14 rounded-2xl text-center font-display text-[22px] tracking-tight text-foreground active:bg-white/15"
    >
      {children}
    </button>
  );
}

function ProfileSheet({
  member,
  day,
  mode,
  loading,
  onCancel,
  onConfirm,
}: {
  member: Member;
  day: EventDay;
  mode: Mode;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isIn = mode === "check-in";
  return (
    <Sheet onClose={onCancel}>
      <div className="flex justify-center">
        <Pill>
          <span className="size-1.5 rounded-full bg-white" />
          {day} · {isIn ? "Check-In" : "Check-Out"}
        </Pill>
      </div>

      <div className="mt-7 flex flex-col items-center text-center">
        <Avatar src={member.photo_url} initials={initials(member)} size={108} />
        <h2 className="mt-5 font-display text-[28px] leading-tight tracking-tight">{displayName(member)}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{member.auxiliary_group}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">{member.contact_number ?? member.phone_normalized}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2.5">
        <button
          onClick={onCancel}
          className="tap glass h-14 rounded-2xl text-[14px] font-semibold tracking-tight text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="tap h-14 rounded-2xl bg-white text-[14px] font-semibold tracking-tight text-[#0a0d1a] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.5)] disabled:bg-white/30"
        >
          {loading ? "Saving…" : isIn ? "Confirm Check-In" : "Confirm Check-Out"}
        </button>
      </div>
    </Sheet>
  );
}

function ResultSheet({ outcome, onNext }: { outcome: Outcome; onNext: () => void }) {
  const isSuccess = outcome.kind === "success";
  const glow = isSuccess
    ? "shadow-[0_0_60px_0_oklch(0.78_0.17_155_/_0.35)]"
    : outcome.kind === "warning"
      ? "shadow-[0_0_60px_0_oklch(0.82_0.16_78_/_0.35)]"
      : "shadow-[0_0_60px_0_oklch(0.68_0.2_25_/_0.3)]";
  const ringColor = isSuccess
    ? "ring-[color:var(--success)]"
    : outcome.kind === "warning"
      ? "ring-[color:var(--warning)]"
      : "ring-[color:var(--destructive)]";

  return (
    <Sheet onClose={onNext}>
      {isSuccess ? (
        <div className="flex flex-col items-center text-center">
          <div className={`flex size-20 items-center justify-center rounded-full bg-white/5 ring-2 ${ringColor} ${glow} animate-pop-check`}>
            <svg viewBox="0 0 24 24" className="size-10 text-[color:var(--success)]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </div>
          <Avatar src={outcome.member.photo_url} initials={initials(outcome.member)} size={84} ring={false} />
          <h2 className="mt-4 font-display text-[24px] leading-tight tracking-tight">{displayName(outcome.member)}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{outcome.member.auxiliary_group}</p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            {outcome.mode === "check-in" ? "Checked In" : "Checked Out"} · {outcome.day} · {formatTime(outcome.time)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <div className={`flex size-20 items-center justify-center rounded-full bg-white/5 ring-2 ${ringColor} ${glow}`}>
            <svg viewBox="0 0 24 24" className={`size-10 ${outcome.kind === "warning" ? "text-[color:var(--warning)]" : "text-[color:var(--destructive)]"}`} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v5" /><path d="M12 16.5h.01" /><circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <h2 className="mt-6 font-display text-[24px] leading-tight tracking-tight">{outcome.title}</h2>
          <p className="mt-2 max-w-xs text-[14px] text-muted-foreground">{outcome.message}</p>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={onNext}
          className="tap flex h-14 w-full items-center justify-center rounded-2xl bg-white text-[15px] font-semibold tracking-tight text-[#0a0d1a] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.5)]"
        >
          {isSuccess ? "Next Member" : "Try Again"}
        </button>
      </div>
    </Sheet>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/60 backdrop-blur-sm"
      />
      <div className="safe-bottom relative animate-rise-in rounded-t-[28px] border-t border-white/10 bg-[#0d1124] px-6 pb-6 pt-7 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)]">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />
        {children}
      </div>
    </div>
  );
}
