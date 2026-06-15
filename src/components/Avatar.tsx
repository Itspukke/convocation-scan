import { useState } from "react";

export function Avatar({
  src,
  initials,
  size = 96,
  ring = true,
}: {
  src?: string | null;
  initials: string;
  size?: number;
  ring?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full bg-white/5 ${
        ring ? "ring-2 ring-white/90 shadow-[0_10px_40px_-12px_rgba(255,255,255,0.4)]" : ""
      }`}
      style={{ width: size, height: size }}
    >
      {show ? (
        <img
          src={src!}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span
          className="font-display font-medium tracking-tight text-foreground"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
