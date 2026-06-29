import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Trophy } from "lucide-react";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  prize_amount: number;
  prize_currency: string;
  winner_count: number;
  target_referrals: number;
  period_days: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

interface Winner {
  id: string;
  contest_id: string;
  user_id: string;
  rank: number;
  valid_referrals: number;
  prize_amount: number;
  awarded_at: string;
  paid: boolean;
}

const empty: Partial<Contest> = {
  title: "",
  description: "",
  rules: "",
  prize_amount: 1000000,
  prize_currency: "NGN",
  winner_count: 10,
  target_referrals: 1000,
  period_days: 30,
  is_active: true,
};

export default function AdminLeaderboardContests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [editing, setEditing] = useState<Partial<Contest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [cRes, wRes] = await Promise.all([
      supabase.from("leaderboard_contests" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("leaderboard_contest_winners" as any).select("*").order("rank", { ascending: true }),
    ]);
    const cs = ((cRes.data as any) || []) as Contest[];
    const ws = ((wRes.data as any) || []) as Winner[];
    setContests(cs);
    setWinners(ws);
    const ids = Array.from(new Set(ws.map(w => w.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.email; });
      setProfiles(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title) { toast({ title: "Title required" }); return; }
    const payload: any = {
      title: editing.title,
      description: editing.description || null,
      rules: editing.rules || null,
      prize_amount: Number(editing.prize_amount) || 0,
      prize_currency: editing.prize_currency || "NGN",
      winner_count: Number(editing.winner_count) || 10,
      target_referrals: Number(editing.target_referrals) || 1000,
      period_days: Number(editing.period_days) || 30,
      is_active: !!editing.is_active,
      ends_at: editing.ends_at || null,
    };
    const q = editing.id
      ? supabase.from("leaderboard_contests" as any).update(payload).eq("id", editing.id)
      : supabase.from("leaderboard_contests" as any).insert(payload);
    const { error } = await q;
    if (error) { toast({ title: "Error", description: error.message }); return; }
    toast({ title: editing.id ? "Contest updated" : "Contest created" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this contest and all its winner records?")) return;
    const { error } = await supabase.from("leaderboard_contests" as any).delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message }); return; }
    toast({ title: "Deleted" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Leaderboard Contests</h2>
        </div>
        <GlassButton variant="primary" onClick={() => setEditing({ ...empty })}>
          <Plus className="w-4 h-4 mr-1" /> New Contest
        </GlassButton>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {contests.map(c => {
            const cw = winners.filter(w => w.contest_id === c.id);
            return (
              <GlassCard key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{c.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                    <div className="text-[11px] text-muted-foreground mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>Prize: <span className="text-foreground font-medium">{c.prize_currency} {Number(c.prize_amount).toLocaleString()}</span></div>
                      <div>Winners: <span className="text-foreground font-medium">{cw.length} / {c.winner_count}</span></div>
                      <div>Target: <span className="text-foreground font-medium">{c.target_referrals} refs</span></div>
                      <div>Period: <span className="text-foreground font-medium">{c.period_days}d</span></div>
                    </div>
                    {c.rules && (
                      <details className="mt-2">
                        <summary className="text-[11px] text-primary cursor-pointer">Rules</summary>
                        <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap mt-1">{c.rules}</pre>
                      </details>
                    )}
                    {cw.length > 0 && (
                      <details className="mt-2" open>
                        <summary className="text-[11px] text-primary cursor-pointer">Winners ({cw.length})</summary>
                        <ul className="text-[11px] mt-1 space-y-0.5">
                          {cw.map(w => (
                            <li key={w.id} className="flex justify-between">
                              <span>#{w.rank} · {profiles[w.user_id] || w.user_id.slice(0, 8)}</span>
                              <span className="text-muted-foreground">{w.valid_referrals} refs · ₦{Number(w.prize_amount).toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setEditing(c)} className="p-2 rounded-lg hover:bg-muted">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(c.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
          {contests.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No contests yet.</p>}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <GlassCard className="p-5 w-full max-w-lg my-8" onClick={(e: any) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">{editing.id ? "Edit Contest" : "New Contest"}</h3>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-muted-foreground">Title</span>
                <input className="w-full glass-input rounded-lg px-3 py-2 mt-1"
                  value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Description</span>
                <textarea rows={2} className="w-full glass-input rounded-lg px-3 py-2 mt-1"
                  value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Rules (one per line)</span>
                <textarea rows={4} className="w-full glass-input rounded-lg px-3 py-2 mt-1 font-mono text-xs"
                  value={editing.rules || ""} onChange={e => setEditing({ ...editing, rules: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Prize amount</span>
                  <input type="number" className="w-full glass-input rounded-lg px-3 py-2 mt-1"
                    value={editing.prize_amount ?? 0} onChange={e => setEditing({ ...editing, prize_amount: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Currency</span>
                  <input className="w-full glass-input rounded-lg px-3 py-2 mt-1"
                    value={editing.prize_currency || "NGN"} onChange={e => setEditing({ ...editing, prize_currency: e.target.value.toUpperCase() })} />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Winner count</span>
                  <input type="number" className="w-full glass-input rounded-lg px-3 py-2 mt-1"
                    value={editing.winner_count ?? 10} onChange={e => setEditing({ ...editing, winner_count: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Target valid referrals</span>
                  <input type="number" className="w-full glass-input rounded-lg px-3 py-2 mt-1"
                    value={editing.target_referrals ?? 1000} onChange={e => setEditing({ ...editing, target_referrals: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Period (days)</span>
                  <input type="number" className="w-full glass-input rounded-lg px-3 py-2 mt-1"
                    value={editing.period_days ?? 30} onChange={e => setEditing({ ...editing, period_days: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Ends at (optional)</span>
                  <input type="datetime-local" className="w-full glass-input rounded-lg px-3 py-2 mt-1"
                    value={editing.ends_at ? editing.ends_at.slice(0, 16) : ""} onChange={e => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!editing.is_active}
                  onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
                Active
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <GlassButton variant="outline" onClick={() => setEditing(null)}>Cancel</GlassButton>
                <GlassButton variant="primary" onClick={save}>Save</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}