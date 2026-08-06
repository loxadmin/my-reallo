import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { toast } from "@/hooks/use-toast";
import { Wallet, RefreshCw, Download } from "lucide-react";

interface Row {
  id: string; user_id: string; status: string; cycle_index: number;
  cycle_start: string; cycle_end: string; target_referrals: number;
  last_cycle_referrals: number; contact_phone: string | null; termination_reason: string | null;
}

export default function AdminMonthlyEarners() {
  const [rows, setRows] = useState<Row[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("monthly_earners" as any).select("*").order("created_at", { ascending: false });
    const list = ((data as any) || []) as Row[];
    setRows(list);
    const ids = list.map(r => r.user_id);
    if (ids.length) {
      const [{ data: profs }, { data: refs }] = await Promise.all([
        supabase.from("profiles").select("id, email").in("id", ids),
        supabase.from("influencer_referrals" as any).select("influencer_id, validated_at, status").in("influencer_id", ids).eq("status", "valid"),
      ]);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.email; });
      setEmails(map);
      const tally: Record<string, number> = {};
      list.forEach(r => {
        tally[r.user_id] = ((refs as any) || []).filter((x: any) =>
          x.influencer_id === r.user_id && x.validated_at >= r.cycle_start && x.validated_at < r.cycle_end).length;
      });
      setCounts(tally);
    }
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const runCycles = async () => {
    setRunning(true);
    const { data, error } = await supabase.rpc("evaluate_monthly_earner_cycles" as any);
    setRunning(false);
    if (error) { toast({ title: "Error", description: error.message }); return; }
    toast({ title: `Processed ${data ?? 0} cycle(s)` });
    void load();
  };

  const exportCsv = () => {
    const header = "email,status,cycle,target,this_cycle_referrals,last_cycle,cycle_end,phone\n";
    const body = rows.map(r => [
      emails[r.user_id] || r.user_id, r.status, r.cycle_index, r.target_referrals,
      counts[r.user_id] ?? 0, r.last_cycle_referrals, r.cycle_end, r.contact_phone ?? "",
    ].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "monthly-earners.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Monthly Earners</h2>
        </div>
        <div className="flex gap-2">
          <GlassButton variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1" /> CSV</GlassButton>
          <GlassButton variant="primary" onClick={runCycles} disabled={running}>
            <RefreshCw className={`w-4 h-4 mr-1 ${running ? "animate-spin" : ""}`} /> Run cycle evaluation
          </GlassButton>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nobody has joined the programme yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            const count = counts[r.user_id] ?? 0;
            const target = Math.max(40, r.target_referrals);
            return (
              <GlassCard key={r.id} className="p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">{emails[r.user_id] || r.user_id.slice(0, 8)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Cycle {r.cycle_index} · {count}/{target} valid referrals · ends {new Date(r.cycle_end).toLocaleDateString()}
                    </p>
                    {r.contact_phone && <p className="text-[11px] text-muted-foreground">☎ {r.contact_phone}</p>}
                    {r.termination_reason && <p className="text-[11px] text-destructive">{r.termination_reason}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {r.status}
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (count / target) * 100)}%` }} />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}