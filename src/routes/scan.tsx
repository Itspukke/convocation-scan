import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ChevronLeft, Zap, ZapOff, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  processScan,
  formatTime,
  type EventDay,
  type Mode,
  type ScanOutcome,
} from "@/lib/attendance";
import { OfflineBanner } from "@/components/OfflineBanner";

const searchSchema = z.object({
  day: z.enum(["Friday", "Saturday", "Sunday"]),
  mode: z.enum(["check-in", "check-out"]),
});

export const Route = createFileRoute("/scan")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Scan QR · Holy Convocation" },
      { name: "description", content: "Scan an auxiliary member QR code." },
    ],
  }),
  component: ScanScreen,
});

function ScanScreen() {
  const { day, mode } = Route.useSearch();
  const navigate = useNavigate();

  const containerId = "qr-reader";
  const scannerRef = useRef<any>(null);
  const lockRef = useRef(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let html5Qr: any = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        html5Qr = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = html5Qr;

        await html5Qr.start(
          { facingMode: "environment" },
          {
            fps: 12,
            aspectRatio: window.innerHeight / window.innerWidth,
            qrbox: (vw: number, vh: number) => {
              const size = Math.floor(Math.min(vw, vh) * 0.72);
              return { width: size, height: size };
            },
          },
          async (decodedText: string) => {
            if (lockRef.current) return;
            lockRef.current = true;
            const result = await processScan(decodedText, day as EventDay, mode as Mode);
            setOutcome(result);
            if (navigator.vibrate) navigator.vibrate(result.kind === "success" ? 40 : [30, 60, 30]);
          },
          () => {},
        );

        // detect torch
        try {
          const caps: any = html5Qr.getRunningTrackCameraCapabilities?.();
          if (caps?.torchFeature?.()?.isSupported?.()) setTorchSupported(true);
        } catch {}
      } catch (e: any) {
        setCamError(e?.message ?? "Unable to access camera.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        scannerRef.current?.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      } catch {}
    };
  }, [day, mode]);

  async function toggleTorch() {
    try {
      const caps: any = scannerRef.current?.getRunningTrackCameraCapabilities?.();
      const torch = caps?.torchFeature?.();
      if (!torch) return;
      const next = !torchOn;
      await torch.apply(next);
      setTorchOn(next);
    } catch {}
  }

  function dismissOverlay() {
    setOutcome(null);
    setTimeout(() => {
      lockRef.current = false;
    }, 200);
  }

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-black text-foreground">
      {/* full-bleed camera */}
      <div id={containerId} className="absolute inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover" />

      {/* dim mask */}
      <div className="pointer-events-none absolute inset-0 bg-black/35" />

      <OfflineBanner />

      {/* top chrome */}
      <div className="safe-top absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4">
        <button
          onClick={() => navigate({ to: "/" })}
          className="tap flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
          aria-label="Back"
        >
          <ChevronLeft className="size-6" />
        </button>

        <div className="flex items-center gap-2 rounded-full bg-black/55 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md">
          <span
            className={`size-1.5 rounded-full ${
              mode === "check-in" ? "bg-primary" : "bg-accent"
            } animate-pulse`}
          />
          <span className="font-display">{day}</span>
          <span className="opacity-50">·</span>
          <span className="capitalize">{mode === "check-in" ? "Check-In" : "Check-Out"}</span>
        </div>

        {torchSupported ? (
          <button
            onClick={toggleTorch}
            className="tap flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
            aria-label="Torch"
          >
            {torchOn ? <Zap className="size-5 text-primary" /> : <ZapOff className="size-5" />}
          </button>
        ) : (
          <div className="size-11" />
        )}
      </div>

      {/* viewfinder brackets */}
      <ViewFinder />

      {/* hint */}
      <p className="safe-bottom absolute inset-x-0 bottom-0 z-20 text-center text-[13px] font-medium text-white/80">
        Hold a member's QR code inside the frame
      </p>

      {camError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background px-8 text-center">
          <p className="font-display text-xl font-semibold">Camera blocked</p>
          <p className="mt-2 text-sm text-muted-foreground">{camError}</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="tap mt-6 h-12 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            Go back
          </button>
        </div>
      )}

      {outcome && <ResultSheet outcome={outcome} onDismiss={dismissOverlay} />}
    </main>
  );
}

function ViewFinder() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="animate-corner-pulse relative aspect-square w-[72vw] max-w-[340px]">
        {[
          "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-[18px]",
          "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-[18px]",
          "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-[18px]",
          "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-[18px]",
        ].map((c, i) => (
          <span key={i} className={`absolute size-10 border-primary ${c}`} />
        ))}
        <div className="absolute inset-x-2 top-2 h-px overflow-hidden">
          <div className="animate-scan-line h-px w-full bg-primary/80 shadow-[0_0_12px_2px_var(--color-primary)]" />
        </div>
      </div>
    </div>
  );
}

function ResultSheet({
  outcome,
  onDismiss,
}: {
  outcome: ScanOutcome;
  onDismiss: () => void;
}) {
  const tint =
    outcome.kind === "success" ? "success" : outcome.kind === "warning" ? "warning" : "destructive";
  const Icon =
    outcome.kind === "success" ? CheckCircle2 : outcome.kind === "warning" ? AlertTriangle : XCircle;

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/55 backdrop-blur-sm">
      <div className="animate-rise-in safe-bottom w-full rounded-t-[28px] bg-background pt-1">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />

        {outcome.kind === "success" ? (
          <SuccessBody outcome={outcome} />
        ) : (
          <div className="px-6 pt-6">
            <div
              className={`flex size-14 items-center justify-center rounded-2xl bg-${tint}/15 text-${tint}`}
            >
              <Icon className="size-7" />
            </div>
            <p className="mt-4 font-display text-[22px] font-semibold leading-tight text-foreground">
              {outcome.title}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">{outcome.message}</p>
          </div>
        )}

        <div className="px-5 pt-7">
          <button
            onClick={onDismiss}
            className={`tap h-14 w-full rounded-2xl text-[15px] font-semibold ${
              outcome.kind === "success"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-foreground"
            }`}
          >
            {outcome.kind === "success" ? "Scan Next" : "Try Again"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessBody({
  outcome,
}: {
  outcome: Extract<ScanOutcome, { kind: "success" }>;
}) {
  const { member, day, mode, time } = outcome;
  return (
    <div className="px-5 pt-4">
      <div className="relative overflow-hidden rounded-3xl">
        <div className="aspect-[5/4] w-full">
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-2 font-display text-5xl text-primary">
              {member.full_name.charAt(0)}
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-success backdrop-blur">
            <span className="animate-pop-check inline-block">
              <CheckCircle2 className="size-3.5" />
            </span>
            {mode === "check-in" ? "Checked In" : "Checked Out"}
          </span>
          <p className="mt-2 font-display text-2xl font-semibold text-white leading-tight">
            {member.full_name}
          </p>
          <p className="text-sm text-white/80">{member.auxiliary_group}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="text-muted-foreground">{day}</span>
        <span className="font-display font-semibold tabular-nums">{formatTime(time)}</span>
      </div>
    </div>
  );
}
