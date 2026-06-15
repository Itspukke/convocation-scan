import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  displayName,
  formatTime,
  initials,
  type EventDay,
  type Member,
} from "@/lib/attendance";
import { Avatar } from "@/components/Avatar";
import { DayPicker, SectionLabel } from "@/components/DayModeSelectors";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Holy Convocation" },
      { name: "description", content: "Attendance reports by auxiliary group." },
    ],
  }),
  component: ReportsScreen,
});

type AttRow = {
  member_id: string;
  event_day: EventDay;
  check_in_time: string | null;
  check_out_time: string | null;
};

type Aggregate = {
  group: string;
  members: Member[];
  rows: Record<string, AttRow | undefined>;
  checkedIn: number;
  checkedOut: number;
};

function ReportsScreen() {
  const [day, setDay] = useState<EventDay>("Friday");
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["report", day],
    queryFn: async () => {
      const [m, a] = await Promise.all([
        supabase.from("members").select("*").order("auxiliary_group").order("first_name"),
        supabase.from("attendance").select("member_id, event_day, check_in_time, check_out_time").eq("event_day", day),
      ]);
      if (m.error) throw m.error;
      if (a.error) throw a.error;
      return { members: (m.data ?? []) as unknown as Member[], rows: (a.data ?? []) as AttRow[] };
    },
    refetchInterval: 15_000,
  });

  const agg = useMemo<{ groups: Aggregate[]; totals: { members: number; checkedIn: number; checkedOut: number } }>(() => {
    if (!data) return { groups: [], totals: { members: 0, checkedIn: 0, checkedOut: 0 } };
    const byMember = new Map<string, AttRow>();
    data.rows.forEach((r) => byMember.set(r.member_id, r));
    const groupMap = new Map<string, Aggregate>();
    data.members.forEach((m) => {
      const g = m.auxiliary_group || "Unassigned";
      let entry = groupMap.get(g);
      if (!entry) {
        entry = { group: g, members: [], rows: {}, checkedIn: 0, checkedOut: 0 };
        groupMap.set(g, entry);
      }
      entry.members.push(m);
      const row = byMember.get(m.id);
      entry.rows[m.id] = row;
      if (row?.check_in_time) entry.checkedIn += 1;
      if (row?.check_out_time) entry.checkedOut += 1;
    });
    const groups = Array.from(groupMap.values()).sort((a, b) => a.group.localeCompare(b.group));
    const totals = {
      members: data.members.length,
      checkedIn: groups.reduce((s, g) => s + g.checkedIn, 0),
      checkedOut: groups.reduce((s, g) => s + g.checkedOut, 0),
    };
    return { groups, totals };
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const byMember = new Map<string, AttRow>();
    data.rows.forEach((r) => byMember.set(r.member_id, r));
    const rows = [
      ["Day", "Auxiliary", "First Name", "Last Name", "Phone", "Check-In", "Check-Out", "Status"],
      ...data.members.map((m) => {
        const r = byMember.get(m.id);
        const status = r?.check_out_time ? "Checked Out" : r?.check_in_time ? "Checked In" : "Absent";
        return [
          day,
          m.auxiliary_group,
          m.first_name ?? "",
          m.last_name ?? "",
          m.contact_number ?? m.phone_normalized ?? "",
          r?.check_in_time ?? "",
          r?.check_out_time ?? "",
          status,
        ];
      }),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convocation-${day.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="safe-top relative flex min-h-[100dvh] flex-col px-5 pt-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Overview</p>
          <h1 className="mt-1 font-display text-[26px] leading-none tracking-tight">Reports</h1>
        </div>
        <button
          onClick={exportCsv}
          className="tap inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[12px] font-semibold tracking-tight text-foreground hover:bg-white/5"
        >
          <Download className="size-4" strokeWidth={1.8} />
          Export
        </button>
      </header>

      <section className="mt-6">
        <SectionLabel>Event Day</SectionLabel>
        <div className="mt-3"><DayPicker value={day} onChange={(d) => { setDay(d); setOpen(null); }} /></div>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-2.5">
        <StatCard label="Members" value={agg.totals.members} />
        <StatCard label="Checked In" value={agg.totals.checkedIn} tone="success" />
        <StatCard label="Checked Out" value={agg.totals.checkedOut} tone="muted" />
      </section>

      <section className="mt-7 space-y-2.5">
        <SectionLabel>Auxiliary Groups</SectionLabel>
        {isLoading && <p className="px-1 pt-2 text-[12px] text-muted-foreground">Loading…</p>}
        {!isLoading && agg.groups.length === 0 && (
          <p className="px-1 pt-2 text-[12px] text-muted-foreground">No members yet.</p>
        )}
        {agg.groups.map((g) => (
          <GroupRow
            key={g.group}
            group={g}
            open={open === g.group}
            onToggle={() => setOpen(open === g.group ? null : g.group)}
          />
        ))}
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "muted" }) {
  const valueColor =
    tone === "success" ? "text-[color:var(--success)]" : "text-foreground";
  return (
    <div className="glass rounded-2xl px-3.5 py-4">
      <p className="text-[9.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className={`mt-1.5 font-display text-[28px] leading-none tracking-tight ${valueColor}`}>{value}</p>
    </div>
  );
}

function GroupRow({
  group,
  open,
  onToggle,
}: {
  group: Aggregate;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <button onClick={onToggle} className="tap flex w-full items-center justify-between px-4 py-4 text-left">
        <div>
          <p className="font-display text-[17px] leading-tight tracking-tight text-foreground">{group.group}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {group.members.length} members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[color:var(--success)]/15 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-[color:var(--success)]">
            {group.checkedIn} in
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-foreground/80">
            {group.checkedOut} out
          </span>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.8} />
        </div>
      </button>

      {open && (
        <div className="border-t border-white/8 divide-y divide-white/5">
          {group.members.map((m) => {
            const r = group.rows[m.id];
            const status = r?.check_out_time ? "Out" : r?.check_in_time ? "In" : "Absent";
            const statusColor =
              status === "In"
                ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                : status === "Out"
                  ? "bg-white/10 text-foreground/80"
                  : "bg-white/5 text-muted-foreground";
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar src={m.photo_url} initials={initials(m)} size={40} ring={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium tracking-tight text-foreground">{displayName(m)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    In {formatTime(r?.check_in_time)} · Out {formatTime(r?.check_out_time)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-tight ${statusColor}`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function csvCell(v: string | number) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
