import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Papa from "papaparse";
import { Lock, Plus, Search, Trash2, Upload, UserPlus2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { displayName, initials, normalizePhone, type Member } from "@/lib/attendance";
import { ADMIN_PASSWORD, AUXILIARY_GROUPS } from "@/lib/groups";
import { Avatar } from "@/components/Avatar";
import { SectionLabel } from "@/components/DayModeSelectors";
import fcLogo from "@/assets/fc-logo.jpeg.asset.json";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Holy Convocation" },
      { name: "description", content: "Manage members and bulk import attendance data." },
    ],
  }),
  component: AdminScreen,
});

const SESSION_KEY = "hc.admin.unlocked";

function AdminScreen() {
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_KEY) === "1";
  });
  if (!unlocked) return <Unlock onUnlock={() => { sessionStorage.setItem(SESSION_KEY, "1"); setUnlocked(true); }} />;
  return <AdminPanels />;
}

function Unlock({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) onUnlock();
    else { setErr(true); setTimeout(() => setErr(false), 1200); }
  }

  return (
    <main className="safe-top flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <img src={fcLogo.url} alt="" className="size-16 rounded-full object-cover ring-1 ring-white/15" />
      <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Admin Access</p>
      <h1 className="mt-2 font-display text-[28px] tracking-tight">Enter password</h1>

      <form onSubmit={submit} className="mt-8 w-full max-w-xs">
        <div className={`glass flex items-center gap-3 rounded-2xl px-5 py-4 ${err ? "ring-1 ring-[color:var(--destructive)]" : ""}`}>
          <Lock className="size-4 text-muted-foreground" strokeWidth={1.6} />
          <input
            autoFocus
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="w-full bg-transparent text-[16px] tracking-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
        {err && <p className="mt-3 text-center text-[12px] text-[color:var(--destructive)]">Incorrect password.</p>}
        <button
          type="submit"
          className="tap mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-white text-[15px] font-semibold tracking-tight text-[#0a0d1a] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.5)]"
        >
          Unlock
        </button>
      </form>
    </main>
  );
}

function AdminPanels() {
  return (
    <main className="safe-top relative flex min-h-[100dvh] flex-col px-5 pt-5">
      <header className="flex items-center gap-3">
        <img src={fcLogo.url} alt="" className="size-11 rounded-full object-cover ring-1 ring-white/15" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Admin</p>
          <h1 className="mt-0.5 font-display text-[22px] leading-none tracking-tight">Manage Members</h1>
        </div>
      </header>

      <section className="mt-8">
        <SectionLabel>Add Member</SectionLabel>
        <div className="mt-3"><AddMemberForm /></div>
      </section>

      <section className="mt-8">
        <SectionLabel>Bulk Import (CSV)</SectionLabel>
        <div className="mt-3"><BulkImport /></div>
      </section>

      <section className="mt-8">
        <SectionLabel>Existing Members</SectionLabel>
        <div className="mt-3"><MembersList /></div>
      </section>
    </main>
  );
}

/* ============================ Add Member ============================ */

const PLACEHOLDER_PHOTO = `https://api.dicebear.com/9.x/initials/svg?backgroundType=gradientLinear&fontFamily=Inter&seed=`;

async function uploadPhoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("member-photos").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage
    .from("member-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (sErr) throw sErr;
  return data.signedUrl;
}

