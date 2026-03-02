import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import Navbar from "@/components/Navbar";
import {
  Users, Ghost, Activity, LogOut, RefreshCw, Shield,
  Settings, Save, MessageSquare, BarChart3, Plus,
  Trash2, Link, Upload, CheckCircle2, FileSpreadsheet,
  ChevronRight, Search, Filter, ArrowUpRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  email: string;
  total_annual_spend: number;
  selected_goal: string | null;
  queue_position: number;
  referral_code: string | null;
  points_balance: number;
  created_at: string;
}

interface ActivityRow {
  id: string;
  user_id: string;
  action_type: string;
  positions_moved: number;
  created_at: string;
}

interface GoalCategoryRow {
  id: string;
  goal_type: string;
  subcategory: string | null;
  label: string;
  max_price: number;
}

interface QuestionnaireRow {
  id: string;
  title: string;
  is_active: boolean;
  points_reward: number;
  preferred_bank: string;
  switch_timer_days: number;
  switch_enabled: boolean;
  switch_link: string;
  why_switch_options: string[];
  category: string;
}

interface QResponseRow {
  id: string;
  user_id: string;
  questionnaire_id: string;
  current_bank: string;
  would_switch: boolean;
  switch_reason: string | null;
  switch_reason_freetext: string | null;
  points_awarded: number;
  completed_at: string;
}

interface VerificationTx {
  id: string;
  verification_id: string;
  user_id: string;
  transaction_id: string;
  is_verified: boolean;
  verified_amount: number | null;
  submitted_at: string;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const SURVEY_CATEGORIES = [
  { value: "bank_switch", label: "Bank Switch" },
  { value: "transport_switch", label: "Transport Switch" },
  { value: "food_purchase_switch", label: "Food Purchase Switch" },
  { value: "general_app_switch", label: "General App Switch" },
];

type AdminTab = "users" | "ghosts" | "activity" | "goals" | "questionnaires" | "analytics" | "verification" | "settings";

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

  // Admin settings
  const [verifyExpenseLink, setVerifyExpenseLink] = useState("");
  const [postQueueReferralPoints, setPostQueueReferralPoints] = useState("1000");
  const [verifySpendLink, setVerifySpendLink] = useState("");
  const [verifySpendDescription, setVerifySpendDescription] = useState("");

