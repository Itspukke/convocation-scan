import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ChevronLeft, Zap, ZapOff, Check, AlertTriangle, XCircle } from "lucide-react";
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
      <div
        id={containerId}
        className="absolute inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/40" />

      <OfflineBanner />

      {/* top frosted pill */}
      <div className="safe-top absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4">
        <button
          onClick={() => navigate({ to: "/" })}
          className="tap flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md"
          aria-label="Back"
        >
          <ChevronLeft className="size-5" strokeWidth={1.8} />
        </button>

        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-[12px] font-medium text-white backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          <span className="font-display text-[13px]">{day}</span>
          <span className="text-white/40">·</span>
          <span>{mode === "check-in" ? "Check-In" : "Check-Out"}</span>
        </div>

        {torchSupported ? (
          <button
            onClick={toggleTorch}
            className="tap flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md"
            aria-label="Torch"
          >
            {torchOn ? <Zap className="size-5" strokeWidth={1.8} /> : <ZapOff className="size-5" strokeWidth={1.8} />}
          </button>
        ) : (
          <div className="size-11" />
        )}
      </div>

      <ViewFinder />

      <p className="safe-bottom absolute inset-x-0 bottom-0 z-20 text-center text-[12px] tracking-wide text-white/70">
        Align the QR code within the frame
      </p>

      {camError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background px-8 text-center">
          <p className="font-display text-2xl">Camera blocked</p>
          <p className="mt-2 text-sm text-muted-foreground">{camError}</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="tap mt-6 h-12 rounded-2xl bg-white px-7 text-sm font-semibold text-[#0a0d1a]"
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
          "top-0 left-0 border-t-[2.5px] border-l-[2.5px] rounded-tl-[22px]",
          "top-0 right-0 border-t-[2.5px] border-r-[2.5px] rounded-tr-[22px]",
          "bottom-0 left-0 border-b-[2.5px] border-l-[2.5px] rounded-bl-[22px]",
          "bottom-0 right-0 border-b-[2.5px] border-r-[2.5px] rounded-br-[22px]",
        ].map((c, i) => (
          <span key={i} className={`absolute size-12 border-white ${c}`} />
        ))}
        <div className="absolute inset-x-3 top-3 h-px overflow-hidden">
          <div className="animate-scan-line h-px w-full bg-white shadow-[0_0_14px_2px_rgba(255,255,255,0.7)]" />
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
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="animate-rise-in safe-bottom w-full rounded-t-[28px] border-t border-white/10 bg-background pt-1.5">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15" />
        {outcome.kind === "success" ? (
          <SuccessBody outcome={outcome} />
        ) : (
          <ErrorBody outcome={outcome} />
        )}
        <div className="px-6 pb-2 pt-7">
          <button
            onClick={onDismiss}
            className={`tap h-14 w-full rounded-2xl text-[15px] font-semibold tracking-tight ${
              outcome.kind === "success"
                ? "bg-white text-[#0a0d1a] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.5)]"
                : "glass text-foreground"
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
    <div className="px-6 pt-8 text-center">
      <div className="relative mx-auto size-32">
        <div
          aria-hidden
          className="absolute -inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.78 0.17 155 / 0.35), transparent 70%)",
          }}
        />
        <div className="relative size-32 overflow-hidden rounded-full ring-2 ring-white/90">
          {member.photo_url ? (
            <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/10 font-display text-4xl text-white">
              {member.full_name.charAt(0)}
            </div>
          )}
        </div>
        <span className="animate-pop-check absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-success text-success-foreground ring-4 ring-background">
          <Check className="size-4" strokeWidth={3} />
        </span>
      </div>

      <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.32em] text-success">
        {mode === "check-in" ? "Checked In" : "Checked Out"}
      </p>
      <h2 className="mt-2 font-display text-[28px] leading-tight">
        {member.full_name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{member.auxiliary_group}</p>

      <div className="mt-5 flex items-center justify-center gap-3 text-xs">
        <span className="glass rounded-full px-3 py-1.5 text-muted-foreground">{day}</span>
        <span className="glass rounded-full px-3 py-1.5 font-medium tabular-nums text-foreground">
          {formatTime(time)}
        </span>
      </div>
    </div>
  );
}

function ErrorBody({
  outcome,
}: {
  outcome: Extract<ScanOutcome, { kind: "error" | "warning" }>;
}) {
  const isWarn = outcome.kind === "warning";
  const Icon = isWarn ? AlertTriangle : XCircle;
  const tone = isWarn ? "text-warning" : "text-destructive";
  const glow = isWarn
    ? "radial-gradient(circle, oklch(0.82 0.16 78 / 0.32), transparent 70%)"
    : "radial-gradient(circle, oklch(0.68 0.2 25 / 0.32), transparent 70%)";

  return (
    <div className="px-6 pt-8 text-center">
      <div className="relative mx-auto flex size-20 items-center justify-center">
        <div aria-hidden className="absolute -inset-3 rounded-full" style={{ background: glow }} />
        <div className={`relative flex size-20 items-center justify-center rounded-full glass ${tone}`}>
          <Icon className="size-9" strokeWidth={1.6} />
        </div>
      </div>
      <p className={`mt-5 text-[10px] font-medium uppercase tracking-[0.32em] ${tone}`}>
        {isWarn ? "Heads Up" : "Scan Failed"}
      </p>
      <h2 className="mt-2 font-display text-[24px] leading-tight">{outcome.title}</h2>
      <p className="mx-auto mt-2 max-w-[280px] text-sm text-muted-foreground">{outcome.message}</p>
    </div>
  );
}
