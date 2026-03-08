import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import WaterBackground from "@/components/WaterBackground";
import { Users, Ghost, Activity, LogOut, RefreshCw, Shield, Settings, Save, MessageSquare, ChartBar as BarChart3, Plus, Trash2, Link, Upload, CircleCheck as CheckCircle2, FileSpreadsheet, Smartphone, Check, ExternalLink, CreditCard as Edit2, Download, Star, Wallet, ArrowDownToLine, Ban, AlertTriangle, Eye, X, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notifications";

interface ProfileRow {
  id: string; email: string; total_annual_spend: number; selected_goal: string | null;
  queue_position: number; referral_code: string | null; points_balance: number; created_at: string;
  is_banned: boolean; ban_reason: string | null;
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
  is_duplicate: boolean; duplicate_note: string | null;
}
interface UserWarning {
  id: string; user_id: string; reason: string; issued_by: string; created_at: string;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");
const fromApps = () => supabase.from("decision_apps" as any);
const fromDResponses = () => supabase.from("decision_responses" as any);

type AdminTab = "users" | "ghosts" | "activity" | "goals" | "decisions" | "analytics" | "verification" | "settings" | "inf_apps" | "inf_wallets" | "inf_referrals" | "inf_withdrawals" | "inf_challenges" | "warnings";

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

  // User management state
  const [userWarnings, setUserWarnings] = useState<UserWarning[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [warningText, setWarningText] = useState("");
  const [banReason, setBanReason] = useState("");
  const [editingProfile, setEditingProfile] = useState<{ email: string; points_balance: number; queue_position: number } | null>(null);

  // Influencer state
  const [infApps, setInfApps] = useState<any[]>([]);
  const [infWallets, setInfWallets] = useState<any[]>([]);
  const [infBankAccounts, setInfBankAccounts] = useState<any[]>([]);
  const [infReferrals, setInfReferrals] = useState<any[]>([]);
  const [infWithdrawals, setInfWithdrawals] = useState<any[]>([]);
  const [infChallenges, setInfChallenges] = useState<any[]>([]);
  const [infChallengeSubmissions, setInfChallengeSubmissions] = useState<any[]>([]);
  const [infChallengeEnrollments, setInfChallengeEnrollments] = useState<any[]>([]);
  const [newChallenge, setNewChallenge] = useState({
    title: "", description: "", instructions: "", hashtag: "",
    challenge_type: "single" as string, total_videos: 1, reward_per_video: 3000, posting_interval_days: 1,
  });

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

  const [newGoal, setNewGoal] = useState({ goal_type: "", subcategory: "", label: "", max_price: 0 });

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [loading, isAdmin, navigate]);

  const fetchData = async () => {
    setRefreshing(true);
    const [profilesRes, ghostsRes, activityRes, goalsRes, settingsRes, vtRes, daRes, drRes] = await Promise.all([
      supabase.from("profiles").select("*").order("queue_position", { ascending: true }),
      supabase.from("ghost_users").select("id", { count: "exact", head: true }),
      supabase.from("waitlist_activity").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("goal_categories").select("*").order("goal_type"),
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
    setVerificationTxs((vtRes.data as VerificationTx[]) || []);
    setDecisionApps((daRes.data || []) as unknown as DecisionAppRow[]);
    setDecisionResponses((drRes.data || []) as unknown as DecisionResponseRow[]);
    setEditedGoals({});

    // Fetch influencer data
    const [iaRes, iwRes, ibRes, irRes, iwdRes] = await Promise.all([
      supabase.from("influencer_applications" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("influencer_wallets" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("influencer_bank_accounts" as any).select("*"),
      supabase.from("influencer_referrals" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("influencer_withdrawals" as any).select("*").order("created_at", { ascending: false }),
    ]);
    setInfApps((iaRes.data || []) as any[]);
    setInfWallets((iwRes.data || []) as any[]);
    setInfBankAccounts((ibRes.data || []) as any[]);
    setInfReferrals((irRes.data || []) as any[]);
    setInfWithdrawals((iwdRes.data || []) as any[]);

    // Fetch challenge data
    const [icRes, icsRes, iceRes] = await Promise.all([
      supabase.from("influencer_challenges" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("influencer_challenge_submissions" as any).select("*").order("submitted_at", { ascending: false }),
      supabase.from("influencer_challenge_enrollments" as any).select("*"),
    ]);
    setInfChallenges((icRes.data || []) as any[]);
    setInfChallengeSubmissions((icsRes.data || []) as any[]);
    setInfChallengeEnrollments((iceRes.data || []) as any[]);

    // Fetch warnings
    const { data: warningsData } = await supabase.from("user_warnings" as any).select("*").order("created_at", { ascending: false });
    setUserWarnings((warningsData || []) as unknown as UserWarning[]);

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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("points_balance")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        toast({ title: "Error fetching profile", description: profileError?.message || "Profile not found" });
        return;
      }

      const newBalance = (profile.points_balance || 0) + app.referral_points;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points_balance: newBalance })
        .eq("id", userId);

      if (updateError) {
        toast({ title: "Error updating points", description: updateError.message });
        return;
      }

      toast({ title: "Referral approved", description: `${app.referral_points} points awarded to user` });
      await fetchData();
    } catch (error) {
      toast({ title: "Approval failed", description: (error as Error).message });
    }
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
      let duplicateCount = 0;
      // Track which tx_ids in THIS CSV have already been verified (first one wins)
      const verifiedInThisRun = new Set<string>();

      for (const row of rows) {
        // Check if this transaction_id has ALREADY been verified (globally)
        const { data: alreadyVerified } = await supabase.from("verification_transactions")
          .select("id, user_id").eq("transaction_id", row.transaction_id).eq("is_verified", true).limit(1);

        const isGlobalDuplicate = (alreadyVerified && alreadyVerified.length > 0) || verifiedInThisRun.has(row.transaction_id);

        const { data: matches } = await supabase.from("verification_transactions")
          .select("id, user_id, verification_id")
          .eq("transaction_id", row.transaction_id)
          .eq("is_verified", false)
          .eq("is_duplicate", false);

        if (matches && matches.length > 0) {
          if (isGlobalDuplicate) {
            // Mark ALL unverified matches as duplicates
            for (const match of matches) {
              await supabase.from("verification_transactions").update({
                is_duplicate: true,
                duplicate_note: `Duplicate of already-verified transaction. Original verified for user ${alreadyVerified?.[0]?.user_id?.slice(0, 8) || 'unknown'}.`
              } as any).eq("id", match.id);

              // Notify the user about the duplicate
              await supabase.from("notifications" as any).insert({
                user_id: match.user_id,
                type: "warning",
                title: "Duplicate Transaction ID Detected",
                message: `Your transaction ID "${row.transaction_id}" was flagged as a duplicate and could not be verified. This transaction ID has already been used. Please submit a unique transaction ID.`,
              } as any);

              duplicateCount++;
            }
          } else {
            // Verify only the FIRST match, mark rest as duplicates
            const firstMatch = matches[0];
            await supabase.from("verification_transactions").update({ is_verified: true, verified_amount: row.amount }).eq("id", firstMatch.id);
            verifiedInThisRun.add(row.transaction_id);
            matchCount++;

            // Mark remaining matches as duplicates
            for (let i = 1; i < matches.length; i++) {
              await supabase.from("verification_transactions").update({
                is_duplicate: true,
                duplicate_note: `Duplicate submission. Already verified for user ${firstMatch.user_id.slice(0, 8)}.`
              } as any).eq("id", matches[i].id);

              await supabase.from("notifications" as any).insert({
                user_id: matches[i].user_id,
                type: "warning",
                title: "Duplicate Transaction ID Detected",
                message: `Your transaction ID "${row.transaction_id}" was flagged as a duplicate and could not be verified.`,
              } as any);

              duplicateCount++;
            }

            // Verification calculation logic (same as before)
            const { data: allTxs } = await supabase.from("verification_transactions").select("is_verified, verified_amount").eq("verification_id", firstMatch.verification_id);
            const { data: verif } = await supabase.from("spend_verifications").select("frequency").eq("id", firstMatch.verification_id).single();
            if (allTxs && verif) {
              const verifiedTxs = allTxs.filter(t => t.is_verified);
              const totalAmount = verifiedTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0);
              const freq = (verif as any).frequency;
              if (freq === "monthly" && verifiedTxs.length >= 1) {
                const annualAmount = Math.round(Number(verifiedTxs[0].verified_amount || 0) * 12);
                await supabase.from("spend_verifications").update({ status: "verified", recalculated_amount: annualAmount }).eq("id", firstMatch.verification_id);
                await supabase.from("profiles").update({ total_annual_spend: annualAmount, spend_verified: true }).eq("id", firstMatch.user_id);
              } else if (verifiedTxs.length === 1) {
                const multiplier = freq === "daily" ? 365 : 52;
                const initialAnnual = Math.round(Number(verifiedTxs[0].verified_amount || 0) * multiplier);
                await supabase.from("profiles").update({ total_annual_spend: initialAnnual }).eq("id", firstMatch.user_id);
              }
              const { data: vData } = await supabase.from("spend_verifications").select("ends_at").eq("id", firstMatch.verification_id).single();
              if (vData && new Date() >= new Date((vData as any).ends_at) && freq !== "monthly") {
                const recalcMultiplier = freq === "daily" ? 12 : 13;
                const finalAnnual = Math.round(totalAmount * recalcMultiplier);
                await supabase.from("spend_verifications").update({ status: "verified", recalculated_amount: finalAnnual }).eq("id", firstMatch.verification_id);
                await supabase.from("profiles").update({ total_annual_spend: finalAnnual, spend_verified: true }).eq("id", firstMatch.user_id);
              }
            }
          }
        }
      }
      toast({
        title: `CSV processed`,
        description: `${matchCount} verified, ${duplicateCount} duplicates flagged from ${rows.length} rows.`
      });
      await fetchData();
    } catch {
      toast({ title: "CSV error", description: "Failed to process CSV file." });
    }
    setCsvUploading(false);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  // Admin user management functions
  const handleBanUser = async (userId: string, reason: string) => {
    await supabase.from("profiles").update({ is_banned: true, ban_reason: reason } as any).eq("id", userId);
    await supabase.from("notifications" as any).insert({
      user_id: userId, type: "ban", title: "Account Banned",
      message: `Your account has been banned. Reason: ${reason}`,
    } as any);
    toast({ title: "User banned" });
    setBanReason("");
    setSelectedUserId(null);
    await fetchData();
  };

  const handleUnbanUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_banned: false, ban_reason: null } as any).eq("id", userId);
    await supabase.from("notifications" as any).insert({
      user_id: userId, type: "info", title: "Account Unbanned",
      message: "Your account ban has been lifted.",
    } as any);
    toast({ title: "User unbanned" });
    await fetchData();
  };

  const handleIssueWarning = async (userId: string, reason: string) => {
    const { user } = (await supabase.auth.getUser()).data;
    if (!user) return;
    await supabase.from("user_warnings" as any).insert({
      user_id: userId, reason, issued_by: user.id,
    } as any);
    await supabase.from("notifications" as any).insert({
      user_id: userId, type: "warning", title: "Warning Issued",
      message: `You have received a warning: ${reason}`,
    } as any);
    toast({ title: "Warning issued" });
    setWarningText("");
    await fetchData();
  };

  const handleUpdateProfile = async (userId: string, updates: { email?: string; points_balance?: number; queue_position?: number }) => {
    await supabase.from("profiles").update(updates).eq("id", userId);
    toast({ title: "Profile updated" });
    setEditingProfile(null);
    setSelectedUserId(null);
    await fetchData();
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
    { id: "warnings", label: "Warnings", icon: AlertTriangle, count: userWarnings.length },
    { id: "ghosts", label: "Ghosts", icon: Ghost, count: ghostCount },
    { id: "activity", label: "Activity", icon: Activity, count: activities.length },
    { id: "goals", label: "Goals", icon: Settings, count: goalCategories.length },
    { id: "decisions", label: "Decisions", icon: Smartphone, count: decisionApps.length },
    { id: "analytics", label: "Analytics", icon: BarChart3, count: decisionResponses.length },
    { id: "verification", label: "Verify", icon: CheckCircle2, count: verificationTxs.length },
    { id: "inf_apps", label: "Inf. Apps", icon: Star, count: infApps.length },
    { id: "inf_wallets", label: "Inf. Wallets", icon: Wallet, count: infWallets.length },
    { id: "inf_referrals", label: "Inf. Refs", icon: Users, count: infReferrals.length },
    { id: "inf_withdrawals", label: "Inf. W/D", icon: ArrowDownToLine, count: infWithdrawals.length },
    { id: "inf_challenges", label: "Challenges", icon: Upload, count: infChallenges.length },
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
          <div className="space-y-4">
            <GlassCard animate={false}>
              <h3 className="font-semibold text-foreground text-[13px] mb-4">Registered Users ({profiles.length})</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {profiles.map((p) => {
                  const isSelected = selectedUserId === p.id;
                  const pWarnings = userWarnings.filter(w => w.user_id === p.id);
                  const pDuplicates = verificationTxs.filter(t => t.user_id === p.id && t.is_duplicate);
                  return (
                    <div key={p.id} className={`glass rounded-xl p-3 ${p.is_banned ? 'border border-destructive/30' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[12px] font-semibold text-foreground">{p.email}</p>
                            {p.is_banned && <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">BANNED</span>}
                            {pDuplicates.length > 0 && <span className="text-[9px] bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded-full">{pDuplicates.length} dup</span>}
                            {pWarnings.length > 0 && <span className="text-[9px] bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded-full">{pWarnings.length} warn</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Spend: {formatNaira(p.total_annual_spend || 0)} • Queue: #{p.queue_position} • Points: {p.points_balance} • Refs: {referralCounts[p.id] || 0}
                          </p>
                        </div>
                        <button onClick={() => { setSelectedUserId(isSelected ? null : p.id); setEditingProfile(null); }} className="text-muted-foreground hover:text-foreground">
                          {isSelected ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {isSelected && (
                        <div className="mt-3 space-y-3 border-t border-border/30 pt-3">
                          <p className="text-[10px] text-muted-foreground">ID: {p.id}</p>
                          <p className="text-[10px] text-muted-foreground">Joined: {new Date(p.created_at).toLocaleDateString()}</p>
                          <p className="text-[10px] text-muted-foreground">Goal: {p.selected_goal || 'None'} • Referral Code: {p.referral_code || 'None'}</p>

                          {/* Duplicate TXs for this user */}
                          {pDuplicates.length > 0 && (
                            <div className="glass rounded-lg p-2">
                              <p className="text-[10px] text-yellow-600 font-semibold mb-1">Duplicate Transactions:</p>
                              {pDuplicates.map(d => (
                                <p key={d.id} className="text-[10px] text-muted-foreground font-mono">{d.transaction_id} — {d.duplicate_note}</p>
                              ))}
                            </div>
                          )}

                          {/* Edit profile */}
                          {editingProfile ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <p className="text-[9px] text-muted-foreground">Points</p>
                                  <input type="number" value={editingProfile.points_balance} onChange={e => setEditingProfile(prev => prev ? { ...prev, points_balance: parseInt(e.target.value) || 0 } : null)} className="w-full glass-input rounded-lg px-2 py-1 text-[11px] text-foreground" />
                                </div>
                                <div>
                                  <p className="text-[9px] text-muted-foreground">Queue #</p>
                                  <input type="number" value={editingProfile.queue_position} onChange={e => setEditingProfile(prev => prev ? { ...prev, queue_position: parseInt(e.target.value) || 0 } : null)} className="w-full glass-input rounded-lg px-2 py-1 text-[11px] text-foreground" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <GlassButton variant="primary" onClick={() => handleUpdateProfile(p.id, { points_balance: editingProfile.points_balance, queue_position: editingProfile.queue_position })} className="flex-1 text-[10px]"><Check className="w-3 h-3 mr-1" /> Save</GlassButton>
                                <GlassButton variant="outline" onClick={() => setEditingProfile(null)} className="text-[10px]">Cancel</GlassButton>
                              </div>
                            </div>
                          ) : (
                            <GlassButton variant="outline" onClick={() => setEditingProfile({ email: p.email, points_balance: p.points_balance, queue_position: p.queue_position })} className="w-full text-[10px]"><Edit2 className="w-3 h-3 mr-1" /> Edit Profile</GlassButton>
                          )}

                          {/* Warning */}
                          <div className="flex gap-2">
                            <input value={selectedUserId === p.id ? warningText : ""} onChange={e => setWarningText(e.target.value)} placeholder="Warning reason..." className="flex-1 glass-input rounded-lg px-2 py-1.5 text-[11px] text-foreground" />
                            <GlassButton variant="outline" onClick={() => { if (warningText.trim()) handleIssueWarning(p.id, warningText); }} disabled={!warningText.trim()} className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" /> Warn</GlassButton>
                          </div>

                          {/* Ban/Unban */}
                          {p.is_banned ? (
                            <GlassButton variant="primary" onClick={() => handleUnbanUser(p.id)} className="w-full text-[10px]"><Check className="w-3 h-3 mr-1" /> Unban User</GlassButton>
                          ) : (
                            <div className="flex gap-2">
                              <input value={selectedUserId === p.id ? banReason : ""} onChange={e => setBanReason(e.target.value)} placeholder="Ban reason..." className="flex-1 glass-input rounded-lg px-2 py-1.5 text-[11px] text-foreground" />
                              <GlassButton variant="outline" onClick={() => { if (banReason.trim()) handleBanUser(p.id, banReason); }} disabled={!banReason.trim()} className="text-[10px] text-destructive"><Ban className="w-3 h-3 mr-1" /> Ban</GlassButton>
                            </div>
                          )}

                          {/* Warnings history */}
                          {pWarnings.length > 0 && (
                            <div className="glass rounded-lg p-2">
                              <p className="text-[10px] font-semibold text-orange-600 mb-1">Warning History:</p>
                              {pWarnings.map(w => (
                                <p key={w.id} className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()} — {w.reason}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
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
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-primary">{verificationTxs.filter(t => t.is_verified).length}</p>
                  <p className="text-[10px] text-muted-foreground">Verified</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{verificationTxs.filter(t => !t.is_verified && !t.is_duplicate).length}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-destructive">{verificationTxs.filter(t => t.is_duplicate).length}</p>
                  <p className="text-[10px] text-muted-foreground">Duplicates</p>
                </div>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {verificationTxs.map(tx => {
                  const userEmail = profiles.find(p => p.id === tx.user_id)?.email || tx.user_id.slice(0, 8);
                  return (
                    <div key={tx.id} className={`flex items-center justify-between glass rounded-xl p-3 ${tx.is_duplicate ? 'border border-destructive/30' : ''}`}>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{userEmail}</p>
                        <p className="text-[13px] font-mono text-foreground">{tx.transaction_id}</p>
                        {tx.is_duplicate && <p className="text-[9px] text-destructive">{tx.duplicate_note || 'Duplicate'}</p>}
                      </div>
                      <div className="text-right">
                        {tx.is_duplicate ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Duplicate</span>
                          </div>
                        ) : tx.is_verified ? (
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

        {/* Warnings Tab */}
        {activeTab === "warnings" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" /> User Warnings & Bans
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">{userWarnings.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Warnings</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-destructive">{profiles.filter(p => p.is_banned).length}</p>
                <p className="text-[10px] text-muted-foreground">Banned Users</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-foreground">{verificationTxs.filter(t => t.is_duplicate).length}</p>
                <p className="text-[10px] text-muted-foreground">Dup TX IDs</p>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {userWarnings.map(w => {
                const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id.slice(0, 8);
                return (
                  <div key={w.id} className="glass rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{w.reason}</p>
                  </div>
                );
              })}
              {userWarnings.length === 0 && <p className="text-center py-8 text-muted-foreground text-[13px]">No warnings issued yet</p>}
            </div>
          </GlassCard>
        )}

        {/* Influencer Applications */}
        {activeTab === "inf_apps" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">Influencer Applications</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">{infApps.filter(a => a.status === "pending_review").length}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-foreground">{infApps.filter(a => a.status === "approved").length}</p>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-foreground">{infApps.filter(a => a.status === "rejected").length}</p>
                <p className="text-[10px] text-muted-foreground">Rejected</p>
              </div>
            </div>
            <div className="space-y-2">
              {infApps.map((app: any) => {
                const userEmail = profiles.find(p => p.id === app.user_id)?.email || app.user_id?.slice(0, 8);
                return (
                  <div key={app.id} className="glass rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                        <a href={app.social_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5" /> {app.social_link}
                        </a>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${app.status === "approved" ? "bg-primary/10 text-primary" : app.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {app.status}
                      </span>
                    </div>
                    {(app.status === "pending_review" || app.status === "pending_appeal") && (
                      <div className="flex gap-2 mt-2">
                        {app.status === "pending_appeal" && <p className="text-[10px] text-primary w-full mb-1">⚡ This is an appeal</p>}
                        <GlassButton variant="primary" onClick={async () => {
                          await supabase.from("influencer_applications" as any).update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", app.id);
                          await supabase.from("profiles").update({ queue_position: 0, off_queue_at: new Date().toISOString() }).eq("id", app.user_id);
                          toast({ title: "Application approved" });
                          await fetchData();
                        }} className="flex-1 text-[11px]"><Check className="w-3 h-3 mr-1" /> Approve</GlassButton>
                        <GlassButton variant="outline" onClick={async () => {
                          const newStatus = app.status === "pending_appeal" ? "appeal_rejected" : "rejected";
                          await supabase.from("influencer_applications" as any).update({ status: newStatus, reviewed_at: new Date().toISOString() }).eq("id", app.id);
                          toast({ title: app.status === "pending_appeal" ? "Appeal rejected" : "Application rejected" });
                          await fetchData();
                        }} className="flex-1 text-[11px]">Reject</GlassButton>
                      </div>
                    )}
                  </div>
                );
              })}
              {infApps.length === 0 && <p className="text-center py-8 text-muted-foreground text-[13px]">No applications yet</p>}
            </div>
          </GlassCard>
        )}

        {/* Influencer Wallet Activations */}
        {activeTab === "inf_wallets" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">Influencer Wallet Activations</h3>
            <div className="space-y-2">
              {infWallets.map((w: any) => {
                const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id?.slice(0, 8);
                const bank = infBankAccounts.find((b: any) => b.user_id === w.user_id);
                return (
                  <div key={w.id} className="glass rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${w.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {w.status}
                      </span>
                    </div>
                    {bank && (
                      <div className="text-[11px] text-muted-foreground mb-2">
                        <p>Bank: {bank.bank_name} • Acct: {bank.account_number}</p>
                        <p>Name: {bank.account_name}</p>
                        {bank.id_document_url && (
                          <button onClick={async () => {
                            const { data, error } = await supabase.storage.from("id-documents").createSignedUrl(bank.id_document_url!, 3600);
                            if (error || !data?.signedUrl) {
                              alert("Failed to load document: " + (error?.message || "Unknown error"));
                              return;
                            }
                            window.open(data.signedUrl, "_blank");
                          }} className="text-primary hover:underline flex items-center gap-1 mt-1">
                            <ExternalLink className="w-2.5 h-2.5" /> View ID Document
                          </button>
                        )}
                      </div>
                    )}
                    {w.status === "pending_activation" && (
                      <div className="flex gap-2">
                        <GlassButton variant="primary" onClick={async () => {
                          await supabase.from("influencer_wallets" as any).update({ status: "active" }).eq("id", w.id);
                          if (bank) {
                            await supabase.from("influencer_bank_accounts" as any).update({ verification_status: "verified" }).eq("id", bank.id);
                          }
                          toast({ title: "Wallet activated" });
                          await fetchData();
                        }} className="flex-1 text-[11px]"><Check className="w-3 h-3 mr-1" /> Approve Wallet</GlassButton>
                        <GlassButton variant="outline" onClick={async () => {
                          await supabase.from("influencer_wallets" as any).update({ status: "rejected" }).eq("id", w.id);
                          toast({ title: "Wallet rejected" });
                          await fetchData();
                        }} className="flex-1 text-[11px]">Reject</GlassButton>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">Balance: {formatNaira(w.balance || 0)}</p>
                  </div>
                );
              })}
              {infWallets.length === 0 && <p className="text-center py-8 text-muted-foreground text-[13px]">No wallet activations yet</p>}
            </div>
          </GlassCard>
        )}

        {/* Influencer Referrals */}
        {activeTab === "inf_referrals" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">Influencer Referrals</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">{infReferrals.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Referrals</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-foreground">{formatNaira(infReferrals.reduce((s: number, r: any) => s + (r.reward_amount || 0), 0))}</p>
                <p className="text-[10px] text-muted-foreground">Total Earnings</p>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {infReferrals.map((r: any) => {
                const infEmail = profiles.find(p => p.id === r.influencer_id)?.email || r.influencer_id?.slice(0, 8);
                const refEmail = profiles.find(p => p.id === r.referred_user_id)?.email || r.referred_user_id?.slice(0, 8);
                return (
                  <div key={r.id} className="flex items-center justify-between glass rounded-xl p-3">
                    <div>
                      <p className="text-[11px] text-foreground">{infEmail} → {refEmail}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-[11px] text-primary font-semibold">{formatNaira(r.reward_amount)}</p>
                  </div>
                );
              })}
              {infReferrals.length === 0 && <p className="text-center py-8 text-muted-foreground text-[13px]">No influencer referrals yet</p>}
            </div>
          </GlassCard>
        )}

        {/* Influencer Withdrawals */}
        {activeTab === "inf_withdrawals" && (
          <GlassCard animate={false}>
            <h3 className="font-semibold text-foreground text-[13px] mb-4">Influencer Withdrawals</h3>
            <div className="space-y-2">
              {infWithdrawals.map((w: any) => {
                const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id?.slice(0, 8);
                const bank = infBankAccounts.find((b: any) => b.id === w.bank_account_id);
                return (
                  <div key={w.id} className="glass rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${w.status === "approved" ? "bg-primary/10 text-primary" : w.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {w.status}
                      </span>
                    </div>
                    <p className="text-[13px] font-bold text-primary">{formatNaira(w.amount)}</p>
                    {bank && <p className="text-[10px] text-muted-foreground">{bank.bank_name} • {bank.account_number} • {bank.account_name}</p>}
                    {w.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <GlassButton variant="primary" onClick={async () => {
                          // Deduct from wallet
                          const wallet = infWallets.find((wl: any) => wl.user_id === w.user_id);
                          if (wallet) {
                            const newBal = Math.max(0, (wallet.balance || 0) - w.amount);
                            await supabase.from("influencer_wallets" as any).update({ balance: newBal }).eq("id", wallet.id);
                          }
                          await supabase.from("influencer_withdrawals" as any).update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", w.id);
                          toast({ title: "Withdrawal approved" });
                          await fetchData();
                        }} className="flex-1 text-[11px]"><Check className="w-3 h-3 mr-1" /> Approve</GlassButton>
                        <GlassButton variant="outline" onClick={async () => {
                          await supabase.from("influencer_withdrawals" as any).update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", w.id);
                          toast({ title: "Withdrawal rejected" });
                          await fetchData();
                        }} className="flex-1 text-[11px]">Reject</GlassButton>
                      </div>
                    )}
                  </div>
                );
              })}
              {infWithdrawals.length === 0 && <p className="text-center py-8 text-muted-foreground text-[13px]">No withdrawals yet</p>}
            </div>
          </GlassCard>
        )}

        {/* Influencer Challenges */}
        {activeTab === "inf_challenges" && (
          <div className="space-y-4">
            <GlassCard animate={false}>
              <h3 className="font-semibold text-foreground text-[13px] mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Create Challenge
              </h3>
              <div className="space-y-3">
                <input value={newChallenge.title} onChange={e => setNewChallenge(p => ({ ...p, title: e.target.value }))} placeholder="Challenge title (e.g. Street Interview Challenge)" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                <textarea value={newChallenge.description} onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))} placeholder="Challenge description" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] min-h-[60px] resize-none" />
                <textarea value={newChallenge.instructions} onChange={e => setNewChallenge(p => ({ ...p, instructions: e.target.value }))} placeholder="Instructions for influencers" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] min-h-[60px] resize-none" />
                <input value={newChallenge.hashtag} onChange={e => setNewChallenge(p => ({ ...p, hashtag: e.target.value }))} placeholder="Hashtag (e.g. #RealloChallenge)" className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Challenge Type</p>
                  <select value={newChallenge.challenge_type} onChange={e => setNewChallenge(p => ({ ...p, challenge_type: e.target.value, total_videos: e.target.value === "single" ? 1 : p.total_videos }))} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] bg-transparent">
                    <option value="single" className="bg-background">Single Video</option>
                    <option value="set" className="bg-background">Set (Multiple Videos)</option>
                  </select>
                </div>
                {newChallenge.challenge_type === "set" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Total Videos</p>
                      <input type="number" value={newChallenge.total_videos} onChange={e => setNewChallenge(p => ({ ...p, total_videos: parseInt(e.target.value) || 1 }))} min={2} className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Post interval (days)</p>
                      <input type="number" value={newChallenge.posting_interval_days} onChange={e => setNewChallenge(p => ({ ...p, posting_interval_days: parseInt(e.target.value) || 1 }))} min={1} className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Reward per video (₦)</p>
                  <input type="number" value={newChallenge.reward_per_video} onChange={e => setNewChallenge(p => ({ ...p, reward_per_video: parseInt(e.target.value) || 0 }))} className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[13px]" />
                </div>
                <GlassButton variant="primary" onClick={async () => {
                  if (!newChallenge.title) return;
                  await supabase.from("influencer_challenges" as any).insert({
                    title: newChallenge.title,
                    description: newChallenge.description,
                    instructions: newChallenge.instructions,
                    hashtag: newChallenge.hashtag,
                    challenge_type: newChallenge.challenge_type,
                    total_videos: newChallenge.challenge_type === "single" ? 1 : newChallenge.total_videos,
                    reward_per_video: newChallenge.reward_per_video,
                    posting_interval_days: newChallenge.posting_interval_days,
                  } as any);
                  toast({ title: "Challenge created" });
                  setNewChallenge({ title: "", description: "", instructions: "", hashtag: "", challenge_type: "single", total_videos: 1, reward_per_video: 3000, posting_interval_days: 1 });
                  await fetchData();
                }} className="w-full text-[13px]">Create Challenge</GlassButton>
              </div>
            </GlassCard>

            {/* Existing challenges */}
            {infChallenges.map((ch: any) => {
              const enrollments = infChallengeEnrollments.filter((e: any) => e.challenge_id === ch.id);
              const submissions = infChallengeSubmissions.filter((s: any) => s.challenge_id === ch.id);
              const pendingSubs = submissions.filter((s: any) => s.status === "pending_review");
              return (
                <GlassCard key={ch.id} animate={false}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground text-[13px]">{ch.title}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        {ch.challenge_type === "single" ? "Single Video" : `Set of ${ch.total_videos} videos`} • {formatNaira(ch.reward_per_video)}/video • {ch.hashtag} • {ch.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <GlassButton variant="outline" onClick={async () => {
                        await supabase.from("influencer_challenges" as any).update({ is_active: !ch.is_active } as any).eq("id", ch.id);
                        await fetchData();
                      }} className="px-3 py-1 text-[11px]">{ch.is_active ? "Deactivate" : "Activate"}</GlassButton>
                      <button onClick={async () => {
                        await supabase.from("influencer_challenges" as any).delete().eq("id", ch.id);
                        toast({ title: "Challenge deleted" });
                        await fetchData();
                      }} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">{ch.description}</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="glass rounded-lg p-2 text-center">
                      <p className="text-[13px] font-bold text-primary">{enrollments.length}</p>
                      <p className="text-[9px] text-muted-foreground">Enrolled</p>
                    </div>
                    <div className="glass rounded-lg p-2 text-center">
                      <p className="text-[13px] font-bold text-foreground">{submissions.length}</p>
                      <p className="text-[9px] text-muted-foreground">Submissions</p>
                    </div>
                    <div className="glass rounded-lg p-2 text-center">
                      <p className="text-[13px] font-bold text-foreground">{pendingSubs.length}</p>
                      <p className="text-[9px] text-muted-foreground">Pending</p>
                    </div>
                  </div>

                  {/* Pending submissions for approval */}
                  {pendingSubs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-primary font-semibold">Pending Approvals</p>
                      {pendingSubs.map((sub: any) => {
                        const userEmail = profiles.find(p => p.id === sub.user_id)?.email || sub.user_id?.slice(0, 8);
                        const enrollment = enrollments.find((e: any) => e.user_id === sub.user_id);
                        return (
                          <div key={sub.id} className="glass rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <p className="text-[11px] text-foreground font-semibold">{userEmail}</p>
                                <p className="text-[9px] text-muted-foreground">Video #{sub.video_number} of {ch.total_videos}</p>
                              </div>
                              <a href={sub.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="w-2.5 h-2.5" /> View
                              </a>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <GlassButton variant="primary" onClick={async () => {
                                // Approve submission
                                await supabase.from("influencer_challenge_submissions" as any).update({
                                  status: "approved", reviewed_at: new Date().toISOString()
                                } as any).eq("id", sub.id);

                                // Update enrollment earnings
                                if (enrollment) {
                                  const newPending = Math.max(0, (enrollment.pending_earnings || 0) - ch.reward_per_video);
                                  const newApproved = (enrollment.approved_earnings || 0) + ch.reward_per_video;

                                  // Check if all videos are now approved
                                  const allSubs = submissions.filter((s: any) => s.user_id === sub.user_id);
                                  const approvedCount = allSubs.filter((s: any) => s.status === "approved").length + 1; // +1 for this one
                                  const isComplete = approvedCount >= ch.total_videos;

                                  await supabase.from("influencer_challenge_enrollments" as any).update({
                                    pending_earnings: newPending,
                                    approved_earnings: newApproved,
                                    completed: isComplete,
                                  } as any).eq("id", enrollment.id);

                                  // If challenge complete, credit to wallet
                                  if (isComplete) {
                                    const { data: wallet } = await supabase.from("influencer_wallets" as any).select("*").eq("user_id", sub.user_id).eq("status", "active").maybeSingle();
                                    if (wallet) {
                                      await supabase.from("influencer_wallets" as any).update({
                                        balance: ((wallet as any).balance || 0) + newApproved,
                                      } as any).eq("id", (wallet as any).id);
                                    }
                                  }
                                }

                                toast({ title: "Submission approved" });
                                await fetchData();
                              }} className="flex-1 text-[10px]"><Check className="w-3 h-3 mr-1" /> Approve</GlassButton>
                              <GlassButton variant="outline" onClick={async () => {
                                await supabase.from("influencer_challenge_submissions" as any).update({
                                  status: "rejected", reviewed_at: new Date().toISOString()
                                } as any).eq("id", sub.id);
                                toast({ title: "Submission rejected" });
                                await fetchData();
                              }} className="flex-1 text-[10px]">Reject</GlassButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              );
            })}
            {infChallenges.length === 0 && (
              <GlassCard animate={false}>
                <p className="text-center py-8 text-muted-foreground text-[13px]">No challenges created yet</p>
              </GlassCard>
            )}
          </div>
        )}


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
      </div>
    </div>
  );
};

export default Admin;
