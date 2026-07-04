import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

function csv(name: string, rows: any[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const s = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([s], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = name + ".csv"; a.click(); URL.revokeObjectURL(url);
}

export default function AdminGoalAccounts() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => { (async () => {
    let query = supabase.from("goal_accounts")
      .select("id,user_id,title,category,target_amount,unlocked_amount,deposit_required,deposit_paid,status,withdrawn_at,opened_at,closed_at,maturity_months")
      .order("opened_at", { ascending: false }).limit(2000);
    if (status) query = query.eq("status", status);
    const { data } = await query;
    setRows(data ?? []);
  })(); }, [status]);

  const filtered = rows.filter(r => !q || (r.title?.toLowerCase().includes(q.toLowerCase()) || r.user_id?.includes(q)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter title or user id"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border bg-background text-sm" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <button onClick={() => csv("goal_accounts", filtered)} className="text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1">
          <Download className="w-3 h-3" /> Export CSV
        </button>
      </div>
      <div className="bg-card rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-2">Title</th>
            <th className="text-right p-2">Target ₦</th>
            <th className="text-right p-2">Unlocked ₦</th>
            <th className="text-right p-2">%</th>
            <th className="text-right p-2">Deposit ₦</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Opened</th>
            <th className="text-left p-2">Withdrawn</th>
          </tr></thead>
          <tbody>
            {filtered.map(r => {
              const t = Number(r.target_amount ?? 0);
              const u = Number(r.unlocked_amount ?? 0);
              const pct = t > 0 ? Math.round((u/t)*100) : 0;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.title}<div className="text-[10px] text-muted-foreground">{r.user_id}</div></td>
                  <td className="p-2 text-right">{t.toLocaleString()}</td>
                  <td className="p-2 text-right">{u.toLocaleString()}</td>
                  <td className="p-2 text-right">{pct}%</td>
                  <td className="p-2 text-right">{Number(r.deposit_required ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-xs">{r.status}</td>
                  <td className="p-2 text-xs">{new Date(r.opened_at).toLocaleDateString()}</td>
                  <td className="p-2 text-xs">{r.withdrawn_at ? new Date(r.withdrawn_at).toLocaleDateString() : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}