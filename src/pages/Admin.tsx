import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import WaterBackground from "@/components/WaterBackground";
import { Users, Ghost, Activity, LogOut, RefreshCw, Shield, Settings, Save, MessageSquare, ChartBar as BarChart3, Plus, Trash2, Link, Upload, CircleCheck as CheckCircle2, FileSpreadsheet, Smartphone, Check, ExternalLink, CreditCard as Edit2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string; email: string; total_annual_spend: number; selected_goal: string | null;
  queue_position: number; referral_code: string | null; points_balance: number; created_at: string;
}
interface ActivityRow { id: string; user_id: string; action_type: string; positions_moved: number; created_at: string; }
interface GoalCategoryRow { id: string; goal_type: string; subcategory: string | null; label: string; max_price: number; }
interface DecisionAppRow {
  id: string; app_name: string; app_logo_url: string | null; category: string;
  points_select: number; points_switch_intent: number; points_switch_complete: number;
  switch_link: string | null; referral_message: string | null; referral_link: string | null;
  referral_points: number; is_active: boolean; switch_to_referral_app_ids: string[] | null;
}
interface DecisionResponseRow {
  id: string; user_id: string; app_id: string; has_app: boolean; would_switch: boolean | null;
  switch_completed: boolean; referral_clicked: boolean; referral_screenshot_url: string | null;
  referral_approved: boolean; points_awarded: number; created_at: string;
}
interface VerificationTx {
  id: string; verification_id: string; user_id: string; transaction_id: string;
  is_verified: boolean; verified_amount: number | null; submitted_at: string;
}

interface SurveyRow {
  id: string; title: string; description: string | null; points_reward: number;
  completion_link: string | null; is_active: boolean; created_at: string;
}

interface SurveyQuestionRow {
  id: string; survey_id: string; question_text: string; options: string[];
  correct_answer: string; order_index: number;
}