  // New questionnaire form
  const [newQ, setNewQ] = useState({
    title: "",
    points_reward: 100,
    preferred_bank: "",
    switch_timer_days: 30,
    switch_enabled: false,
    switch_link: "",
    why_switch_options: [""] as string[],
    category: "bank_switch",
  });

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [loading, isAdmin, navigate]);

  const fetchData = async () => {
    setRefreshing(true);
    const [profilesRes, ghostsRes, activityRes, goalsRes, qRes, qrRes, settingsRes, vtRes] = await Promise.all([
      supabase.from("profiles").select("*").order("queue_position", { ascending: true }),
      supabase.from("ghost_users").select("id", { count: "exact", head: true }),
      supabase.from("waitlist_activity").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("goal_categories").select("*").order("goal_type"),
      supabase.from("questionnaires").select("*").order("created_at", { ascending: false }),
      supabase.from("questionnaire_responses").select("*").order("completed_at", { ascending: false }),
      supabase.from("admin_settings").select("*"),
      supabase.from("verification_transactions").select("*").order("submitted_at", { ascending: false }).limit(200),
    ]);

    const profs = (profilesRes.data as ProfileRow[]) || [];
    setProfiles(profs);
    setGhostCount(ghostsRes.count || 0);
    setActivities((activityRes.data as ActivityRow[]) || []);
    setGoalCategories((goalsRes.data as GoalCategoryRow[]) || []);
    setQuestionnaires((qRes.data as QuestionnaireRow[]) || []);
    setQResponses((qrRes.data as QResponseRow[]) || []);
    setVerificationTxs((vtRes.data as VerificationTx[]) || []);
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

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

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
      title: newQ.title,
      points_reward: newQ.points_reward,
      preferred_bank: newQ.preferred_bank,
      switch_timer_days: newQ.switch_timer_days,
      switch_enabled: newQ.switch_enabled,
      switch_link: newQ.switch_link,
      why_switch_options: newQ.why_switch_options.filter(o => o.trim()),
      category: newQ.category,
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

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const rows = lines.slice(1).map(line => {
        const parts = line.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
        return { transaction_id: parts[0], amount: parseFloat(parts[1]) || 0 };
      }).filter(r => r.transaction_id);

      let matchCount = 0;
      for (const row of rows) {
        const { data: matches } = await supabase
          .from("verification_transactions")
          .select("id, user_id, verification_id")
          .eq("transaction_id", row.transaction_id)
          .eq("is_verified", false);

        if (matches && matches.length > 0) {
          for (const match of matches) {
            await supabase.from("verification_transactions")
              .update({ is_verified: true, verified_amount: row.amount })
              .eq("id", match.id);
            matchCount++;

            const { data: allTxs } = await supabase
              .from("verification_transactions")
              .select("is_verified, verified_amount")
              .eq("verification_id", match.verification_id);

            if (allTxs && allTxs.every(t => t.is_verified)) {
              const totalMonthly = allTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0);
              const annualAmount = Math.round(totalMonthly * 12);

              await supabase.from("spend_verifications")
                .update({ status: "verified", recalculated_amount: annualAmount })
                .eq("id", match.verification_id);

              await supabase.from("profiles")
                .update({ total_annual_spend: annualAmount })
                .eq("id", match.user_id);
            }
          }
        }
      }

      toast({ title: `CSV processed`, description: `${matchCount} transactions matched.` });
      await fetchData();
    } catch (err) {
      toast({ title: "CSV error" });
    }
    setCsvUploading(false);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  if (loading) return null;
  if (!isAdmin) return null;

  const tabs: { id: AdminTab; label: string; icon: any; count: number }[] = [
    { id: "users", label: "Users", icon: Users, count: profiles.length },
    { id: "ghosts", label: "Ghosts", icon: Ghost, count: ghostCount },
    { id: "activity", label: "Activity", icon: Activity, count: activities.length },
    { id: "goals", label: "Goals", icon: Settings, count: goalCategories.length },
    { id: "questionnaires", label: "Surveys", icon: MessageSquare, count: questionnaires.length },
    { id: "analytics", label: "Analytics", icon: BarChart3, count: qResponses.length },
    { id: "verification", label: "Verify", icon: CheckCircle2, count: verificationTxs.length },
    { id: "settings", label: "Settings", icon: Link, count: 0 },
  ];

  const switchCount = qResponses.filter(r => r.would_switch).length;
  const noSwitchCount = qResponses.filter(r => !r.would_switch).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-12">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-24 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground">Manage users, goals, and system settings</p>
          </div>
          <div className="flex gap-2">
            <GlassButton variant="outline" onClick={fetchData} disabled={refreshing} className="p-2.5">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </GlassButton>
          </div>
        </div>

        {/* Horizontal Scrollable Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0"
              >
                <div className={`
                  px-5 py-3 rounded-2xl border transition-all duration-300 flex items-center gap-3
                  ${active
                    ? "bg-primary/20 border-primary shadow-lg shadow-primary/10 text-foreground"
                    : "glass border-border/50 text-muted-foreground hover:border-primary/50"}
                `}>
                  <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
                  <span className="text-xs font-bold whitespace-nowrap">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {tab.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Users tab */}
        {activeTab === "users" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
              <h3 className="font-bold font-display">Registered Users</h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input placeholder="Search users..." className="glass-input rounded-xl pl-9 pr-4 py-1.5 text-xs w-48" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="text-left py-4 px-6 text-muted-foreground font-bold text-[10px] uppercase tracking-widest">User</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Spend</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Queue</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Points</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Refs</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer group">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{p.email.split('@')[0]}</span>
                          <span className="text-[10px] text-muted-foreground">{p.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-display font-bold text-primary">{formatNaira(p.total_annual_spend || 0)}</td>
                      <td className="py-4 px-6 text-right font-display font-bold">#{p.queue_position}</td>
                      <td className="py-4 px-6 text-right font-display text-primary">{p.points_balance?.toLocaleString() || 0}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="font-bold">{referralCounts[p.id] || 0}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* Ghosts tab */}
        {activeTab === "ghosts" && (
          <GlassCard className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-xl">
              <Ghost className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-bold font-display gradient-text">{ghostCount}</h3>
              <p className="text-sm font-medium text-muted-foreground">Waitlist Ghost Users</p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              These are synthetic users added to the queue to maintain waitlist momentum and social proof.
            </p>
            <GlassButton variant="outline" className="px-6 py-2.5 text-xs">Manage Ghosts</GlassButton>
          </GlassCard>
        )}

        {/* Activity tab */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <h3 className="font-bold px-1">Recent Queue Movements</h3>
            <div className="space-y-3">
              {activities.map((a) => (
                <GlassCard key={a.id} className="p-4 flex items-center justify-between group hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold capitalize">{a.action_type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{a.user_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-green-500 font-bold">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>{a.positions_moved} spots</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Goals tab */}
        {activeTab === "goals" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold">Goal Categories & Pricing</h3>
              {Object.keys(editedPrices).length > 0 && (
                <GlassButton variant="primary" onClick={handleSavePrices} disabled={saving} className="px-4 py-2 text-xs">
                  <Save className="w-3 h-3 mr-2" /> {saving ? "Saving..." : "Save Changes"}
                </GlassButton>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {goalCategories.map((cat) => (
                <GlassCard key={cat.id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{cat.goal_type}</span>
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h4 className="font-bold">{cat.label}</h4>
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Max Price (₦)</label>
                    <input
                      type="number"
                      value={editedPrices[cat.id] !== undefined ? editedPrices[cat.id] : String(cat.max_price)}
                      onChange={(e) => handlePriceChange(cat.id, e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-3 text-sm font-bold"
                    />
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Questionnaires tab */}
        {activeTab === "questionnaires" && (
          <div className="space-y-8">
            <GlassCard className="space-y-6">
              <h3 className="font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Create Survey
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Survey Title</label>
                    <input value={newQ.title} onChange={e => setNewQ(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Bank Switch Campaign" className="w-full glass-input rounded-xl px-4 py-3 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Category</label>
                    <select
                      value={newQ.category}
                      onChange={e => setNewQ(p => ({ ...p, category: e.target.value }))}
                      className="w-full glass-input rounded-xl px-4 py-3 text-sm bg-transparent"
                    >
                      {SURVEY_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value} className="bg-background">{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Target App</label>
                      <input value={newQ.preferred_bank} onChange={e => setNewQ(p => ({ ...p, preferred_bank: e.target.value }))} placeholder="e.g. OPay" className="w-full glass-input rounded-xl px-4 py-3 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Points</label>
                      <input type="number" value={newQ.points_reward} onChange={e => setNewQ(p => ({ ...p, points_reward: parseInt(e.target.value) || 0 }))} className="w-full glass-input rounded-xl px-4 py-3 text-sm" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Reasons for switching (dropdown)</label>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                      {newQ.why_switch_options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={opt}
                            onChange={e => {
                              const opts = [...newQ.why_switch_options];
                              opts[i] = e.target.value;
                              setNewQ(p => ({ ...p, why_switch_options: opts }));
                            }}
                            className="flex-1 glass-input rounded-xl px-4 py-2 text-xs"
                          />
                          <button onClick={() => setNewQ(p => ({ ...p, why_switch_options: p.why_switch_options.filter((_, j) => j !== i) }))} className="text-destructive p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setNewQ(p => ({ ...p, why_switch_options: [...p.why_switch_options, ""] }))} className="text-[10px] text-primary font-bold uppercase tracking-widest">+ Add Option</button>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" checked={newQ.switch_enabled} onChange={e => setNewQ(p => ({ ...p, switch_enabled: e.target.checked }))} className="accent-primary" />
                    <span className="text-xs font-medium">Enable 'Switch Now' Button</span>
                  </div>
                </div>
              </div>
              <GlassButton variant="primary" onClick={handleCreateQuestionnaire} className="w-full py-4 font-bold">Create Questionnaire</GlassButton>
            </GlassCard>

            <div className="space-y-4">
              <h3 className="font-bold px-1">Active Surveys</h3>
              <div className="grid gap-4">
                {questionnaires.map(q => (
                  <GlassCard key={q.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold">{q.title}</h4>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md ${q.is_active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}`}>
                            {q.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{q.preferred_bank} • {q.points_reward} Points Reward</p>
                      </div>
                      <div className="flex gap-2">
                        <GlassButton variant="outline" onClick={() => handleToggleQuestionnaire(q.id, q.is_active)} className="p-2">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </GlassButton>
                        <GlassButton variant="outline" onClick={() => handleDeleteQuestionnaire(q.id)} className="p-2 text-destructive border-destructive/20">
                          <Trash2 className="w-3.5 h-3.5" />
                        </GlassButton>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <GlassCard className="text-center p-8 space-y-2">
                <p className="text-5xl font-bold font-display text-primary">{switchCount}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Would Switch</p>
              </GlassCard>
              <GlassCard className="text-center p-8 space-y-2">
                <p className="text-5xl font-bold font-display">{noSwitchCount}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Declined</p>
              </GlassCard>
            </div>

            <h3 className="font-bold px-1">Campaign Breakdown</h3>
            <div className="space-y-4">
              {questionnaires.map(q => {
                const qr = qResponses.filter(r => r.questionnaire_id === q.id);
                const yesCount = qr.filter(r => r.would_switch).length;
                const percent = qr.length > 0 ? Math.round((yesCount / qr.length) * 100) : 0;
                return (
                  <GlassCard key={q.id} className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">{q.title}</h4>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                          {SURVEY_CATEGORIES.find(c => c.value === q.category)?.label || q.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{percent}%</p>
                        <p className="text-[10px] text-muted-foreground">Conversion</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>{yesCount} Accepted</span>
                      <span>{qr.length} Total Responses</span>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Verification tab */}
        {activeTab === "verification" && (
          <div className="space-y-8">
            <GlassCard className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Transaction Reconciliation</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Upload your bank statement CSV to auto-match and verify user-submitted transaction IDs.
                </p>
              </div>
              <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              <GlassButton
                variant="primary"
                onClick={() => csvInputRef.current?.click()}
                className="w-full py-4 font-bold shadow-lg shadow-primary/20"
                disabled={csvUploading}
              >
                {csvUploading ? "Processing Statements..." : "Select CSV File"}
              </GlassButton>
            </GlassCard>

            <div className="space-y-4">
              <h3 className="font-bold px-1">Pending Verifications</h3>
              <div className="space-y-3">
                {verificationTxs.map(tx => (
                  <GlassCard key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-bold font-mono text-primary">{tx.transaction_id}</p>
                      <p className="text-[10px] text-muted-foreground">User: {tx.user_id.slice(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {tx.is_verified ? (
                        <div className="flex items-center gap-1.5 text-green-500 font-bold text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{formatNaira(tx.verified_amount || 0)}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                          Pending
                        </span>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === "settings" && (
          <GlassCard className="p-8 space-y-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Link className="w-5 h-5 text-primary" /> System Configuration
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Verification Portal Link</label>
                <input value={verifyExpenseLink} onChange={e => setVerifyExpenseLink(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Post-Queue Referral Bonus (PTS)</label>
                <input type="number" value={postQueueReferralPoints} onChange={e => setPostQueueReferralPoints(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Verify Spend Link</label>
                <input value={verifySpendLink} onChange={e => setVerifySpendLink(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Verify Spend Instructions</label>
                <textarea value={verifySpendDescription} onChange={e => setVerifySpendDescription(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-sm min-h-[100px]" />
              </div>

              <GlassButton variant="primary" onClick={handleSaveSettings} disabled={saving} className="w-full py-4 font-bold">
                <Save className="w-5 h-5 mr-2" /> {saving ? "Saving Configuration..." : "Apply Global Settings"}
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  );
};

export default Admin;
