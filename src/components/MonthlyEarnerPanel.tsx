import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMonthlyEarner, ME_MIN_REFERRALS, ME_RATE_PER_REFERRAL } from "@/hooks/useMonthlyEarner";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { toast } from "@/hooks/use-toast";
import { CalendarClock, Trophy, Upload, Users, Wallet, Link2, Camera, Loader2 } from "lucide-react";

interface Task {
  id: string; title: string; description: string; instructions: string; hashtag: string;
  challenge_type: string; total_videos: number; reward_per_video: number; posting_interval_days: number;
  proof_type: string; min_views: number;
}
interface Enrollment { id: string; challenge_id: string; pending_earnings: number; approved_earnings: number; completed: boolean; }
interface Submission { id: string; challenge_id: string; video_url: string; video_number: number; status: string; submitted_at: string; }
interface Contest {
  id: string; title: string; description: string | null; rules: string | null; target_referrals: number;
  period_days: number; prize_amount: number; prize_currency: string; prize_description: string | null;
  requires_contact: boolean; winner_count: number;
}
interface Win { id: string; contest_id: string; rank: number; contact_phone: string | null; }

const PROOF_LABEL: Record<string, string> = {
  video: "Post link (video)",
  link: "Post link",
  screenshot: "Screenshot proof",
};

