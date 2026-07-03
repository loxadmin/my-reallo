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

export default function AdminUserGoals() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { (async () => { const { data } = await supabase.from("user_goals").select("id,user_id,title,category,target_amount,target_date,status,created_at").order("created_at", { ascending: false }).limit(2000); setRows(data ?? []); })(); }, []);
  const filtered = rows.filter(r => !q || (r.title?.toLowerCase().includes(q.toLowerCase()) || r.category?.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by title or category" className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm" />
        <button onClick={() => csv("user_goals", filtered)} className="text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1"><Download className="w-3 h-3" /> Export CSV</button>
      </div>
      <div className="bg-card rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="text-left p-2">Title</th><th className="text-left p-2">Category</th><th className="text-right p-2">Target ₦</th><th className="text-left p-2">Target date</th><th className="text-left p-2">Status</th><th className="text-left p-2">Created</th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.title}</td>
                <td className="p-2 text-xs">{r.category ?? "-"}</td>
                <td className="p-2 text-right">{Number(r.target_amount ?? 0).toLocaleString()}</td>
                <td className="p-2 text-xs">{r.target_date ?? "-"}</td>
                <td className="p-2 text-xs">{r.status}</td>
                <td className="p-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}