import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";

type Proof = {
  id: string; enrollment_id: string; user_id: string; day_index: number;
  screenshot_url: string; status: string; admin_note: string | null; created_at: string;
};

export default function AdminOfferProofs() {
  const [rows, setRows] = useState<Proof[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [note, setNote] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("offer_daily_proofs").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const list = (data as any as Proof[]) ?? [];
    setRows(list);

    const enrollIds = Array.from(new Set(list.map(r => r.enrollment_id)));
    const userIds = Array.from(new Set(list.map(r => r.user_id)));
    if (enrollIds.length) {
      const { data: e } = await supabase.from("offer_enrollments").select("id, campaign_id, expected_days, status").in("id", enrollIds);
      const m: Record<string, any> = {}; (e ?? []).forEach((x: any) => { m[x.id] = x; }); setEnrollments(m);
    }
    if (userIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, email").in("id", userIds);
      const um: Record<string, string> = {}; (p ?? []).forEach((x: any) => { um[x.id] = x.email; }); setUsers(um);
    }
  };
  useEffect(() => { void load(); }, [filter]);

  const review = async (r: Proof, status: "approved" | "rejected") => {
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("offer_daily_proofs").update({
      status, admin_note: note[r.id] ?? null,
      reviewed_by: sess?.user?.id ?? null, reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: `Proof ${status}` });
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        {(["pending", "approved", "rejected", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md border ${filter === f ? "bg-primary text-primary-foreground" : "bg-background"}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map(r => {
          const e = enrollments[r.enrollment_id];
          return (
            <div key={r.id} className="bg-card rounded-xl border p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{e?.campaign_id ?? r.enrollment_id.slice(0, 8)}</div>
                  <div className="text-muted-foreground">{users[r.user_id] ?? r.user_id.slice(0, 8)} · Day {r.day_index}/{e?.expected_days ?? "?"}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  r.status === "approved" ? "bg-emerald-500/20 text-emerald-600" :
                  r.status === "rejected" ? "bg-destructive/10 text-destructive" :
                  "bg-amber-500/10 text-amber-600"
                }`}>{r.status}</span>
              </div>
              <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="block">
                <img src={r.screenshot_url} alt="proof" className="w-full max-h-56 object-contain rounded border" />
              </a>
              <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
                <ExternalLink className="w-3 h-3" /> Open full size
              </a>
              {r.status === "pending" && (
                <>
                  <input placeholder="Note (optional / rejection reason)" value={note[r.id] ?? ""}
                    onChange={ev => setNote({ ...note, [r.id]: ev.target.value })}
                    className="w-full px-2 py-1 rounded border bg-background" />
                  <div className="flex gap-2">
                    <button onClick={() => review(r, "approved")} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-emerald-500 text-white">
                      <CheckCircle2 className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => review(r, "rejected")} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-destructive text-destructive-foreground">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </>
              )}
              {r.admin_note && r.status !== "pending" && <div className="text-muted-foreground">Note: {r.admin_note}</div>}
            </div>
          );
        })}
        {rows.length === 0 && <div className="text-xs text-muted-foreground p-4">No proofs.</div>}
      </div>
    </div>
  );
}