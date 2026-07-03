import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type Profile = {
  user_id: string; segments: string[]; brands_used: string[]; spending_habits: string[];
  task_capabilities: string[]; financial: any; country?: string; state?: string; city?: string;
  age_group?: string; occupation?: string; updated_at: string;
};

function tally(rows: Profile[], key: keyof Profile) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = (r[key] as any);
    if (Array.isArray(v)) v.forEach((x: string) => m.set(x, (m.get(x) ?? 0) + 1));
    else if (typeof v === "string" && v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Array.from(m.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function csvDownload(name: string, rows: any[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = name + ".csv"; a.click(); URL.revokeObjectURL(url);
}

export default function AdminBehaviorAnalytics() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [country, setCountry] = useState(""); const [state, setState] = useState(""); const [city, setCity] = useState("");
  const [age, setAge] = useState(""); const [occ, setOcc] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("user_behavior_profile").select("*").limit(5000);
      setRows((data as any) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter(r =>
    (!country || r.country?.toLowerCase().includes(country.toLowerCase())) &&
    (!state || r.state?.toLowerCase().includes(state.toLowerCase())) &&
    (!city || r.city?.toLowerCase().includes(city.toLowerCase())) &&
    (!age || r.age_group === age) &&
    (!occ || r.occupation?.toLowerCase().includes(occ.toLowerCase())) &&
    (!from || new Date(r.updated_at) >= new Date(from)) &&
    (!to || new Date(r.updated_at) <= new Date(to))
  ), [rows, country, state, city, age, occ, from, to]);

  const brands = tally(filtered, "brands_used");
  const segs = tally(filtered, "segments");
  const habits = tally(filtered, "spending_habits");

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border p-4 grid grid-cols-2 md:grid-cols-7 gap-2 text-xs">
        <input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className="px-2 py-1.5 rounded border bg-background" />
        <input placeholder="State" value={state} onChange={e => setState(e.target.value)} className="px-2 py-1.5 rounded border bg-background" />
        <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="px-2 py-1.5 rounded border bg-background" />
        <input placeholder="Age group" value={age} onChange={e => setAge(e.target.value)} className="px-2 py-1.5 rounded border bg-background" />
        <input placeholder="Occupation" value={occ} onChange={e => setOcc(e.target.value)} className="px-2 py-1.5 rounded border bg-background" />
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-2 py-1.5 rounded border bg-background" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1.5 rounded border bg-background" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[["Brands Used", brands], ["Segments", segs], ["Spending Habits", habits]].map(([title, data]: any) => (
          <div key={title} className="bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">{title}</div>
              <button onClick={() => csvDownload(title.toLowerCase().replace(/\s+/g, "_"), data)} className="text-xs inline-flex items-center gap-1 text-primary"><Download className="w-3 h-3" /> CSV</button>
            </div>
            <div className="h-52">
              <ResponsiveContainer><BarChart data={data.slice(0, 10)}><XAxis dataKey="name" hide /><YAxis width={30} /><Tooltip /><Bar dataKey="count" /></BarChart></ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5 max-h-40 overflow-auto">
              {data.slice(0, 20).map((r: any) => <div key={r.name} className="flex justify-between"><span>{r.name}</span><span>{r.count}</span></div>)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-4 flex items-center justify-between">
        <div className="text-sm">{filtered.length} profiles matched</div>
        <button onClick={() => csvDownload("user_profiles", filtered.map(r => ({ ...r, segments: (r.segments ?? []).join("|"), brands_used: (r.brands_used ?? []).join("|"), spending_habits: (r.spending_habits ?? []).join("|"), task_capabilities: (r.task_capabilities ?? []).join("|"), financial: JSON.stringify(r.financial ?? {}) })))} className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground"><Download className="w-3 h-3" /> Export all</button>
      </div>
    </div>
  );
}