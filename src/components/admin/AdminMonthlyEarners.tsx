import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { toast } from "@/hooks/use-toast";
import { Wallet, RefreshCw, Download, Plus, Trash2, ExternalLink, Check } from "lucide-react";

interface Row {
  id: string; user_id: string; status: string; cycle_index: number;
  cycle_start: string; cycle_end: string; target_referrals: number;
  last_cycle_referrals: number; contact_phone: string | null; termination_reason: string | null;
}

type Section = "members" | "tasks" | "withdrawals";

const emptyTask = {
  title: "", description: "", instructions: "", hashtag: "",
  proof_type: "link", reward_per_video: 2000, total_videos: 1, min_views: 30,
};

const input = "w-full px-3 py-2 rounded-lg border bg-background text-[12px]";
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-[11px] font-medium text-foreground">{label}</p>
    {children}
    {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
  </div>
);

export default function AdminMonthlyEarners() {
  const [section, setSection] = useState<Section>("members");
  const [rows, setRows] = useState<Row[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyTask });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("monthly_earners" as any).select("*").order("created_at", { ascending: false });
    const list = ((data as any) || []) as Row[];
    setRows(list);
    const ids = list.map(r => r.user_id);

    const [{ data: ch }, { data: cs }] = await Promise.all([
      supabase.from("influencer_challenges" as any).select("*").in("program", ["monthly_earner", "both"]).order("created_at", { ascending: false }),
      supabase.from("influencer_challenge_submissions" as any).select("*").order("submitted_at", { ascending: false }),
    ]);
    setTasks((ch as any) || []);
    setSubs((cs as any) || []);

    if (ids.length) {
      const [{ data: profs }, { data: refs }, { data: wds }, { data: bks }, { data: wls }] = await Promise.all([
        supabase.from("profiles").select("id, email").in("id", ids),
        supabase.from("influencer_referrals" as any).select("influencer_id, validated_at, status").in("influencer_id", ids).eq("status", "valid"),
        supabase.from("influencer_withdrawals" as any).select("*").in("user_id", ids).order("created_at", { ascending: false }),
        supabase.from("influencer_bank_accounts" as any).select("*").in("user_id", ids),
        supabase.from("influencer_wallets" as any).select("*").in("user_id", ids),
      ]);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.email; });
      setEmails(map);
      setWithdrawals((wds as any) || []);
      setBanks((bks as any) || []);
      setWallets((wls as any) || []);
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

  const createTask = async () => {
    if (!form.title.trim()) return toast({ title: "Give the task a title" });
    const { error } = await supabase.from("influencer_challenges" as any).insert({
      title: form.title.trim(), description: form.description || null,
      instructions: form.instructions || null, hashtag: form.hashtag || null,
      challenge_type: form.total_videos > 1 ? "set" : "single",
      total_videos: Math.max(1, form.total_videos),
      reward_per_video: Math.max(0, form.reward_per_video),
      posting_interval_days: 1, audience: "both",
      program: "monthly_earner", proof_type: form.proof_type,
      min_views: Math.max(0, form.min_views),
    } as any);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Task created for Monthly Earners" });
    setForm({ ...emptyTask });
    void load();
  };

  const reviewSub = async (sub: any, approve: boolean) => {
    await supabase.from("influencer_challenge_submissions" as any)
      .update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() } as any)
      .eq("id", sub.id);
    toast({ title: approve ? "Submission approved" : "Submission rejected" });
    void load();
  };

  const reviewWithdrawal = async (w: any, approve: boolean) => {
    if (!approve) {
      const wallet = wallets.find((x: any) => x.user_id === w.user_id);
      if (wallet) await supabase.from("influencer_wallets" as any).update({ balance: (wallet.balance || 0) + w.amount } as any).eq("id", wallet.id);
    }
    await supabase.from("influencer_withdrawals" as any)
      .update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() } as any)
      .eq("id", w.id);
    toast({ title: approve ? "Withdrawal approved" : "Withdrawal rejected, balance refunded" });
    void load();
  };

  const pendingSubs = subs.filter((s: any) => s.status === "pending_review" && tasks.some((t: any) => t.id === s.challenge_id));
  const pendingWd = withdrawals.filter((w: any) => w.status === "pending").length;

  const tabs: { id: Section; label: string }[] = [
    { id: "members", label: `Members (${rows.length})` },
    { id: "tasks", label: `Boost tasks (${tasks.length})` },
    { id: "withdrawals", label: `Withdrawals${pendingWd ? ` (${pendingWd})` : ""}` },
  ];

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

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`text-[11px] px-3 py-1.5 rounded-full border transition ${section === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && section === "members" && (
        rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nobody has joined the programme yet.</p> : (
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
        )
      )}

      {!loading && section === "tasks" && (
        <div className="space-y-4">
          <GlassCard className="p-4 space-y-3">
            <h3 className="text-[13px] font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Create a boost task</h3>
            <p className="text-[11px] text-muted-foreground">Boost tasks are extra paid jobs for Monthly Earners, e.g. "Post our link on your WhatsApp status and get 30 views".</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Task title" hint="What the earner sees first.">
                <input className={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="WhatsApp status post" />
              </Field>
              <Field label="Hashtag or campaign tag (optional)" hint="Shown so earners tag their post correctly.">
                <input className={input} value={form.hashtag} onChange={e => setForm({ ...form, hashtag: e.target.value })} placeholder="#KarbaliPays" />
              </Field>
              <Field label="Proof the earner must submit" hint="Link = they paste a post/status link. Screenshot = they upload an image. Video = a video post link.">
                <select className={input} value={form.proof_type} onChange={e => setForm({ ...form, proof_type: e.target.value })}>
                  <option value="link">Post link (WhatsApp / Instagram / X)</option>
                  <option value="screenshot">Screenshot upload</option>
                  <option value="video">Video post link</option>
                </select>
              </Field>
              <Field label="Minimum views required" hint="Set 0 if views don't matter. Used when reviewing the proof.">
                <input className={input} type="number" min={0} value={form.min_views} onChange={e => setForm({ ...form, min_views: Number(e.target.value) })} />
              </Field>
              <Field label="Number of posts required" hint="1 = one-off task. More than 1 creates a set they complete over several days.">
                <input className={input} type="number" min={1} value={form.total_videos} onChange={e => setForm({ ...form, total_videos: Number(e.target.value) })} />
              </Field>
              <Field label="Reward per approved post (₦)" hint="Paid into their withdrawable wallet after you approve the proof.">
                <input className={input} type="number" min={0} value={form.reward_per_video} onChange={e => setForm({ ...form, reward_per_video: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Short description" hint="One line summary on the task card.">
              <textarea className={`${input} min-h-[56px]`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Full instructions" hint="Step-by-step of exactly what to post and what proof to send.">
              <textarea className={`${input} min-h-[70px]`} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
            </Field>
            <GlassButton variant="primary" onClick={createTask}><Plus className="w-4 h-4 mr-1" /> Create task</GlassButton>
          </GlassCard>

          {tasks.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No boost tasks yet.</p> : tasks.map((t: any) => (
            <GlassCard key={t.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.proof_type ?? "video"} proof · ₦{Number(t.reward_per_video || 0).toLocaleString()} each · {t.total_videos} post(s)
                    {t.min_views ? ` · min ${t.min_views} views` : ""} · {t.program === "both" ? "Influencers + Monthly Earners" : "Monthly Earners"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={async () => { await supabase.from("influencer_challenges" as any).update({ is_active: !t.is_active } as any).eq("id", t.id); void load(); }}
                    className="text-[10px] px-2 py-1 rounded-md border">{t.is_active ? "Deactivate" : "Activate"}</button>
                  <button onClick={async () => { if (!confirm("Delete task?")) return; await supabase.from("influencer_challenges" as any).delete().eq("id", t.id); void load(); }}
                    className="text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </GlassCard>
          ))}

          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold">Proofs awaiting review ({pendingSubs.length})</h3>
            {pendingSubs.length === 0 ? <p className="text-[12px] text-muted-foreground">Nothing to review.</p> : pendingSubs.map((s: any) => (
              <GlassCard key={s.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px]">{emails[s.user_id] || s.user_id?.slice(0, 8)} · post #{s.video_number}</p>
                  {s.video_url && <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View proof</a>}
                </div>
                <div className="flex gap-2">
                  <GlassButton variant="primary" onClick={() => reviewSub(s, true)}><Check className="w-3 h-3 mr-1" /> Approve</GlassButton>
                  <GlassButton variant="outline" onClick={() => reviewSub(s, false)}>Reject</GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {!loading && section === "withdrawals" && (
        withdrawals.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No withdrawal requests from Monthly Earners yet.</p> : (
          <div className="space-y-2">
            {withdrawals.map((w: any) => {
              const bank = banks.find((b: any) => b.id === w.bank_account_id);
              return (
                <GlassCard key={w.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{emails[w.user_id] || w.user_id.slice(0, 8)}</p>
                      {bank && <p className="text-[11px] text-muted-foreground">{bank.bank_name} · {bank.account_number} · {bank.account_name}</p>}
                      <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-primary">₦{Number(w.amount).toLocaleString()}</p>
                      <span className="text-[10px] text-muted-foreground">{w.status}</span>
                    </div>
                  </div>
                  {w.status === "pending" && (
                    <div className="flex gap-2">
                      <GlassButton variant="primary" onClick={() => reviewWithdrawal(w, true)}><Check className="w-3 h-3 mr-1" /> Approve</GlassButton>
                      <GlassButton variant="outline" onClick={() => reviewWithdrawal(w, false)}>Reject &amp; refund</GlassButton>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