export default function MonthlyEarnerPanel() {
  const { user, profile } = useAuth();
  const { formatCurrency } = useCurrency();
  const me = useMonthlyEarner();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [wins, setWins] = useState<Win[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadTasks = useCallback(async () => {
    if (!user) return;
    const [chRes, enRes, subRes, ctRes, winRes] = await Promise.all([
      supabase.from("influencer_challenges" as any).select("*").eq("is_active", true).in("program", ["monthly_earner", "both"]).order("created_at", { ascending: false }),
      supabase.from("influencer_challenge_enrollments" as any).select("*").eq("user_id", user.id),
      supabase.from("influencer_challenge_submissions" as any).select("*").eq("user_id", user.id).order("submitted_at", { ascending: false }),
      supabase.from("leaderboard_contests" as any).select("*").eq("is_active", true).in("program", ["monthly_earner", "both"]).order("created_at", { ascending: false }),
      supabase.from("leaderboard_contest_winners" as any).select("id, contest_id, rank, contact_phone").eq("user_id", user.id),
    ]);
    setTasks(((chRes.data as any) ?? []) as Task[]);
    setEnrollments(((enRes.data as any) ?? []) as Enrollment[]);
    setSubmissions(((subRes.data as any) ?? []) as Submission[]);
    setContests(((ctRes.data as any) ?? []) as Contest[]);
    setWins(((winRes.data as any) ?? []) as Win[]);
  }, [user]);

  useEffect(() => { if (me.isMember) void loadTasks(); }, [me.isMember, loadTasks]);

  if (!user || me.loading) return null;

  /* ── Invitation ─────────────────────────────────────── */
  if (!me.record) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-[14px]">Monthly Earners</h3>
        </div>
        <p className="text-[12px] text-muted-foreground mb-3">
          Earn cash every month instead of saving into a goal account. Refer at least {ME_MIN_REFERRALS} people in 30 days
          and earn {formatCurrency(ME_RATE_PER_REFERRAL)} per valid referral, plus a 20% bonus when you hit your target —
          withdrawable straight to your bank.
        </p>
        <ul className="text-[11px] text-muted-foreground space-y-1 mb-3 list-disc pl-4">
          <li>40 referrals ≈ {formatCurrency(40 * ME_RATE_PER_REFERRAL)} + {formatCurrency(40 * ME_RATE_PER_REFERRAL * 0.2)} bonus per month</li>
          <li>Miss the 40 minimum in your first 30 days and you simply return to a normal account</li>
          <li>Hit the minimum but miss your target and you still earn — just without the 20% bonus</li>
        </ul>
        <GlassButton variant="primary" className="w-full text-[12px]" onClick={async () => {
          try { await me.join(); toast({ title: "You're in!", description: "Your 30-day earning cycle has started." }); }
          catch (e: any) { toast({ title: "Could not join", description: e.message }); }
        }} disabled={me.joining}>
          {me.joining ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Join Monthly Earners
        </GlassButton>
      </GlassCard>
    );
  }

  if (me.isTerminated) {
    return (
      <GlassCard>
        <h3 className="font-semibold text-[14px] mb-1">Monthly Earners</h3>
        <p className="text-[12px] text-muted-foreground">
          {me.record.termination_reason ?? "You are no longer part of the programme."} Your referrals now build your goal account
          as a regular user.
        </p>
      </GlassCard>
    );
  }

  const pct = Math.min(100, Math.round((me.cycleReferrals / me.target) * 100));
  const referralLink = `${window.location.origin}/?ref=${profile?.referral_code ?? ""}`;

  const submitProof = async (task: Task, value: string) => {
    if (!user || !value) return;
    const enrollment = enrollments.find((e) => e.challenge_id === task.id);
    if (!enrollment) return;
    const next = submissions.filter((s) => s.challenge_id === task.id).length + 1;
    const { error } = await supabase.from("influencer_challenge_submissions" as any).insert({
      challenge_id: task.id, user_id: user.id, video_url: value, video_number: next,
    } as any);
    if (error) { toast({ title: "Error", description: error.message }); return; }
    await supabase.from("influencer_challenge_enrollments" as any)
      .update({ pending_earnings: (enrollment.pending_earnings || 0) + task.reward_per_video } as any)
      .eq("id", enrollment.id);
    setLinks((p) => ({ ...p, [task.id]: "" }));
    toast({ title: "Submitted", description: "An admin will review your proof." });
    await loadTasks();
  };

  const uploadScreenshot = async (task: Task, file: File) => {
    if (!user) return;
    setBusy(task.id);
    try {
      const path = `${user.id}/monthly-earner/${task.id}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "")}`;
      const { error } = await supabase.storage.from("survey_screenshots").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("survey_screenshots").getPublicUrl(path);
      await submitProof(task, data.publicUrl);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message });
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <GlassCard variant="strong">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-[14px]">Monthly Earners · Cycle {me.record.cycle_index}</h3>
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />{me.daysLeft} days left
          </span>
        </div>

        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span><Users className="w-3 h-3 inline mr-1" />{me.cycleReferrals} / {me.target} valid referrals</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="glass rounded-xl p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Commission</p>
            <p className="text-[13px] font-semibold">{formatCurrency(me.base)}</p>
          </div>
          <div className="glass rounded-xl p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">20% bonus</p>
            <p className="text-[13px] font-semibold">{me.bonus ? formatCurrency(me.bonus) : "—"}</p>
          </div>
          <div className="glass rounded-xl p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Wallet</p>
            <p className="text-[13px] font-semibold">{formatCurrency(me.walletBalance)}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-2">
          {me.cycleReferrals >= me.target
            ? "Target hit — your 20% bonus is paid when the cycle closes."
            : me.cycleReferrals >= ME_MIN_REFERRALS
              ? `Above the ${ME_MIN_REFERRALS} minimum — you keep earning, but the 20% bonus needs ${me.target} referrals.`
              : `Bring at least ${ME_MIN_REFERRALS} valid referrals before the cycle ends to stay in the programme.`}
        </p>

        <button
          onClick={() => { void navigator.clipboard.writeText(referralLink); toast({ title: "Referral link copied" }); }}
          className="mt-3 w-full glass rounded-xl px-3 py-2 text-[11px] flex items-center justify-center gap-2"
        >
          <Link2 className="w-3 h-3" /> Copy your referral link
        </button>
      </GlassCard>

      {/* Boost tasks */}
      <GlassCard>
        <h3 className="font-semibold text-[14px] mb-2">Boost tasks</h3>
        {tasks.length === 0 && <p className="text-[12px] text-muted-foreground">No tasks available right now.</p>}
        <div className="space-y-3">
          {tasks.map((task) => {
            const enrollment = enrollments.find((e) => e.challenge_id === task.id);
            const mySubs = submissions.filter((s) => s.challenge_id === task.id);
            const approved = mySubs.filter((s) => s.status === "approved").length;
            const canSubmit = mySubs.length < task.total_videos;
            return (
              <div key={task.id} className="glass rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(task.reward_per_video)} per submission · {PROOF_LABEL[task.proof_type] ?? "Proof"}
                      {task.min_views > 0 ? ` · min ${task.min_views} views` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{approved}/{task.total_videos}</span>
                </div>
                {task.description && <p className="text-[11px] text-muted-foreground mt-1">{task.description}</p>}
                {task.instructions && <p className="text-[11px] mt-1 whitespace-pre-wrap">{task.instructions}</p>}

                {!enrollment ? (
                  <GlassButton variant="primary" className="w-full text-[12px] mt-2" onClick={async () => {
                    await supabase.from("influencer_challenge_enrollments" as any).insert({ challenge_id: task.id, user_id: user.id } as any);
                    await loadTasks();
                  }}>Start task</GlassButton>
                ) : canSubmit ? (
                  task.proof_type === "screenshot" ? (
                    <>
                      <input
                        ref={(el) => { fileRefs.current[task.id] = el; }}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadScreenshot(task, f); e.target.value = ""; }}
                      />
                      <GlassButton variant="primary" className="w-full text-[12px] mt-2" disabled={busy === task.id}
                        onClick={() => fileRefs.current[task.id]?.click()}>
                        {busy === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Camera className="w-3.5 h-3.5 mr-1" />}
                        Upload screenshot
                      </GlassButton>
                    </>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <input
                        value={links[task.id] ?? ""}
                        onChange={(e) => setLinks((p) => ({ ...p, [task.id]: e.target.value }))}
                        placeholder="https://..."
                        className="w-full glass-input rounded-xl px-3 py-2 text-[13px]"
                        style={{ fontSize: 16 }}
                      />
                      <GlassButton variant="primary" className="w-full text-[12px]" disabled={!links[task.id]?.trim()}
                        onClick={() => void submitProof(task, links[task.id].trim())}>
                        <Upload className="w-3.5 h-3.5 mr-1" /> Submit proof
                      </GlassButton>
                    </div>
                  )
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-2">All submissions sent — awaiting review.</p>
                )}

                {mySubs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {mySubs.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-[10px]">
                        <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="text-primary truncate max-w-[65%]">#{s.video_number} proof</a>
                        <span className="text-muted-foreground">{s.status === "pending_review" ? "pending" : s.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Contests */}
      {contests.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-[14px]">Contests</h3>
          </div>
          <div className="space-y-3">
            {contests.map((c) => {
              const win = wins.find((w) => w.contest_id === c.id);
              return (
                <div key={c.id} className="glass rounded-xl p-3">
                  <p className="text-[13px] font-semibold">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    First {c.winner_count} to {c.target_referrals} valid referrals in {c.period_days} days ·{" "}
                    {c.prize_description || formatCurrency(c.prize_amount)}
                  </p>
                  {c.rules && <p className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap">{c.rules}</p>}
                  <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (me.cycleReferrals / c.target_referrals) * 100)}%` }} />
                  </div>
                  {win && (
                    <div className="mt-2">
                      <p className="text-[11px] text-primary font-semibold">You won — rank #{win.rank}! 🎉</p>
                      {c.requires_contact && !win.contact_phone && (
                        <div className="mt-2 flex gap-2">
                          <input
                            value={phone} onChange={(e) => setPhone(e.target.value)}
                            placeholder="Your phone number"
                            className="flex-1 glass-input rounded-xl px-3 py-2 text-[13px]" style={{ fontSize: 16 }}
                          />
                          <GlassButton variant="primary" className="text-[12px]" disabled={!phone.trim()} onClick={async () => {
                            await supabase.from("leaderboard_contest_winners" as any)
                              .update({ contact_phone: phone.trim(), contact_submitted_at: new Date().toISOString() } as any)
                              .eq("id", win.id);
                            await supabase.from("monthly_earners" as any).update({ contact_phone: phone.trim() } as any).eq("user_id", user.id);
                            setPhone("");
                            toast({ title: "Thanks!", description: "An admin will contact you shortly." });
                            await loadTasks();
                          }}>Send</GlassButton>
                        </div>
                      )}
                      {win.contact_phone && <p className="text-[10px] text-muted-foreground mt-1">We have your number — an admin will reach out.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}