function AddMemberForm() {
  const qc = useQueryClient();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState<string>(AUXILIARY_GROUPS[0]);
  const [customGroup, setCustomGroup] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function clear() {
    setFirst(""); setLast(""); setPhone(""); setGroup(AUXILIARY_GROUPS[0]);
    setCustomGroup(""); setUseCustom(false); setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!first.trim() || !last.trim() || !phone.trim()) {
      toast.error("First name, last name, and phone are required.");
      return;
    }
    const aux = (useCustom ? customGroup : group).trim();
    if (!aux) { toast.error("Choose or enter an auxiliary group."); return; }

    setSaving(true);
    try {
      let photoUrl = `${PLACEHOLDER_PHOTO}${encodeURIComponent(`${first} ${last}`)}`;
      if (photo) photoUrl = await uploadPhoto(photo);
      const normalized = normalizePhone(phone);
      const { error } = await supabase.from("members").insert({
        first_name: first.trim(),
        last_name: last.trim(),
        full_name: `${first.trim()} ${last.trim()}`,
        contact_number: phone.trim(),
        phone_normalized: normalized,
        auxiliary_group: aux,
        photo_url: photoUrl,
      });
      if (error) throw error;
      toast.success(`${first} ${last} added.`);
      clear();
      qc.invalidateQueries({ queryKey: ["members"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="glass space-y-3 rounded-2xl p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" value={first} onChange={setFirst} placeholder="Tshedza" />
        <Field label="Last name" value={last} onChange={setLast} placeholder="Tshipuke" />
      </div>
      <Field label="Phone number" value={phone} onChange={setPhone} placeholder="0820000001" type="tel" inputMode="tel" />

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">Auxiliary group</p>
        {!useCustom ? (
          <div className="flex gap-2">
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              {AUXILIARY_GROUPS.map((g) => (
                <option key={g} value={g} className="bg-[#0d1124] text-white">{g}</option>
              ))}
            </select>
            <button type="button" onClick={() => setUseCustom(true)} className="tap glass flex h-12 items-center gap-1.5 rounded-xl px-3 text-[12px] text-foreground">
              <Plus className="size-3.5" /> New
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={customGroup}
              onChange={(e) => setCustomGroup(e.target.value)}
              placeholder="New group name"
              className="h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <button type="button" onClick={() => { setUseCustom(false); setCustomGroup(""); }} className="tap glass flex h-12 items-center justify-center rounded-xl px-3 text-foreground">
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">Photo (optional)</p>
        <label className="tap glass flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-[13px] text-foreground">
          <Upload className="size-4" strokeWidth={1.8} />
          {photo ? photo.name : "Choose image"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="tap mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[14px] font-semibold tracking-tight text-[#0a0d1a] shadow-[0_10px_40px_-12px_rgba(255,255,255,0.5)] disabled:bg-white/30"
      >
        <UserPlus2 className="size-4" strokeWidth={2} />
        {saving ? "Saving…" : "Save Member"}
      </button>
    </form>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; inputMode?: "text" | "tel" | "numeric" | "email";
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">{label}</p>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30"
      />
    </div>
  );
}

/* ============================ Bulk Import ============================ */

type CsvRow = {
  firstName?: string; lastName?: string; phoneNumber?: string;
  auxiliaryGroup?: string; photoURL?: string;
};
type Parsed = { row: CsvRow; valid: boolean; reason?: string };

function BulkImport() {
  const qc = useQueryClient();
  const [parsed, setParsed] = useState<Parsed[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const rows: Parsed[] = res.data.map((r) => {
          const reason =
            !r.firstName?.trim() ? "Missing firstName" :
            !r.lastName?.trim() ? "Missing lastName" :
            !r.phoneNumber?.trim() ? "Missing phoneNumber" :
            !r.auxiliaryGroup?.trim() ? "Missing auxiliaryGroup" :
            undefined;
          return { row: r, valid: !reason, reason };
        });
        setParsed(rows);
      },
      error: () => toast.error("Could not parse CSV file."),
    });
  }

  async function confirmImport() {
    if (!parsed) return;
    const valid = parsed.filter((p) => p.valid);
    if (!valid.length) { toast.error("No valid rows to import."); return; }
    setImporting(true);
    try {
      const payload = valid.map(({ row }) => {
        const fn = row.firstName!.trim();
        const ln = row.lastName!.trim();
        return {
          first_name: fn,
          last_name: ln,
          full_name: `${fn} ${ln}`,
          contact_number: row.phoneNumber!.trim(),
          phone_normalized: normalizePhone(row.phoneNumber!),
          auxiliary_group: row.auxiliaryGroup!.trim(),
          photo_url: row.photoURL?.trim() || `${PLACEHOLDER_PHOTO}${encodeURIComponent(`${fn} ${ln}`)}`,
        };
      });
      const { error } = await supabase.from("members").insert(payload);
      if (error) throw error;
      const skipped = parsed.length - valid.length;
      toast.success(`${valid.length} added${skipped ? `, ${skipped} skipped` : ""}.`);
      setParsed(null); setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["members"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const validCount = parsed?.filter((p) => p.valid).length ?? 0;
  const invalidCount = parsed ? parsed.length - validCount : 0;

  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <p className="text-[12px] text-muted-foreground">
        Columns: <span className="text-foreground">firstName, lastName, phoneNumber, auxiliaryGroup, photoURL</span> (photoURL optional).
      </p>
      <label className="tap glass flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-[13px] text-foreground">
        <Upload className="size-4" strokeWidth={1.8} />
        {fileName || "Choose CSV file"}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>

      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[color:var(--success)]">{validCount} valid</span>
            <span className="text-[color:var(--warning)]">{invalidCount} skipped</span>
          </div>
          <div className="max-h-56 overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-[11.5px]">
              <thead className="bg-white/5 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Name</th>
                  <th className="px-2 py-1.5 font-medium">Phone</th>
                  <th className="px-2 py-1.5 font-medium">Group</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-2 py-1.5 text-foreground">{p.row.firstName} {p.row.lastName}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{p.row.phoneNumber}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{p.row.auxiliaryGroup}</td>
                    <td className={`px-2 py-1.5 ${p.valid ? "text-[color:var(--success)]" : "text-[color:var(--warning)]"}`}>
                      {p.valid ? "OK" : p.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setParsed(null); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}
              className="tap glass h-12 flex-1 rounded-xl text-[13px] font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={importing || !validCount}
              className="tap h-12 flex-[1.4] rounded-xl bg-white text-[13px] font-semibold text-[#0a0d1a] disabled:bg-white/30"
            >
              {importing ? "Importing…" : `Import ${validCount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ Members List ============================ */

function MembersList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);
  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members").select("*").order("first_name");
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const filtered = useMemo(() => {
    if (!members) return [];
    const needle = q.trim().toLowerCase();
    const phoneNeedle = normalizePhone(q);
    if (!needle) return members;
    return members.filter((m) => {
      const name = displayName(m).toLowerCase();
      const phone = (m.phone_normalized ?? "") + (m.contact_number ?? "");
      return name.includes(needle) || (phoneNeedle && phone.includes(phoneNeedle));
    });
  }, [members, q]);

  async function doDelete(m: Member) {
    const { error } = await supabase.from("members").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${displayName(m)} removed.`);
    setPendingDelete(null);
    qc.invalidateQueries({ queryKey: ["members"] });
  }

  return (
    <div className="space-y-3">
      <div className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3">
        <Search className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or phone"
          className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Clear" className="tap text-muted-foreground"><X className="size-4" /></button>
        )}
      </div>

      <div className="glass divide-y divide-white/5 overflow-hidden rounded-2xl">
        {isLoading && <p className="p-4 text-center text-[13px] text-muted-foreground">Loading…</p>}
        {!isLoading && !filtered.length && (
          <p className="p-6 text-center text-[13px] text-muted-foreground">No members found.</p>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar src={m.photo_url} initials={initials(m)} size={40} ring={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-foreground">{displayName(m)}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {m.contact_number ?? m.phone_normalized} · {m.auxiliary_group}
              </p>
            </div>
            <button
              onClick={() => setPendingDelete(m)}
              aria-label="Delete"
              className="tap rounded-full p-2.5 text-muted-foreground hover:text-[color:var(--destructive)]"
            >
              <Trash2 className="size-4" strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>

      {pendingDelete && (
        <ConfirmDelete
          member={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => doDelete(pendingDelete)}
        />
      )}
    </div>
  );
}

function ConfirmDelete({ member, onCancel, onConfirm }: { member: Member; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button aria-label="Close" onClick={onCancel} className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div className="safe-bottom animate-rise-in rounded-t-[28px] border-t border-white/10 bg-[#0d1124] px-6 pb-6 pt-7">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />
        <h2 className="text-center font-display text-[22px] tracking-tight">Remove {displayName(member)}?</h2>
        <p className="mt-2 text-center text-[13px] text-muted-foreground">This permanently deletes the member from the directory.</p>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button onClick={onCancel} className="tap glass h-13 rounded-2xl py-3.5 text-[14px] font-semibold text-foreground">Cancel</button>
          <button
            onClick={onConfirm}
            className="tap h-13 rounded-2xl bg-[color:var(--destructive)] py-3.5 text-[14px] font-semibold text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Silence unused-import warnings during fast iteration
void useEffect;
