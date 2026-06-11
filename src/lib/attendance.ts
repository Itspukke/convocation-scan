import { supabase } from "@/integrations/supabase/client";

export type EventDay = "Friday" | "Saturday" | "Sunday";
export type Mode = "check-in" | "check-out";

export type Member = {
  id: string;
  full_name: string;
  auxiliary_group: string;
  contact_number: string | null;
  photo_url: string | null;
  qr_code_value: string;
};

export type ScanOutcome =
  | { kind: "success"; member: Member; day: EventDay; mode: Mode; time: string }
  | { kind: "error" | "warning"; title: string; message: string };

export async function processScan(
  rawCode: string,
  day: EventDay,
  mode: Mode,
): Promise<ScanOutcome> {
  const code = rawCode.trim();
  if (!code) {
    return { kind: "error", title: "QR code not recognised", message: "Empty code." };
  }

  const { data: member, error: memberErr } = await supabase
    .from("members")
    .select("*")
    .eq("qr_code_value", code)
    .maybeSingle();

  if (memberErr) {
    return { kind: "error", title: "Connection issue", message: memberErr.message };
  }
  if (!member) {
    return {
      kind: "error",
      title: "QR code not recognised",
      message: "This QR code isn't on the registered member list.",
    };
  }

  const { data: existing, error: existingErr } = await supabase
    .from("attendance")
    .select("*")
    .eq("member_id", member.id)
    .eq("event_day", day)
    .maybeSingle();

  if (existingErr) {
    return { kind: "error", title: "Connection issue", message: existingErr.message };
  }

  const now = new Date().toISOString();

  if (mode === "check-in") {
    if (existing?.check_in_time) {
      return {
        kind: "warning",
        title: "Already checked in",
        message: `${member.full_name} was checked in earlier today.`,
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
    return { kind: "success", member: member as Member, day, mode, time: now };
  }

  // check-out
  if (!existing?.check_in_time) {
    return {
      kind: "error",
      title: "Can't check out",
      message: `${member.full_name} has no check-in for ${day}.`,
    };
  }
  if (existing.check_out_time) {
    return {
      kind: "warning",
      title: "Already checked out",
      message: `${member.full_name} was checked out earlier today.`,
    };
  }
  const { error } = await supabase
    .from("attendance")
    .update({ check_out_time: now })
    .eq("id", existing.id);
  if (error) return { kind: "error", title: "Could not save", message: error.message };

  return { kind: "success", member: member as Member, day, mode, time: now };
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
