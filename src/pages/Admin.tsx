import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import WaterBackground from "@/components/WaterBackground";
import { Users, Ghost, Activity, LogOut, RefreshCw, Shield, Settings, Save, MessageSquare, BarChart3, Plus, Trash2, Link, Upload, CheckCircle2, FileSpreadsheet, Smartphone, Check, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string; email: string; total_annual_spend: number; selected_goal: string | null;
  queue_position: number; referral_code: string | null; points_balance: number; created_at: string;
}
interface ActivityRow { id: string; user_id: string; action_type: string; positions_moved: number; created_at: string; }
interface GoalCategoryRow { id: string; goal_type: string; subcategory: string | null; label: string; max_price: number; }
interface QuestionnaireRow {
  id: string; title: string; is_active: boolean; points_reward: number; preferred_bank: string;
  switch_timer_days: number; switch_enabled: boolean; switch_link: string; why_switch_options: string[];
  current_bank_question: string; switch_question_template: string; category: string;
}
interface QResponseRow {
  id: string; user_id: string; questionnaire_id: string; current_bank: string; would_switch: boolean;
  switch_reason: string | null; switch_reason_freetext: string | null; points_awarded: number; completed_at: string;
}
interface VerificationTx {
  id: string; verification_id: string; user_id: string; transaction_id: string;
  is_verified: boolean; verified_amount: number | null; submitted_at: string;
}
interface DecisionAppRow {
  id: string; app_name: string; app_logo_url: string | null; category: string;
  points_select: number; points_switch_intent: number; points_switch_complete: number;
  switch_link: string | null; referral_message: string | null; referral_link: string | null;
  referral_points: number; is_active: boolean;
}
interface DecisionResponseRow {
  id: string; user_id: string; app_id: string; has_app: boolean; would_switch: boolean | null;
  switch_completed: boolean; referral_clicked: boolean; referral_screenshot_url: string | null;
  referral_approved: boolean; points_awarded: number; created_at: string;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const fromApps = () => supabase.from("decision_apps" as any);
const fromDResponses = () => supabase.from("decision_responses" as any);

const SURVEY_CATEGORIES = [
  { value: "bank_switch", label: "Bank Switch" },
  { value: "transport_switch", label: "Transport Switch" },
  { value: "food_purchase_switch", label: "Food Purchase Switch" },
  { value: "general_app_switch", label: "General App Switch" },
];

type AdminTab = "users" | "ghosts" | "activity" | "goals" | "questionnaires" | "analytics" | "settings" | "verification" | "decisions";

const Admin = () => {
  const { isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [ghostCount, setGhostCount] = useState(0);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [goalCategories, setGoalCategories] = useState<GoalCategoryRow[]>([]);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireRow[]>([]);
  const [qResponses, setQResponses] = useState<QResponseRow[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});
  const [verificationTxs, setVerificationTxs] = useState<VerificationTx[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [decisionApps, setDecisionApps] = useState<DecisionAppRow[]>([]);
  const [decisionResponses, setDecisionResponses] = useState<DecisionResponseRow[]>([]);

  const [verifyExpenseLink, setVerifyExpenseLink] = useState("");
  const [postQueueReferralPoints, setPostQueueReferralPoints] = useState("1000");
  const [verifySpendLink, setVerifySpendLink] = useState("");
  const [verifySpendDescription, setVerifySpendDescription] = useState("");

  const [newQ, setNewQ] = useState({
    title: "", points_reward: 100, preferred_bank: "", switch_timer_days: 30,
    switch_enabled: false, switch_link: "", why_switch_options: [""] as string[], category: "bank_switch",
  });

  const [newApp, setNewApp] = useState({
    app_name: "", app_logo_url: "", category: "yes_no" as string,
    points_select: 500, points_switch_intent: 2000, points_switch_complete: 10000,
    switch_link: "", referral_message: "", referral_link: "", referral_points: 10000,
  });

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [loading, isAdmin, navigate]);

  const fetchData = async () => {
    setRefreshing(true);
    const [profilesRes, ghostsRes, activityRes, goalsRes, qRes, qrRes, settingsRes, vtRes, daRes, drRes] = await Promise.all([
      supabase.from("profiles").select("*").order("queue_position", { ascending: true }),
      supabase.from("ghost_users").select("id", { count: "exact", head: true }),
      supabase.from("waitlist_activity").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("goal_categories").select("*").order("goal_type"),
      supabase.from("questionnaires").select("*").order("created_at", { ascending: false }),
      supabase.from("questionnaire_responses").select("*").order("completed_at", { ascending: false }),
      supabase.from("admin_settings").select("*"),
      supabase.from("verification_transactions").select("*").order("submitted_at", { ascending: false }).limit(200),
      fromApps().select("*").order("created_at", { ascending: false }),
      fromDResponses().select("*").order("created_at", { ascending: false }),
    ]);

    const profs = (profilesRes.data as ProfileRow[]) || [];
    setProfiles(profs);
    setGhostCount(ghostsRes.count || 0);
    setActivities((activityRes.data as ActivityRow[]) || []);
    setGoalCategories((goalsRes.data as GoalCategoryRow[]) || []);
    setQuestionnaires((qRes.data as QuestionnaireRow[]) || []);
    setQResponses((qrRes.data as QResponseRow[]) || []);
    setVerificationTxs((vtRes.data as VerificationTx[]) || []);
    setDecisionApps((daRes.data || []) as unknown as DecisionAppRow[]);
    setDecisionResponses((drRes.data || []) as unknown as DecisionResponseRow[]);
    setEditedPrices({});

    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    setVerifyExpenseLink(settings.find(s => s.key === "verify_expense_link")?.value || "");
    setPostQueueReferralPoints(settings.find(s => s.key === "post_queue_referral_points")?.value || "1000");
    setVerifySpendLink(settings.find(s => s.key === "verify_spend_link")?.value || "");
    setVerifySpendDescription(settings.find(s => s.key === "verify_spend_description")?.value || "");

    const counts: Record<string, number> = {};
    for (const p of profs) {
      const { count } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", p.id);
      counts[p.id] = count || 0;
    }
    setReferralCounts(counts);
    setRefreshing(false);
  };

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const handlePriceChange = (id: string, value: string) => setEditedPrices(prev => ({ ...prev, [id]: value }));

  const handleSavePrices = async () => {
    setSaving(true);
    for (const [id, priceStr] of Object.entries(editedPrices)) {
      const price = parseInt(priceStr, 10);
      if (!isNaN(price) && price >= 0) {
        await supabase.from("goal_categories").update({ max_price: price }).eq("id", id);
      }
    }
    toast({ title: "Prices updated" });
    await fetchData();
    setSaving(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    await Promise.all([
      supabase.from("admin_settings").upsert({ key: "verify_expense_link", value: verifyExpenseLink, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "post_queue_referral_points", value: postQueueReferralPoints, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_spend_link", value: verifySpendLink, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_spend_description", value: verifySpendDescription, updated_at: new Date().toISOString() }),
    ]);
    toast({ title: "Settings saved" });
    setSaving(false);
  };

  const handleCreateQuestionnaire = async () => {
    if (!newQ.title || !newQ.preferred_bank) return;
    await supabase.from("questionnaires").insert({
      title: newQ.title, points_reward: newQ.points_reward, preferred_bank: newQ.preferred_bank,
      switch_timer_days: newQ.switch_timer_days, switch_enabled: newQ.switch_enabled, switch_link: newQ.switch_link,
      why_switch_options: newQ.why_switch_options.filter(o => o.trim()), category: newQ.category,
    });
    toast({ title: "Questionnaire created" });
    setNewQ({ title: "", points_reward: 100, preferred_bank: "", switch_timer_days: 30, switch_enabled: false, switch_link: "", why_switch_options: [""], category: "bank_switch" });
    await fetchData();
  };

  const handleDeleteQuestionnaire = async (id: string) => {
    await supabase.from("questionnaire_responses").delete().eq("questionnaire_id", id);
    await supabase.from("questionnaires").delete().eq("id", id);
    toast({ title: "Questionnaire deleted" });
    await fetchData();
  };

  const handleToggleQuestionnaire = async (id: string, active: boolean) => {
    await supabase.from("questionnaires").update({ is_active: !active }).eq("id", id);
    await fetchData();
  };

  const handleCreateDecisionApp = async () => {
    if (!newApp.app_name) return;
    await fromApps().insert({
      app_name: newApp.app_name,
      app_logo_url: newApp.app_logo_url || null,
      category: newApp.category,
      points_select: newApp.points_select,
      points_switch_intent: newApp.points_switch_intent,
      points_switch_complete: newApp.points_switch_complete,
      switch_link: newApp.switch_link || null,
      referral_message: newApp.referral_message || null,
      referral_link: newApp.referral_link || null,
      referral_points: newApp.referral_points,
      is_active: true,
    });
    toast({ title: "Decision app created" });
    setNewApp({ app_name: "", app_logo_url: "", category: "yes_no", points_select: 500, points_switch_intent: 2000, points_switch_complete: 10000, switch_link: "", referral_message: "", referral_link: "", referral_points: 10000 });
    await fetchData();
  };

  const handleDeleteDecisionApp = async (id: string) => {
    await fromDResponses().delete().eq("app_id", id);
    await fromApps().delete().eq("id", id);
    toast({ title: "Decision app deleted" });
    await fetchData();
  };

  const handleToggleDecisionApp = async (id: string, active: boolean) => {
    await fromApps().update({ is_active: !active }).eq("id", id);
    await fetchData();
  };

  const handleApproveReferral = async (responseId: string, appId: string, userId: string) => {
    const app = decisionApps.find(a => a.id === appId);
    if (!app) {
      toast({ title: "Error", description: "App not found", variant: "destructive" });
      return;
    }
    
    try {
      const { error: updateError } = await fromDResponses()
        .update({ referral_approved: true, points_awarded: app.referral_points })
        .eq("id", responseId);

      if (updateError) throw updateError;

      const { data: profile, error: fetchError } = await supabase.from("profiles").select("points_balance").eq("id", userId).single();
      if (fetchError) throw fetchError;

      const { error: profileError } = await supabase.from("profiles")
        .update({ points_balance: (profile?.points_balance || 0) + app.referral_points })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({ title: "Referral approved", description: `${app.referral_points} points awarded to user.` });
      await fetchData();
    } catch (err: any) {
      console.error("Approval error:", err);
      toast({ title: "Approval failed", description: err.message || "An error occurred", variant: "destructive" });
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const rows = lines.slice(1).map(line => {
        const parts = line.split(",").map(s => s.trim().replace(/^\"|\"$/g, ""));
        return { transaction_id: parts[0], amount: parseFloat(parts[1]) || 0 };
      }).filter(r => r.transaction_id);

      let matchCount = 0;
      for (const row of rows) {
        const { data: matches } = await supabase.from("verification_transactions").select("id, user_id, verification_id").eq("transaction_id", row.transaction_id).eq("is_verified", false);
        if (matches && matches.length > 0) {
          for (const match of matches) {
            await supabase.from("verification_transactions").update({ is_verified: true, verified_amount: row.amount }).eq("id", match.id);
            matchCount++;
            const { data: allTxs } = await supabase.from("verification_transactions").select("is_verified, verified_amount").eq("verification_id", match.verification_id);
            if (allTxs && allTxs.every(t => t.is_verified)) {
              const totalMonthly = allTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0);
              const annualAmount = Math.round(totalMonthly * 12);
              await supabase.from("spend_verifications").update({ status: "verified", recalculated_amount: annualAmount }).eq("id", match.verification_id);
              await supabase.from("profiles").update({ total_annual_spend: annualAmount }).eq("id", match.user_id);
            }
          }
        }
      }
      toast({ title: `CSV processed`, description: `${matchCount} transactions matched from ${rows.length} rows.` });
      await fetchData();
    } catch {
      toast({ title: "CSV error", description: "Failed to process CSV file." });
    }
    setCsvUploading(false);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground text-[13px]">Loading...</p></div>;
  if (!isAdmin) return null;

  const tabs: { id: AdminTab; label: string; icon: any; count: number }[] = [
    { id: "users", label: "Users", icon: Users, count: profiles.length },
    { id: "ghosts", label: "Ghosts", icon: Ghost, count: ghostCount },
    { id: "activity", label: "Activity", icon: Activity, count: activities.length },
    { id: "goals", label: "Goals", icon: Settings, count: goalCategories.length },
    { id: "decisions", label: "Decisions", icon: Smartphone, count: decisionApps.length },
    { id: "questionnaires", label: "Surveys", icon: MessageSquare, count: questionnaires.length },
    { id: "analytics", label: "Analytics", icon: BarChart3, count: qResponses.length },
    { id: "verification", label: "Verify", icon: CheckCircle2, count: verificationTxs.length },
    { id: "settings", label: "Settings", icon: Link, count: 0 },
  ];

  const switchCount = qResponses.filter(r => r.would_switch).length;
  const noSwitchCount = qResponses.filter(r => !r.would_switch).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <WaterBackground />

      <div className="sticky top-0 z-50 px-4 py-3">
        <div className="max-w-5xl mx-auto glass-strong rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-base font-bold gradient-text">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <GlassButton variant="outline" onClick={fetchData} disabled={refreshing} className="px-3 py-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </GlassButton>
            <GlassButton variant="outline" onClick={() => navigate("/")} className="px-3 py-2 text-[11px]">Home</GlassButton>
            <GlassButton variant="outline" onClick={signOut} className="px-3 py-2"><LogOut className="w-4 h-4" /></GlassButton>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-shrink-0">
                <GlassCard animate={false} variant={activeTab === tab.id ? "glow" : "default"} className="text-center p-3 cursor-pointer min-w-[65px]">
                  <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                  <p className="font-semibold text-foreground text-[13px]">{tab.count}</p>
                  <p className="text-[9px] text-muted-foreground">{tab.label}</p>
                </GlassCard>
              </button>
            );
          })}
        </div>

