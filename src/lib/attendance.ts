import { supabase } from "@/integrations/supabase/client";

export type EventDay = "Friday" | "Saturday" | "Sunday";
export type Mode = "check-in" | "check-out";

export type Member = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  auxiliary_group: string;
  contact_number: string | null;
  phone_normalized: string | null;
  photo_url: string | null;
};

export type AttendanceRow = {
  id: string;
  member_id: string;
  event_day: EventDay;
  check_in_time: string | null;
  check_out_time: string | null;
};

export type Outcome =
  | { kind: "success"; member: Member; day: EventDay; mode: Mode; time: string }
  | { kind: "error" | "warning"; title: string; message: string };

export function normalizePhone(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function displayName(m: Pick<Member, "first_name" | "last_name" | "full_name">) {
  const fn = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return fn || m.full_name || "Member";
}

export function initials(m: Pick<Member, "first_name" | "last_name" | "full_name">) {
  const name = displayName(m);
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "·";
}

export async function findMemberByPhone(rawPhone: string): Promise<
  | { ok: true; member: Member }
  | { ok: false; title: string; message: string }
> {
  const phone = normalizePhone(rawPhone);
  if (phone.length < 6) {
    return { ok: false, title: "Phone number too short", message: "Enter the full phone number to look up the member." };
  }
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("phone_normalized", phone)
    .maybeSingle();

  if (error) return { ok: false, title: "Connection issue", message: error.message };
  if (!data) {
    return {
      ok: false,
      title: "Phone number not found",
      message: "No member is registered with that phone number.",
    };
  }
  return { ok: true, member: data as unknown as Member };
}

export async function confirmAttendance(
  member: Member,
  day: EventDay,
  mode: Mode,
): Promise<Outcome> {
  const { data: existing, error: exErr } = await supabase
    .from("attendance")
    .select("*")
    .eq("member_id", member.id)
    .eq("event_day", day)
    .maybeSingle();

  if (exErr) return { kind: "error", title: "Connection issue", message: exErr.message };

  const now = new Date().toISOString();

  if (mode === "check-in") {
    if (existing?.check_in_time) {
      return {
        kind: "warning",
        title: "Already checked in today",
        message: `${displayName(member)} was already checked in for ${day}.`,
      };
    }
    if (existing) {
      const { error } = await supabase
        .from("attendance")
        .update({ check_in_time: now })
        .eq("id", existing.id);
      if (error) return { kind: "error", title: "Could not save", message: error.message };
    } else {
      const { error } = await supabase
        .from("attendance")
        .insert({ member_id: member.id, event_day: day, check_in_time: now });
      if (error) return { kind: "error", title: "Could not save", message: error.message };
    }
    return { kind: "success", member, day, mode, time: now };
  }

  // check-out
  if (!existing?.check_in_time) {
    return {
      kind: "error",
      title: "Can't check out — not checked in",
      message: `${displayName(member)} has no check-in recorded for ${day}.`,
    };
  }
  if (existing.check_out_time) {
    return {
      kind: "warning",
      title: "Already checked out today",
      message: `${displayName(member)} was already checked out for ${day}.`,
    };
  }
  const { error } = await supabase
    .from("attendance")
    .update({ check_out_time: now })
    .eq("id", existing.id);
  if (error) return { kind: "error", title: "Could not save", message: error.message };

  return { kind: "success", member, day, mode, time: now };
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
