import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Eye, Loader2, X } from "lucide-react";

export default function AdminUserTaskSubmissions() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string[]>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_task_submissions")
      .select("*, user_task_enrollments(user_id, task_id, user_tasks(title, duration_days, reward_points))")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [filter]);

  const view = async (row: any) => {
    const paths = (row.evidence ?? []).map((e: any) => e.path).filter(Boolean);
    if (!paths.length) return toast.error("No evidence attached");
    const { data, error } = await supabase.storage.from("task-evidence").createSignedUrls(paths, 3600);
    if (error) return toast.error(error.message);
    setLinks((l) => ({ ...l, [row.id]: (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[] }));
  };

  const review = async (row: any, status: "approved" | "rejected") => {
    setBusy(row.id);
    const notes = status === "rejected" ? prompt("Reason for rejection (optional)") ?? null : null;
    const { error } = await supabase.from("user_task_submissions")
      .update({ status, reviewer_notes: notes, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Day ${row.day_index} ${status}`);
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-[12px] capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> :
        rows.length === 0 ? <p className="text-[12px] text-muted-foreground">No {filter} submissions.</p> :
        rows.map((row) => {
          const task = row.user_task_enrollments?.user_tasks;
          return (
            <div key={row.id} className="glass-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{task?.title ?? "Task"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Day {row.day_index} of {task?.duration_days ?? "?"} · {new Date(row.created_at).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">{row.user_id}</div>
                  {row.note && <p className="text-[11px] mt-1">“{row.note}”</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => view(row)} className="p-2 rounded-lg text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></button>
                  {filter === "pending" && (
                    <>
                      <button disabled={busy === row.id} onClick={() => review(row, "approved")} className="p-2 rounded-lg text-primary"><Check className="w-4 h-4" /></button>
                      <button disabled={busy === row.id} onClick={() => review(row, "rejected")} className="p-2 rounded-lg text-destructive"><X className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
              {links[row.id]?.length ? (
                <div className="flex flex-wrap gap-2">
                  {links[row.id].map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">Evidence {i + 1}</a>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
    </div>
  );
}
