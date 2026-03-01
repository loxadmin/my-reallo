import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { Users, Ghost, Activity, LogOut, RefreshCw, Shield, Settings, Save, MessageSquare, BarChart3, Plus, Trash2, Link, Upload, CheckCircle2, FileSpreadsheet, ChevronRight } from "lucide-react";
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
  current_bank_question: string;
  switch_question_template: string;
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

type AdminTab = "users" | "ghosts" | "activity" | "goals" | "questionnaires" | "analytics" | "settings" | "verification";

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

  const [verifyExpenseLink, setVerifyExpenseLink] = useState("");
  const [postQueueReferralPoints, setPostQueueReferralPoints] = useState("1000");
  const [verifySpendLink, setVerifySpendLink] = useState("");
  const [verifySpendDescription, setVerifySpendDescription] = useState("");

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

  if (loading || !isAdmin) return null;

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
    <div className="pt-24 pb-32 px-4 max-w-4xl mx-auto space-y-6">
      {/* Admin Nav Card */}
      <GlassCard className="p-3">
        <div className="flex items-center justify-between gap-4">
           <div className="flex items-center gap-2 pl-2">
             <Shield className="w-5 h-5 text-primary" />
             <h1 className="font-display font-bold text-lg gradient-text">Admin</h1>
           </div>
           <div className="flex gap-2">
             <button onClick={fetchData} className="p-1.5 rounded-lg glass-button">
               <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
             </button>
             <button onClick={() => navigate("/")} className="p-1.5 rounded-lg glass-button text-xs font-display">Home</button>
             <button onClick={signOut} className="p-1.5 rounded-lg glass-button">
               <LogOut className="w-4 h-4" />
             </button>
           </div>
        </div>
      </GlassCard>

      {/* Dynamic Tabs Grid */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-shrink-0"
            >
              <GlassCard
                animate={false}
                variant={isActive ? "glow" : "default"}
                className="text-center p-3 cursor-pointer min-w-[70px]"
              >
                <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{tab.count}</p>
                <p className="text-[10px] text-muted-foreground">{tab.label}</p>
              </GlassCard>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === "users" && (
          <GlassCard animate={false}>
            <h3 className="font-display font-semibold text-foreground mb-4">Registered Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-display text-xs">Email</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-display text-xs">Spend</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-display text-xs">Queue #</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-display text-xs">Points</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-display text-xs">Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-foreground truncate max-w-[120px]">{p.email}</td>
                      <td className="py-2 px-2 text-right text-primary font-display">{formatNaira(p.total_annual_spend || 0)}</td>
                      <td className="py-2 px-2 text-right font-display font-bold text-foreground">{p.queue_position}</td>
                      <td className="py-2 px-2 text-right font-display text-primary">{p.points_balance || 0}</td>
                      <td className="py-2 px-2 text-right font-display text-foreground">{referralCounts[p.id] || 0}</td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No users yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {activeTab === "ghosts" && (
          <GlassCard animate={false}>
            <h3 className="font-display font-semibold text-foreground mb-4">Ghost Users</h3>
            <div className="text-center py-8">
              <Ghost className="w-12 h-12 text-primary/30 mx-auto mb-3" />
              <p className="font-display text-4xl font-bold gradient-text">{ghostCount}</p>
              <p className="text-sm text-muted-foreground mt-2 font-body font-normal">Ghost users seeded in the waitlist queue</p>
            </div>
          </GlassCard>
        )}

        {activeTab === "activity" && (
          <GlassCard animate={false}>
            <h3 className="font-display font-semibold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between glass rounded-xl p-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{a.user_id.slice(0, 8)}...</p>
                    <p className="text-sm font-display capitalize text-foreground">{a.action_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-display font-bold text-primary">+{a.positions_moved} skip</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-center py-8 text-muted-foreground">No activity yet</p>}
            </div>
          </GlassCard>
        )}

        {activeTab === "goals" && (
          <GlassCard animate={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground">Goal Pricing</h3>
              {Object.keys(editedPrices).length > 0 && (
                <GlassButton variant="primary" onClick={handleSavePrices} disabled={saving} className="px-4 py-2 text-xs">
                  <Save className="w-3 h-3 mr-1 inline" /> {saving ? "Saving..." : "Save"}
                </GlassButton>
              )}
            </div>
            <div className="space-y-3">
              {goalCategories.map((cat) => (
                <div key={cat.id} className="glass rounded-xl p-4">
                  <p className="font-display font-semibold text-foreground text-sm capitalize mb-2">
                    {cat.goal_type}{cat.subcategory ? ` → ${cat.label}` : ` — ${cat.label}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-display">Max ₦</span>
                    <input
                      type="number"
                      value={editedPrices[cat.id] !== undefined ? editedPrices[cat.id] : String(cat.max_price)}
                      onChange={(e) => handlePriceChange(cat.id, e.target.value)}
                      className="flex-1 glass-input rounded-lg px-3 py-2 text-sm text-foreground font-display"
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === "questionnaires" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Create Questionnaire
              </h3>
              <div className="space-y-3">
                <input value={newQ.title} onChange={e => setNewQ(p => ({ ...p, title: e.target.value }))} placeholder="Title (e.g. Bank Switch Q1)" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm" />
                
                {/* Category dropdown */}
                <div>
                  <p className="text-xs text-muted-foreground font-display mb-1">Category:</p>
                  <select
                    value={newQ.category}
                    onChange={e => setNewQ(p => ({ ...p, category: e.target.value }))}
                    className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm bg-transparent"
                  >
                    {SURVEY_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value} className="bg-background">{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input value={newQ.preferred_bank} onChange={e => setNewQ(p => ({ ...p, preferred_bank: e.target.value }))} placeholder="Preferred bank/app name" className="glass-input rounded-xl px-4 py-3 text-foreground text-sm" />
                  <input type="number" value={newQ.points_reward} onChange={e => setNewQ(p => ({ ...p, points_reward: parseInt(e.target.value) || 0 }))} placeholder="Points reward" className="glass-input rounded-xl px-4 py-3 text-foreground text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={newQ.switch_timer_days} onChange={e => setNewQ(p => ({ ...p, switch_timer_days: parseInt(e.target.value) || 30 }))} placeholder="Timer days" className="glass-input rounded-xl px-4 py-3 text-foreground text-sm" />
                  <input value={newQ.switch_link} onChange={e => setNewQ(p => ({ ...p, switch_link: e.target.value }))} placeholder="Switch link URL" className="glass-input rounded-xl px-4 py-3 text-foreground text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={newQ.switch_enabled} onChange={e => setNewQ(p => ({ ...p, switch_enabled: e.target.checked }))} className="accent-primary" />
                  <span className="text-sm text-muted-foreground font-body font-normal">Enable switch button</span>
                </div>

                <p className="text-xs text-muted-foreground font-display">Why-switch dropdown options:</p>
                {newQ.why_switch_options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={e => {
                        const opts = [...newQ.why_switch_options];
                        opts[i] = e.target.value;
                        setNewQ(p => ({ ...p, why_switch_options: opts }));
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 glass-input rounded-xl px-4 py-2 text-foreground text-sm"
                    />
                    {newQ.why_switch_options.length > 1 && (
                      <button onClick={() => setNewQ(p => ({ ...p, why_switch_options: p.why_switch_options.filter((_, j) => j !== i) }))} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setNewQ(p => ({ ...p, why_switch_options: [...p.why_switch_options, ""] }))} className="text-xs text-primary font-display">+ Add option</button>

                <GlassButton variant="primary" onClick={handleCreateQuestionnaire} className="w-full">Create Questionnaire</GlassButton>
              </div>
            </GlassCard>

            {/* Existing questionnaires */}
            {questionnaires.map(q => (
              <GlassCard key={q.id} animate={false}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-display font-semibold text-foreground">{q.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {q.points_reward} pts • {q.preferred_bank} • {q.switch_timer_days}d timer
                      {q.switch_enabled && " • Switch ON"}
                    </p>
                    <p className="text-[10px] text-primary mt-0.5 capitalize">
                      {SURVEY_CATEGORIES.find(c => c.value === q.category)?.label || q.category}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <GlassButton variant="outline" onClick={() => handleToggleQuestionnaire(q.id, q.is_active)} className="px-3 py-1 text-xs">
                      {q.is_active ? "Deactivate" : "Activate"}
                    </GlassButton>
                    <button onClick={() => handleDeleteQuestionnaire(q.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Responses: {qResponses.filter(r => r.questionnaire_id === q.id).length} |
                  Would switch: {qResponses.filter(r => r.questionnaire_id === q.id && r.would_switch).length}
                </p>
                {q.why_switch_options && (q.why_switch_options as string[]).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground font-body font-normal">Dropdown options: {(q.why_switch_options as string[]).join(", ")}</p>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}

        {activeTab === "analytics" && (
          <GlassCard animate={false}>
            <h3 className="font-display font-semibold text-foreground mb-4">Questionnaire Analytics</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="glass rounded-xl p-4 text-center">
                <p className="font-display text-2xl font-bold text-primary">{switchCount}</p>
                <p className="text-xs text-muted-foreground font-body font-normal">Would Switch</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="font-display text-2xl font-bold text-foreground">{noSwitchCount}</p>
                <p className="text-xs text-muted-foreground font-body font-normal">Declined</p>
              </div>
            </div>

            {questionnaires.map(q => {
              const qr = qResponses.filter(r => r.questionnaire_id === q.id);
              const yesCount = qr.filter(r => r.would_switch).length;
              const catLabel = SURVEY_CATEGORIES.find(c => c.value === q.category)?.label || q.category;
              return (
                <div key={q.id} className="glass rounded-xl p-4 mb-3">
                  <p className="font-display font-semibold text-foreground text-sm">{q.title}</p>
                  <p className="text-[10px] text-primary capitalize">{catLabel}</p>
                  <div className="flex gap-4 mt-2 font-body font-normal">
                    <p className="text-xs text-primary">{yesCount} yes</p>
                    <p className="text-xs text-muted-foreground">{qr.length - yesCount} no</p>
                    <p className="text-xs text-muted-foreground">{qr.length} total</p>
                  </div>
                  {yesCount > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-display">Top reasons:</p>
                      {Array.from(new Set(qr.filter(r => r.would_switch && r.switch_reason).map(r => r.switch_reason))).map(reason => (
                        <p key={reason} className="text-xs text-foreground font-body font-normal">• {reason} ({qr.filter(r => r.switch_reason === reason).length})</p>
                      ))}
                      {qr.filter(r => r.would_switch && r.switch_reason_freetext).map(r => (
                        <p key={r.id} className="text-xs text-muted-foreground italic font-body font-normal">"{r.switch_reason_freetext}"</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </GlassCard>
        )}

        {activeTab === "verification" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Upload Transaction CSV
              </h3>
              <p className="text-xs text-muted-foreground mb-3 font-body font-normal">
                Upload a CSV with columns: <span className="font-mono">transaction_id, amount</span>. Matching IDs will be auto-verified.
              </p>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <GlassButton
                variant="primary"
                onClick={() => csvInputRef.current?.click()}
                className="w-full"
                disabled={csvUploading}
              >
                <FileSpreadsheet className="inline w-4 h-4 mr-2" />
                {csvUploading ? "Processing..." : "Upload CSV"}
              </GlassButton>
            </GlassCard>

            <GlassCard animate={false}>
              <h3 className="font-display font-semibold text-foreground mb-4">User Transactions</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="glass rounded-xl p-3 text-center">
                  <p className="font-display text-xl font-bold text-primary">{verificationTxs.filter(t => t.is_verified).length}</p>
                  <p className="text-[10px] text-muted-foreground font-body font-normal">Verified</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="font-display text-xl font-bold text-foreground">{verificationTxs.filter(t => !t.is_verified).length}</p>
                  <p className="text-[10px] text-muted-foreground font-body font-normal">Pending</p>
                </div>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                {verificationTxs.map(tx => {
                  const userEmail = profiles.find(p => p.id === tx.user_id)?.email || tx.user_id.slice(0, 8);
                  return (
                    <div key={tx.id} className="flex items-center justify-between glass rounded-xl p-3 font-body font-normal">
                      <div>
                        <p className="text-xs text-muted-foreground">{userEmail}</p>
                        <p className="text-sm font-mono text-foreground">{tx.transaction_id}</p>
                      </div>
                      <div className="text-right">
                        {tx.is_verified ? (
                          <div className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">₦{tx.verified_amount?.toLocaleString("en-NG")}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {verificationTxs.length === 0 && <p className="text-center py-8 text-muted-foreground font-body font-normal">No transactions submitted yet</p>}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "settings" && (
          <GlassCard animate={false}>
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
               <Settings className="w-5 h-5 text-primary" /> App Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-display text-muted-foreground">Verify Expense Button Link</label>
                <input value={verifyExpenseLink} onChange={e => setVerifyExpenseLink(e.target.value)} placeholder="https://..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mt-1" />
              </div>
              <div>
                <label className="text-sm font-display text-muted-foreground">Post-Queue Referral Points</label>
                <input type="number" value={postQueueReferralPoints} onChange={e => setPostQueueReferralPoints(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mt-1 font-body" />
                <p className="text-xs text-muted-foreground mt-1 font-body font-normal">Points awarded per referral after user is off the queue</p>
              </div>
              <div>
                <label className="text-sm font-display text-muted-foreground">Verify Spend Link</label>
                <input value={verifySpendLink} onChange={e => setVerifySpendLink(e.target.value)} placeholder="https://..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mt-1 font-body" />
                <p className="text-xs text-muted-foreground mt-1 font-body font-normal">Link where users go to perform verification action</p>
              </div>
              <div>
                <label className="text-sm font-display text-muted-foreground">Verify Spend Description</label>
                <textarea value={verifySpendDescription} onChange={e => setVerifySpendDescription(e.target.value)} placeholder="Describe the verification action..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-sm mt-1 min-h-[80px] resize-none font-body font-normal" />
              </div>
              <GlassButton variant="primary" onClick={handleSaveSettings} disabled={saving} className="w-full">
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