interface SurveyResponseRow {
  id: string; user_id: string; survey_id: string; is_correct: boolean;
  screenshot_url: string | null; is_approved: boolean; points_awarded: number;
  completed_at: string;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");
const fromApps = () => supabase.from("decision_apps" as any);
const fromDResponses = () => supabase.from("decision_responses" as any);

type AdminTab = "users" | "ghosts" | "activity" | "goals" | "decisions" | "surveys" | "analytics" | "verification" | "settings";

const Admin = () => {
  const { isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [ghostCount, setGhostCount] = useState(0);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [goalCategories, setGoalCategories] = useState<GoalCategoryRow[]>([]);
  const [editedGoals, setEditedGoals] = useState<Record<string, Partial<GoalCategoryRow>>>({});
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});
  const [verificationTxs, setVerificationTxs] = useState<VerificationTx[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [decisionApps, setDecisionApps] = useState<DecisionAppRow[]>([]);
  const [decisionResponses, setDecisionResponses] = useState<DecisionResponseRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestionRow[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponseRow[]>([]);

  const [verifyExpenseLink, setVerifyExpenseLink] = useState("");
  const [verifyPageActive, setVerifyPageActive] = useState(true);
  const [postQueueReferralPoints, setPostQueueReferralPoints] = useState("1000");
  const [verifySpendLink, setVerifySpendLink] = useState("");
  const [verifySpendDescription, setVerifySpendDescription] = useState("");
  const [footerContactUs, setFooterContactUs] = useState("");
  const [footerAboutUs, setFooterAboutUs] = useState("");
  const [footerInvestWithUs, setFooterInvestWithUs] = useState("");

  const [newApp, setNewApp] = useState({
    app_name: "", app_logo_url: "", category: "yes_no" as string,
    points_select: 500, points_switch_intent: 2000, points_switch_complete: 10000,
    switch_link: "", referral_message: "", referral_link: "", referral_points: 10000,
    switch_to_referral_app_ids: [] as string[],
  });

  const [newSurvey, setNewSurvey] = useState({
    title: "", description: "", points_reward: 5000, completion_link: "", is_active: true
  });

  const [newQuestion, setNewQuestion] = useState({
    survey_id: "", question_text: "", options: ["", ""], correct_answer: "", order_index: 0
  });

  const [newGoal, setNewGoal] = useState({ goal_type: "", subcategory: "", label: "", max_price: 0 });

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [loading, isAdmin, navigate]);

  const fetchData = async () => {
    setRefreshing(true);
    const [profilesRes, ghostsRes, activityRes, goalsRes, settingsRes, vtRes, daRes, drRes, sRes, sqRes, srRes] = await Promise.all([
      supabase.from("profiles").select("*").order("queue_position", { ascending: true }),
      supabase.from("ghost_users").select("id", { count: "exact", head: true }),
      supabase.from("waitlist_activity").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("goal_categories").select("*").order("goal_type"),
      supabase.from("admin_settings").select("*"),
      supabase.from("verification_transactions").select("*").order("submitted_at", { ascending: false }).limit(200),
      fromApps().select("*").order("created_at", { ascending: false }),
      fromDResponses().select("*").order("created_at", { ascending: false }),
      supabase.from("surveys").select("*").order("created_at", { ascending: false }),
      supabase.from("survey_questions").select("*").order("order_index", { ascending: true }),
      supabase.from("survey_responses").select("*").order("completed_at", { ascending: false }),
    ]);

    const profs = (profilesRes.data as ProfileRow[]) || [];
    setProfiles(profs);
    setGhostCount(ghostsRes.count || 0);
    setActivities((activityRes.data as ActivityRow[]) || []);
    setGoalCategories((goalsRes.data as GoalCategoryRow[]) || []);
    setVerificationTxs((vtRes.data as VerificationTx[]) || []);
    setDecisionApps((daRes.data || []) as unknown as DecisionAppRow[]);
    setDecisionResponses((drRes.data || []) as unknown as DecisionResponseRow[]);
    setSurveys((sRes.data || []) as SurveyRow[]);
    setSurveyQuestions((sqRes.data || []) as SurveyQuestionRow[]);
    setSurveyResponses((srRes.data || []) as SurveyResponseRow[]);
    setEditedGoals({});

    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    setVerifyExpenseLink(settings.find(s => s.key === "verify_expense_link")?.value || "");
    setVerifyPageActive(settings.find(s => s.key === "verify_page_active")?.value === "false" ? false : true);
    setPostQueueReferralPoints(settings.find(s => s.key === "post_queue_referral_points")?.value || "1000");
    setVerifySpendLink(settings.find(s => s.key === "verify_spend_link")?.value || "");
    setVerifySpendDescription(settings.find(s => s.key === "verify_spend_description")?.value || "");
    setFooterContactUs(settings.find(s => s.key === "footer_contact_us")?.value || "");
    setFooterAboutUs(settings.find(s => s.key === "footer_about_us")?.value || "");
    setFooterInvestWithUs(settings.find(s => s.key === "footer_invest_with_us")?.value || "");

    const counts: Record<string, number> = {};
    for (const p of profs) {
      const { count } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", p.id);
      counts[p.id] = count || 0;
    }
    setReferralCounts(counts);
    setRefreshing(false);
  };

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const handleSaveGoals = async () => {
    setSaving(true);
    for (const [id, changes] of Object.entries(editedGoals)) {
      await supabase.from("goal_categories").update(changes).eq("id", id);
    }
    toast({ title: "Goals updated" });
    await fetchData();
    setSaving(false);
  };

  const handleCreateGoal = async () => {
    if (!newGoal.goal_type || !newGoal.label) return;
    await supabase.from("goal_categories").insert({
      goal_type: newGoal.goal_type,
      subcategory: newGoal.subcategory || null,
      label: newGoal.label,
      max_price: newGoal.max_price,
    });
    toast({ title: "Goal category created" });
    setNewGoal({ goal_type: "", subcategory: "", label: "", max_price: 0 });
    await fetchData();
  };

  const handleDeleteGoal = async (id: string) => {
    await supabase.from("goal_categories").delete().eq("id", id);
    toast({ title: "Goal category deleted" });
    await fetchData();
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    await Promise.all([
      supabase.from("admin_settings").upsert({ key: "verify_expense_link", value: verifyExpenseLink, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_page_active", value: String(verifyPageActive), updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "post_queue_referral_points", value: postQueueReferralPoints, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_spend_link", value: verifySpendLink, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_spend_description", value: verifySpendDescription, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "footer_contact_us", value: footerContactUs, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "footer_about_us", value: footerAboutUs, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "footer_invest_with_us", value: footerInvestWithUs, updated_at: new Date().toISOString() }),
    ]);
    toast({ title: "Settings saved" });
    setSaving(false);
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
      switch_to_referral_app_ids: newApp.category === "robust" ? newApp.switch_to_referral_app_ids : [],
    });
    toast({ title: "Decision app created" });
    setNewApp({ app_name: "", app_logo_url: "", category: "yes_no", points_select: 500, points_switch_intent: 2000, points_switch_complete: 10000, switch_link: "", referral_message: "", referral_link: "", referral_points: 10000, switch_to_referral_app_ids: [] });
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
    if (!app) return;

    try {
      const { error: respError } = await fromDResponses().update({
        referral_approved: true,
        points_awarded: app.referral_points
      }).eq("id", responseId);

      if (respError) {
        toast({ title: "Error updating response", description: respError.message });
        return;
      }

      // Use RPC to recalculate points
      await supabase.rpc("recalculate_user_points", { target_user_id: userId });

      toast({ title: "Referral approved", description: `${app.referral_points} points awarded to user` });
      await fetchData();
    } catch (error) {
      toast({ title: "Approval failed", description: (error as Error).message });
    }
  };

  const handleCreateSurvey = async () => {
    if (!newSurvey.title) return;
    const { data, error } = await supabase.from("surveys").insert(newSurvey).select().single();
    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      toast({ title: "Survey created" });
      setNewSurvey({ title: "", description: "", points_reward: 5000, completion_link: "", is_active: true });
      await fetchData();
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    await supabase.from("surveys").delete().eq("id", id);
    toast({ title: "Survey deleted" });
    await fetchData();
  };

  const handleCreateQuestion = async () => {
    if (!newQuestion.survey_id || !newQuestion.question_text || !newQuestion.correct_answer) {
      toast({ title: "Missing fields", description: "Please fill all required fields" });
      return;
    }
    const { error } = await supabase.from("survey_questions").insert({
      ...newQuestion,
      options: newQuestion.options.filter(o => o.trim() !== "")
    });
    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      toast({ title: "Question added" });
      setNewQuestion({ ...newQuestion, question_text: "", options: ["", ""], correct_answer: "" });
      await fetchData();
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    await supabase.from("survey_questions").delete().eq("id", id);
    toast({ title: "Question deleted" });
    await fetchData();
  };

  const handleApproveSurvey = async (responseId: string, userId: string) => {
    try {
      const response = surveyResponses.find(r => r.id === responseId);
      if (!response) return;

      const survey = surveys.find(s => s.id === response.survey_id);
      if (!survey) return;

      const { error } = await supabase.from("survey_responses").update({
        is_approved: true,
        points_awarded: survey.points_reward
      }).eq("id", responseId);

      if (error) throw error;

      await supabase.rpc("recalculate_user_points", { target_user_id: userId });
      toast({ title: "Survey approved", description: `${survey.points_reward} points awarded` });
      await fetchData();
    } catch (error) {
      toast({ title: "Approval failed", description: (error as Error).message });
    }
  };

  const handleSyncAllBalances = async () => {
    setRefreshing(true);
    await supabase.rpc("recalculate_all_users_points");
    toast({ title: "Balances synced", description: "All user balances have been recalculated." });
    await fetchData();
    setRefreshing(false);
  };

  const handleSyncUserBalance = async (userId: string) => {
    await supabase.rpc("recalculate_user_points", { target_user_id: userId });
    toast({ title: "Balance synced" });
    await fetchData();
  };

  const getPublicScreenshotUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("referral_screenshots").getPublicUrl(path);
    return data.publicUrl;
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
        const { data: matches } = await supabase.from("verification_transactions").select("id, user_id, verification_id").eq("transaction_id", row.transaction_id).eq("is_verified", false);
        if (matches && matches.length > 0) {
          for (const match of matches) {
            await supabase.from("verification_transactions").update({ is_verified: true, verified_amount: row.amount }).eq("id", match.id);
            matchCount++;
            // Check if all txs for this verification are done
            const { data: allTxs } = await supabase.from("verification_transactions").select("is_verified, verified_amount").eq("verification_id", match.verification_id);
            const { data: verif } = await supabase.from("spend_verifications").select("frequency").eq("id", match.verification_id).single();
            if (allTxs && verif) {
              const verifiedTxs = allTxs.filter(t => t.is_verified);
              const totalAmount = verifiedTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0);
              const freq = (verif as any).frequency;
              
              // For monthly, use first tx × 12 as final
              if (freq === "monthly" && verifiedTxs.length >= 1) {
                const annualAmount = Math.round(Number(verifiedTxs[0].verified_amount || 0) * 12);
                await supabase.from("spend_verifications").update({ status: "verified", recalculated_amount: annualAmount }).eq("id", match.verification_id);
                await supabase.from("profiles").update({ total_annual_spend: annualAmount, spend_verified: true }).eq("id", match.user_id);
              }
              // For daily/weekly, set initial on first verification
              else if (verifiedTxs.length === 1) {
                const multiplier = freq === "daily" ? 365 : 52;
                const initialAnnual = Math.round(Number(verifiedTxs[0].verified_amount || 0) * multiplier);
                await supabase.from("profiles").update({ total_annual_spend: initialAnnual }).eq("id", match.user_id);
              }
              // Check if verification period ended for recalculation
              const { data: vData } = await supabase.from("spend_verifications").select("ends_at").eq("id", match.verification_id).single();
              if (vData && new Date() >= new Date((vData as any).ends_at) && freq !== "monthly") {
                const recalcMultiplier = freq === "daily" ? 12 : 13;
                const finalAnnual = Math.round(totalAmount * recalcMultiplier);
                await supabase.from("spend_verifications").update({ status: "verified", recalculated_amount: finalAnnual }).eq("id", match.verification_id);
                await supabase.from("profiles").update({ total_annual_spend: finalAnnual, spend_verified: true }).eq("id", match.user_id);
              }
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

  // Decision analytics
  const downloadDecisionAnalytics = () => {
    const rows = [["App Name", "Category", "Total Responses", "Has App", "Doesn't Have", "Would Switch", "Switch Completed", "Referral Clicked", "Referral Approved", "% Selected"]];
    for (const app of decisionApps) {
      const appResps = decisionResponses.filter(r => r.app_id === app.id);
      const hasApp = appResps.filter(r => r.has_app).length;
      const noApp = appResps.filter(r => !r.has_app).length;
      const wouldSwitch = appResps.filter(r => r.would_switch === true).length;
      const switched = appResps.filter(r => r.switch_completed).length;
      const refClicked = appResps.filter(r => r.referral_clicked).length;
      const refApproved = appResps.filter(r => r.referral_approved).length;
      const pct = appResps.length > 0 ? Math.round((hasApp / appResps.length) * 100) : 0;
      rows.push([app.app_name, app.category, String(appResps.length), String(hasApp), String(noApp), String(wouldSwitch), String(switched), String(refClicked), String(refApproved), `${pct}%`]);
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "decision_analytics.csv";
    a.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground text-[13px]">Loading...</p></div>;
  if (!isAdmin) return null;

  const referralApps = decisionApps.filter(a => a.category === "referral");

  const tabs: { id: AdminTab; label: string; icon: any; count: number }[] = [
    { id: "users", label: "Users", icon: Users, count: profiles.length },
    { id: "ghosts", label: "Ghosts", icon: Ghost, count: ghostCount },
    { id: "activity", label: "Activity", icon: Activity, count: activities.length },
    { id: "goals", label: "Goals", icon: Settings, count: goalCategories.length },
    { id: "decisions", label: "Decisions", icon: Smartphone, count: decisionApps.length },
    { id: "surveys", label: "Surveys", icon: MessageSquare, count: surveys.length },
    { id: "analytics", label: "Analytics", icon: BarChart3, count: decisionResponses.length + surveyResponses.length },
    { id: "verification", label: "Verify", icon: CheckCircle2, count: verificationTxs.length },
    { id: "settings", label: "Settings", icon: Link, count: 0 },
  ];

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

        {/* Users */}
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
                      <td className="py-2 px-2 text-right text-primary">
                        <div className="flex items-center justify-end gap-1">
                          {p.points_balance || 0}
                          <button onClick={() => handleSyncUserBalance(p.id)} className="text-muted-foreground hover:text-primary transition-colors">
                            <RefreshCw className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-foreground">{referralCounts[p.id] || 0}</td>
                    </tr>
                  ))}
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

        {/* Goals - Fully Editable */}
        {activeTab === "goals" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground text-[13px]">Goal Categories</h3>
                {Object.keys(editedGoals).length > 0 && (
                  <GlassButton variant="primary" onClick={handleSaveGoals} disabled={saving} className="px-4 py-2 text-[11px]">
                    <Save className="w-3 h-3 mr-1 inline" /> {saving ? "Saving..." : "Save All"}
                  </GlassButton>
                )}
              </div>
              <div className="space-y-3">
                {goalCategories.map((cat) => {
                  const edited = editedGoals[cat.id] || {};
                  return (
                    <div key={cat.id} className="glass rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Edit2 className="w-3 h-3 text-muted-foreground" />
                        <button onClick={() => handleDeleteGoal(cat.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Type</p>
                          <input value={edited.goal_type ?? cat.goal_type} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], goal_type: e.target.value } }))} className="w-full glass-input rounded-lg px-3 py-2 text-[12px] text-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Subcategory</p>
                          <input value={edited.subcategory ?? (cat.subcategory || "")} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], subcategory: e.target.value || null } }))} className="w-full glass-input rounded-lg px-3 py-2 text-[12px] text-foreground" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Label</p>
                          <input value={edited.label ?? cat.label} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], label: e.target.value } }))} className="w-full glass-input rounded-lg px-3 py-2 text-[12px] text-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Max Price ₦</p>
                          <input type="number" value={edited.max_price ?? cat.max_price} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], max_price: parseInt(e.target.value) || 0 } }))} className="w-full glass-input rounded-lg px-3 py-2 text-[12px] text-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Add new goal */}
            <GlassCard animate={false}>
              <h3 className="font-semibold text-foreground text-[13px] mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Add Goal Category
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input value={newGoal.goal_type} onChange={e => setNewGoal(p => ({ ...p, goal_type: e.target.value }))} placeholder="Type (e.g. education)" className="glass-input rounded-xl px-3 py-2 text-[12px] text-foreground" />
                <input value={newGoal.subcategory} onChange={e => setNewGoal(p => ({ ...p, subcategory: e.target.value }))} placeholder="Subcategory (optional)" className="glass-input rounded-xl px-3 py-2 text-[12px] text-foreground" />
                <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder="Label" className="glass-input rounded-xl px-3 py-2 text-[12px] text-foreground" />
                <input type="number" value={newGoal.max_price} onChange={e => setNewGoal(p => ({ ...p, max_price: parseInt(e.target.value) || 0 }))} placeholder="Max price" className="glass-input rounded-xl px-3 py-2 text-[12px] text-foreground" />
              </div>
              <GlassButton variant="primary" onClick={handleCreateGoal} className="w-full text-[12px]">Add Goal</GlassButton>
            </GlassCard>
          </div>
        )}

        {/* Decisions */}
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
                    <option value="robust" className="bg-background">Robust (Advanced Switch)</option>
                  </select>
                </div>

                {(newApp.category === "yes_no" || newApp.category === "robust") && (
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
                    {newApp.category === "yes_no" && (
                      <input value={newApp.switch_link} onChange={e => setNewApp(p => ({ ...p, switch_link: e.target.value }))} placeholder="Switch link URL" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                    )}
                  </>
                )}

                {newApp.category === "robust" && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Link to Referral Apps (switch options):</p>
                    {referralApps.length === 0 && <p className="text-[10px] text-muted-foreground">Create referral apps first to link them here.</p>}
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {referralApps.map(ra => (
                        <label key={ra.id} className="flex items-center gap-2 glass rounded-lg p-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newApp.switch_to_referral_app_ids.includes(ra.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewApp(p => ({ ...p, switch_to_referral_app_ids: [...p.switch_to_referral_app_ids, ra.id] }));
                              } else {
                                setNewApp(p => ({ ...p, switch_to_referral_app_ids: p.switch_to_referral_app_ids.filter(id => id !== ra.id) }));
                              }
                            }}
                            className="accent-primary"
                          />
                          <span className="text-[12px] text-foreground">{ra.app_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
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
                          {app.category === "yes_no" ? "Yes/No" : app.category === "referral" ? "Referral" : "Robust"} • {app.is_active ? "Active" : "Inactive"}
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
                    {app.category === "yes_no" || app.category === "robust"
                      ? ` Select: ${app.points_select}pts | Intent: ${app.points_switch_intent}pts | Complete: ${app.points_switch_complete}pts`
                      : ` Referral: ${app.referral_points}pts`
                    }
                  </p>
                  {app.category === "robust" && (app.switch_to_referral_app_ids || []).length > 0 && (
                    <p className="text-[10px] text-primary mt-1">
                      Linked referral apps: {(app.switch_to_referral_app_ids || []).map(id => decisionApps.find(a => a.id === id)?.app_name).filter(Boolean).join(", ")}
                    </p>
                  )}

                  {pendingApprovals.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] text-primary font-semibold">Pending Approvals ({pendingApprovals.length})</p>
                      {pendingApprovals.map(pr => {
                        const userEmail = profiles.find(p => p.id === pr.user_id)?.email || pr.user_id.slice(0, 8);
                        const screenshotUrl = getPublicScreenshotUrl(pr.referral_screenshot_url);
                        return (
                          <div key={pr.id} className="flex items-center justify-between glass rounded-xl p-2">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-muted-foreground">{userEmail}</span>
                              {screenshotUrl && pr.referral_screenshot_url !== "pending_review" && (
                                <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline mt-0.5">
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

        {/* Surveys */}
        {activeTab === "surveys" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <h3 className="font-semibold text-foreground text-[13px] mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Create New Survey
              </h3>
              <div className="space-y-3">
                <input value={newSurvey.title} onChange={e => setNewSurvey(p => ({ ...p, title: e.target.value }))} placeholder="Survey Title" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                <textarea value={newSurvey.description} onChange={e => setNewSurvey(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] min-h-[60px] resize-none" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Points Reward</p>
                    <input type="number" value={newSurvey.points_reward} onChange={e => setNewSurvey(p => ({ ...p, points_reward: parseInt(e.target.value) || 0 }))} className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Completion Link (after quiz)</p>
                    <input value={newSurvey.completion_link} onChange={e => setNewSurvey(p => ({ ...p, completion_link: e.target.value }))} placeholder="https://..." className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                  </div>
                </div>
                <GlassButton variant="primary" onClick={handleCreateSurvey} className="w-full text-[13px]">Create Survey</GlassButton>
              </div>
            </GlassCard>

            {surveys.map(s => {
              const qs = surveyQuestions.filter(q => q.survey_id === s.id);
              const pendingApprovals = surveyResponses.filter(r => r.survey_id === s.id && r.screenshot_url && !r.is_approved);
              return (
                <GlassCard key={s.id} animate={false}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground text-[13px]">{s.title}</h4>
                      <p className="text-[11px] text-muted-foreground">{s.points_reward} pts • {qs.length} questions</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteSurvey(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="border-t border-border/30 pt-4">
                      <p className="text-[11px] font-semibold text-foreground mb-2">Questions</p>
                      {qs.map((q, idx) => (
                        <div key={q.id} className="glass rounded-lg p-3 mb-2 relative group">
                          <button onClick={() => handleDeleteQuestion(q.id)} className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                          <p className="text-[12px] text-foreground"><span className="text-muted-foreground">Q{idx+1}:</span> {q.question_text}</p>
                          <p className="text-[10px] text-primary mt-1">Answer: {q.correct_answer}</p>
                          <p className="text-[10px] text-muted-foreground">Options: {q.options.join(", ")}</p>
                        </div>
                      ))}

                      {/* Add question form */}
                      <div className="bg-primary/5 rounded-xl p-3 space-y-2 mt-3">
                        <p className="text-[11px] font-medium text-foreground">Add Question</p>
                        <input value={newQuestion.survey_id === s.id ? newQuestion.question_text : ""} onChange={e => setNewQuestion(p => ({ ...p, survey_id: s.id, question_text: e.target.value }))} placeholder="Question text" className="w-full glass-input rounded-lg px-3 py-2 text-[12px] text-foreground" />

                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">Options (one per line)</p>
                          <textarea
                            value={newQuestion.survey_id === s.id ? newQuestion.options.join("\n") : ""}
                            onChange={e => setNewQuestion(p => ({ ...p, survey_id: s.id, options: e.target.value.split("\n") }))}
                            placeholder="Option 1&#10;Option 2..."
                            className="w-full glass-input rounded-lg px-3 py-2 text-[12px] text-foreground min-h-[60px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">Correct Answer (must match one option exactly)</p>
                          <select
                            value={newQuestion.survey_id === s.id ? newQuestion.correct_answer : ""}
                            onChange={e => setNewQuestion(p => ({ ...p, survey_id: s.id, correct_answer: e.target.value }))}
                            className="w-full glass-input rounded-lg px-3 py-2 text-[12px] text-foreground bg-transparent"
                          >
                            <option value="">Select correct answer...</option>
                            {(newQuestion.survey_id === s.id ? newQuestion.options : []).map((opt, i) => opt.trim() && (
                              <option key={i} value={opt} className="bg-background">{opt}</option>
                            ))}
                          </select>
                        </div>

                        <GlassButton variant="primary" onClick={handleCreateQuestion} className="w-full py-2 text-[11px]">Add Question</GlassButton>
                      </div>
                    </div>

                    {pendingApprovals.length > 0 && (
                      <div className="border-t border-border/30 pt-4">
                        <p className="text-[11px] font-semibold text-primary mb-2">Pending Completions ({pendingApprovals.length})</p>
                        {pendingApprovals.map(pr => {
                          const userEmail = profiles.find(p => p.id === pr.user_id)?.email || pr.user_id.slice(0, 8);
                          const screenshotUrl = getPublicScreenshotUrl(pr.screenshot_url);
                          return (
                            <div key={pr.id} className="flex items-center justify-between glass rounded-xl p-2 mb-2">
                              <div className="flex flex-col">
                                <span className="text-[11px] text-muted-foreground">{userEmail}</span>
                                {screenshotUrl && (
                                  <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline mt-0.5">
                                    <ExternalLink className="w-2.5 h-2.5" /> View Screenshot
                                  </a>
                                )}
                              </div>
                              <GlassButton variant="primary" onClick={() => handleApproveSurvey(pr.id, pr.user_id)} className="px-3 py-1 text-[10px]">
                                <Check className="w-3 h-3 mr-1 inline" /> Approve
                              </GlassButton>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Analytics - Decision analytics */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground text-[13px]">Decision Analytics</h3>
                <GlassButton variant="outline" onClick={downloadDecisionAnalytics} className="px-3 py-1 text-[11px]">
                  <Download className="w-3 h-3 mr-1 inline" /> Download CSV
                </GlassButton>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-primary">{decisionResponses.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Responses</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{decisionResponses.filter(r => r.has_app).length}</p>
                  <p className="text-[10px] text-muted-foreground">Has App</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{decisionResponses.filter(r => r.referral_approved).length}</p>
                  <p className="text-[10px] text-muted-foreground">Referrals Approved</p>
                </div>
              </div>

              {decisionApps.map(app => {
                const appResps = decisionResponses.filter(r => r.app_id === app.id);
                const hasApp = appResps.filter(r => r.has_app).length;
                const wouldSwitch = appResps.filter(r => r.would_switch === true).length;
                const switched = appResps.filter(r => r.switch_completed).length;
                const pct = appResps.length > 0 ? Math.round((hasApp / appResps.length) * 100) : 0;
                return (
                  <div key={app.id} className="glass rounded-xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-foreground text-[13px]">{app.app_name}</p>
                      <span className="text-[10px] text-muted-foreground capitalize">{app.category}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex gap-4 text-[11px]">
                      <span className="text-primary">{hasApp} selected ({pct}%)</span>
                      <span className="text-muted-foreground">{wouldSwitch} would switch</span>
                      <span className="text-muted-foreground">{switched} switched</span>
                      <span className="text-muted-foreground">{appResps.length} total</span>
                    </div>
                  </div>
                );
              })}
            </GlassCard>
          </div>
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
              <div className="flex items-center justify-between p-3 glass rounded-xl">
                <div>
                  <label className="text-[13px] font-medium text-foreground">Verify Page Active</label>
                  <p className="text-[11px] text-muted-foreground">If disabled, users will see "Coming Soon" on the verify page.</p>
                </div>
                <input
                  type="checkbox"
                  checked={verifyPageActive}
                  onChange={e => setVerifyPageActive(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Verify Expense Button Link</label>
                <input value={verifyExpenseLink} onChange={e => setVerifyExpenseLink(e.target.value)} placeholder="https://..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Post-Queue Referral Points</label>
                <input type="number" value={postQueueReferralPoints} onChange={e => setPostQueueReferralPoints(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Verify Spend Link</label>
                <input value={verifySpendLink} onChange={e => setVerifySpendLink(e.target.value)} placeholder="https://..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Verify Spend Description</label>
                <textarea value={verifySpendDescription} onChange={e => setVerifySpendDescription(e.target.value)} placeholder="Describe..." className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1 min-h-[60px] resize-none" />
              </div>
              <hr className="border-border/30" />
              <h4 className="font-semibold text-foreground text-[13px]">Footer Content</h4>
              <div>
                <label className="text-[13px] text-muted-foreground">About Us</label>
                <textarea value={footerAboutUs} onChange={e => setFooterAboutUs(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1 min-h-[60px] resize-none" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Contact Us</label>
                <textarea value={footerContactUs} onChange={e => setFooterContactUs(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1 min-h-[60px] resize-none" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">Invest With Us</label>
                <textarea value={footerInvestWithUs} onChange={e => setFooterInvestWithUs(e.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] mt-1 min-h-[60px] resize-none" />
              </div>
              <GlassButton variant="primary" onClick={handleSaveSettings} disabled={saving} className="w-full text-[13px]">
                <Save className="inline w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Settings"}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* Sync Utilities */}
        <div className="flex gap-4">
          <GlassButton variant="outline" onClick={handleSyncAllBalances} disabled={refreshing} className="flex-1 text-[12px]">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Sync All Balances
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

export default Admin;