        {/* Users tab */}
        {activeTab === "users" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">Registered Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground text-[11px]">Email</th>
                    <th className="text-right py-2 px-2 text-muted-foreground text-[11px]">Spend</th>
                    <th className="text-right py-2 px-2 text-muted-foreground text-[11px]">Queue #</th>
                    <th className="text-right py-2 px-2 text-muted-foreground text-[11px]">Points</th>
                    <th className="text-right py-2 px-2 text-muted-foreground text-[11px]">Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-foreground truncate max-w-[120px]">{p.email}</td>
                      <td className="py-2 px-2 text-right text-primary">{formatNaira(p.total_annual_spend || 0)}</td>
                      <td className="py-2 px-2 text-right font-bold text-foreground">{p.queue_position}</td>
                      <td className="py-2 px-2 text-right text-primary">{p.points_balance || 0}</td>
                      <td className="py-2 px-2 text-right text-foreground">{referralCounts[p.id] || 0}</td>
                    </tr>
                  ))}
                  {profiles.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No users yet</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* Ghosts */}
        {activeTab === "ghosts" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">Ghost Users</h3>
            <div className="text-center py-8">
              <Ghost className="w-10 h-10 text-primary/30 mx-auto mb-3" />
              <p className="text-3xl font-bold gradient-text">{ghostCount}</p>
              <p className="text-[12px] text-muted-foreground mt-2">Ghost users seeded in the waitlist queue</p>
            </div>
          </GlassCard>
        )}

        {/* Activity */}
        {activeTab === "activity" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between glass rounded-xl p-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-mono">{a.user_id.slice(0, 8)}...</p>
                    <p className="text-[13px] capitalize text-foreground">{a.action_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-primary">+{a.positions_moved} skip</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-center py-8 text-muted-foreground text-[13px]">No activity yet</p>}
            </div>
          </GlassCard>
        )}

        {/* Goals */}
        {activeTab === "goals" && (
          <GlassCard animate={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-[13px]">Goal Pricing</h3>
              {Object.keys(editedPrices).length > 0 && (
                <GlassButton variant="primary" onClick={handleSavePrices} disabled={saving} className="px-4 py-2 text-[11px]">
                  <Save className="w-3 h-3 mr-1 inline" /> {saving ? "Saving..." : "Save"}
                </GlassButton>
              )}
            </div>
            <div className="space-y-3">
              {goalCategories.map((cat) => (
                <div key={cat.id} className="glass rounded-xl p-4">
                  <p className="font-semibold text-foreground text-[13px] capitalize mb-2">
                    {cat.goal_type}{cat.subcategory ? ` → ${cat.label}` : ` — ${cat.label}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Max ₦</span>
                    <input type="number" value={editedPrices[cat.id] !== undefined ? editedPrices[cat.id] : String(cat.max_price)} onChange={(e) => handlePriceChange(cat.id, e.target.value)} className="flex-1 glass-input rounded-lg px-3 py-2 text-[13px] text-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Decisions tab - NEW */}
        {activeTab === "decisions" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <h3 className="font-semibold text-foreground text-[13px] mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Add App to Checklist
              </h3>
              <div className="space-y-3">
                <input value={newApp.app_name} onChange={e => setNewApp(p => ({ ...p, app_name: e.target.value }))} placeholder="App name (e.g. OPay, Temu)" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                <input value={newApp.app_logo_url} onChange={e => setNewApp(p => ({ ...p, app_logo_url: e.target.value }))} placeholder="Logo URL (optional)" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Category:</p>
                  <select value={newApp.category} onChange={e => setNewApp(p => ({ ...p, category: e.target.value }))} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] bg-transparent">
                    <option value="yes_no" className="bg-background">Yes/No (Switch Offer)</option>
                    <option value="referral" className="bg-background">Referral (Try It Out)</option>
                  </select>
                </div>

                {newApp.category === "yes_no" && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Select pts</p>
                        <input type="number" value={newApp.points_select} onChange={e => setNewApp(p => ({ ...p, points_select: parseInt(e.target.value) || 0 }))} className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Switch intent pts</p>
                        <input type="number" value={newApp.points_switch_intent} onChange={e => setNewApp(p => ({ ...p, points_switch_intent: parseInt(e.target.value) || 0 }))} className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Switch complete pts</p>
                        <input type="number" value={newApp.points_switch_complete} onChange={e => setNewApp(p => ({ ...p, points_switch_complete: parseInt(e.target.value) || 0 }))} className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                      </div>
                    </div>
                    <input value={newApp.switch_link} onChange={e => setNewApp(p => ({ ...p, switch_link: e.target.value }))} placeholder="Switch link URL" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                  </>
                )}

                {newApp.category === "referral" && (
                  <>
                    <textarea value={newApp.referral_message} onChange={e => setNewApp(p => ({ ...p, referral_message: e.target.value }))} placeholder="Referral message (shown to users who don't have this app)" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] min-h-[60px] resize-none" />
                    <input value={newApp.referral_link} onChange={e => setNewApp(p => ({ ...p, referral_link: e.target.value }))} placeholder="Referral/download link" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Referral points (after admin approval)</p>
                      <input type="number" value={newApp.referral_points} onChange={e => setNewApp(p => ({ ...p, referral_points: parseInt(e.target.value) || 0 }))} className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                    </div>
                  </>
                )}

                <GlassButton variant="primary" onClick={handleCreateDecisionApp} className="w-full text-[13px]">
                  Add App
                </GlassButton>
              </div>
            </GlassCard>

            {/* Existing apps */}
            {decisionApps.map(app => {
              const appResponses = decisionResponses.filter(r => r.app_id === app.id);
              const pendingApprovals = appResponses.filter(r => r.referral_screenshot_url && !r.referral_approved);
              return (
                <GlassCard key={app.id} animate={false}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {app.app_logo_url ? (
                        <img src={app.app_logo_url} alt={app.app_name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                          {app.app_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-foreground text-[13px]">{app.app_name}</h4>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {app.category === "yes_no" ? "Yes/No" : "Referral"} • {app.is_active ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlassButton variant="outline" onClick={() => handleToggleDecisionApp(app.id, app.is_active)} className="px-3 py-1 text-[11px]">
                        {app.is_active ? "Deactivate" : "Activate"}
                      </GlassButton>
                      <button onClick={() => handleDeleteDecisionApp(app.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Responses: {appResponses.length} • 
                    {app.category === "yes_no" 
                      ? ` Select: ${app.points_select}pts | Intent: ${app.points_switch_intent}pts | Complete: ${app.points_switch_complete}pts`
                      : ` Referral: ${app.referral_points}pts`
                    }
                  </p>

                  {/* Pending referral approvals */}
                  {pendingApprovals.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] text-primary font-semibold">Pending Approvals ({pendingApprovals.length})</p>
                      {pendingApprovals.map(pr => {
                        const userEmail = profiles.find(p => p.id === pr.user_id)?.email || pr.user_id.slice(0, 8);
                        return (
                          <div key={pr.id} className="flex items-center justify-between glass rounded-xl p-2">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-muted-foreground">{userEmail}</span>
                              {pr.referral_screenshot_url && (
                                <a
                                  href={supabase.storage.from("referral_screenshots").getPublicUrl(pr.referral_screenshot_url).data.publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary flex items-center gap-1 hover:underline mt-0.5"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" /> View Screenshot
                                </a>
                              )}
                            </div>
                            <GlassButton variant="primary" onClick={() => handleApproveReferral(pr.id, pr.app_id, pr.user_id)} className="px-3 py-1 text-[10px]">
                              <Check className="w-3 h-3 mr-1 inline" /> Approve
                            </GlassButton>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Questionnaires */}
        {activeTab === "questionnaires" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <h3 className="font-semibold text-foreground text-[13px] mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Create Questionnaire
              </h3>
              <div className="space-y-3">
                <input value={newQ.title} onChange={e => setNewQ(p => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                <select value={newQ.category} onChange={e => setNewQ(p => ({ ...p, category: e.target.value }))} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] bg-transparent">
                  {SURVEY_CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-background">{c.label}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input value={newQ.preferred_bank} onChange={e => setNewQ(p => ({ ...p, preferred_bank: e.target.value }))} placeholder="Preferred bank/app" className="glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                  <input type="number" value={newQ.points_reward} onChange={e => setNewQ(p => ({ ...p, points_reward: parseInt(e.target.value) || 0 }))} placeholder="Points" className="glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={newQ.switch_timer_days} onChange={e => setNewQ(p => ({ ...p, switch_timer_days: parseInt(e.target.value) || 30 }))} placeholder="Timer days" className="glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                  <input value={newQ.switch_link} onChange={e => setNewQ(p => ({ ...p, switch_link: e.target.value }))} placeholder="Switch link" className="glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={newQ.switch_enabled} onChange={e => setNewQ(p => ({ ...p, switch_enabled: e.target.checked }))} className="accent-primary" />
                  <span className="text-[13px] text-muted-foreground">Enable switch button</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Why-switch options:</p>
                {newQ.why_switch_options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={opt} onChange={e => { const opts = [...newQ.why_switch_options]; opts[i] = e.target.value; setNewQ(p => ({ ...p, why_switch_options: opts })); }} placeholder={`Option ${i + 1}`} className="flex-1 glass-input rounded-xl px-4 py-2 text-foreground text-[13px]" />
                    {newQ.why_switch_options.length > 1 && <button onClick={() => setNewQ(p => ({ ...p, why_switch_options: p.why_switch_options.filter((_, j) => j !== i) }))} className="text-destructive"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
                <button onClick={() => setNewQ(p => ({ ...p, why_switch_options: [...p.why_switch_options, ""] }))} className="text-[11px] text-primary">+ Add option</button>
                <GlassButton variant="primary" onClick={handleCreateQuestionnaire} className="w-full text-[13px]">Create Questionnaire</GlassButton>
              </div>
            </GlassCard>

            {questionnaires.map(q => (
              <GlassCard key={q.id} animate={false}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground text-[13px]">{q.title}</h4>
                    <p className="text-[11px] text-muted-foreground">{q.points_reward} pts • {q.preferred_bank} • {q.switch_timer_days}d{q.switch_enabled && " • Switch ON"}</p>
                    <p className="text-[10px] text-primary mt-0.5 capitalize">{SURVEY_CATEGORIES.find(c => c.value === q.category)?.label || q.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <GlassButton variant="outline" onClick={() => handleToggleQuestionnaire(q.id, q.is_active)} className="px-3 py-1 text-[11px]">{q.is_active ? "Deactivate" : "Activate"}</GlassButton>
                    <button onClick={() => handleDeleteQuestionnaire(q.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Responses: {qResponses.filter(r => r.questionnaire_id === q.id).length} | Would switch: {qResponses.filter(r => r.questionnaire_id === q.id && r.would_switch).length}</p>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Analytics */}
        {activeTab === "analytics" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">Questionnaire Analytics</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-primary">{switchCount}</p>
                <p className="text-[11px] text-muted-foreground">Would Switch</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-foreground">{noSwitchCount}</p>
                <p className="text-[11px] text-muted-foreground">Declined</p>
              </div>
            </div>
            {questionnaires.map(q => {
              const qr = qResponses.filter(r => r.questionnaire_id === q.id);
              const yesCount = qr.filter(r => r.would_switch).length;
              return (
                <div key={q.id} className="glass rounded-xl p-4 mb-3">
                  <p className="font-semibold text-foreground text-[13px]">{q.title}</p>
                  <p className="text-[10px] text-primary capitalize">{SURVEY_CATEGORIES.find(c => c.value === q.category)?.label || q.category}</p>
                  <div className="flex gap-4 mt-2">
                    <p className="text-[11px] text-primary">{yesCount} yes</p>
                    <p className="text-[11px] text-muted-foreground">{qr.length - yesCount} no</p>
                    <p className="text-[11px] text-muted-foreground">{qr.length} total</p>
                  </div>
                </div>
              );
            })}
          </GlassCard>
        )}

        {/* Verification */}
        {activeTab === "verification" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <h3 className="font-semibold text-foreground text-[13px] mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Upload Transaction CSV
              </h3>
              <p className="text-[11px] text-muted-foreground mb-3">CSV columns: <span className="font-mono">transaction_id, amount</span></p>
              <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              <GlassButton variant="primary" onClick={() => csvInputRef.current?.click()} className="w-full text-[13px]" disabled={csvUploading}>
                <FileSpreadsheet className="inline w-4 h-4 mr-2" /> {csvUploading ? "Processing..." : "Upload CSV"}
              </GlassButton>
            </GlassCard>
            <GlassCard animate={false}>
              <h3 className="font-semibold text-foreground text-[13px] mb-4">User Transactions</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-primary">{verificationTxs.filter(t => t.is_verified).length}</p>
                  <p className="text-[10px] text-muted-foreground">Verified</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{verificationTxs.filter(t => !t.is_verified).length}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {verificationTxs.map(tx => {
                  const userEmail = profiles.find(p => p.id === tx.user_id)?.email || tx.user_id.slice(0, 8);
                  return (
                    <div key={tx.id} className="flex items-center justify-between glass rounded-xl p-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{userEmail}</p>
                        <p className="text-[13px] font-mono text-foreground">{tx.transaction_id}</p>
                      </div>
                      <div className="text-right">
                        {tx.is_verified ? (
                          <div className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[11px]">₦{tx.verified_amount?.toLocaleString("en-NG")}</span>
                          </div>
                        ) : <span className="text-[11px] text-muted-foreground">Pending</span>}
                      </div>
                    </div>
                  );
                })}
                {verificationTxs.length === 0 && <p className="text-center py-8 text-muted-foreground text-[13px]">No transactions submitted yet</p>}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Settings */}
        {activeTab === "settings" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">App Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[13px] text-muted-foreground">Verify Expense Button Link</label>
                <input value={verifyExpenseLink} onChange={e => setVerifyExpenseLink(e.target.value)} placeholder="https://..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Post-Queue Referral Points</label>
                <input type="number" value={postQueueReferralPoints} onChange={e => setPostQueueReferralPoints(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1" />
                <p className="text-[11px] text-muted-foreground mt-1">Points per referral after off queue</p>
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Verify Spend Link</label>
                <input value={verifySpendLink} onChange={e => setVerifySpendLink(e.target.value)} placeholder="https://..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Verify Spend Description</label>
                <textarea value={verifySpendDescription} onChange={e => setVerifySpendDescription(e.target.value)} placeholder="Describe..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1 min-h-[60px] resize-none" />
              </div>
              <GlassButton variant="primary" onClick={handleSaveSettings} disabled={saving} className="w-full text-[13px]">
                <Save className="inline w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Settings"}
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default Admin;
