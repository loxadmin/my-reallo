import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Ghost, Activity, LogOut, RefreshCw, Shield, Settings, Save,
  BarChart3, Plus, Trash2, Link, Upload, CheckCircle2, FileSpreadsheet,
  Smartphone, Check, ExternalLink, CreditCard as Edit2, Download, Star,
  Wallet, ArrowDownToLine, Ban, AlertTriangle, Eye, X, Bell, LayoutDashboard,
  ChevronDown, ChevronRight, Menu
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notifications";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

// ── Types ──
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

type AdminTab = "overview" | "users" | "ghosts" | "activity" | "goals" | "decisions" | "analytics" | "verification" | "settings" | "inf_apps" | "inf_wallets" | "inf_referrals" | "inf_withdrawals" | "inf_challenges" | "warnings";

// ── Nav config ──
const navGroups = [
  {
    label: "Dashboard",
    items: [
      { id: "overview" as AdminTab, label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    label: "User Management",
    items: [
      { id: "users" as AdminTab, label: "Users", icon: Users },
      { id: "warnings" as AdminTab, label: "Warnings", icon: AlertTriangle },
      { id: "ghosts" as AdminTab, label: "Ghost Users", icon: Ghost },
      { id: "activity" as AdminTab, label: "Activity Log", icon: Activity },
    ],
  },
  {
    label: "Product",
    items: [
      { id: "goals" as AdminTab, label: "Goal Categories", icon: Settings },
      { id: "decisions" as AdminTab, label: "Decision Apps", icon: Smartphone },
      { id: "analytics" as AdminTab, label: "Analytics", icon: BarChart3 },
      { id: "verification" as AdminTab, label: "Verification", icon: CheckCircle2 },
    ],
  },
  {
    label: "Influencer",
    items: [
      { id: "inf_apps" as AdminTab, label: "Applications", icon: Star },
      { id: "inf_wallets" as AdminTab, label: "Wallets", icon: Wallet },
      { id: "inf_referrals" as AdminTab, label: "Referrals", icon: Users },
      { id: "inf_withdrawals" as AdminTab, label: "Withdrawals", icon: ArrowDownToLine },
      { id: "inf_challenges" as AdminTab, label: "Challenges", icon: Upload },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings" as AdminTab, label: "App Settings", icon: Link },
    ],
  },
];

// ── Metric Card ──
const MetricCard = ({ label, value, icon: Icon, variant = "default" }: { label: string; value: string | number; icon: any; variant?: "default" | "primary" | "destructive" }) => (
  <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
    <div className={`rounded-lg p-2 ${variant === "primary" ? "bg-primary/10" : variant === "destructive" ? "bg-destructive/10" : "bg-muted"}`}>
      <Icon className={`w-4 h-4 ${variant === "primary" ? "text-primary" : variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`} />
    </div>
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
    </div>
  </div>
);

// ── Section header ──
const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    {action}
  </div>
);

// ── Pill badge ──
const StatusBadge = ({ status, className }: { status: string; className?: string }) => {
  const colors: Record<string, string> = {
    active: "bg-primary/10 text-primary",
    approved: "bg-primary/10 text-primary",
    pending: "bg-muted text-muted-foreground",
    pending_review: "bg-muted text-muted-foreground",
    pending_activation: "bg-muted text-muted-foreground",
    pending_appeal: "bg-accent/10 text-accent",
    rejected: "bg-destructive/10 text-destructive",
    appeal_rejected: "bg-destructive/10 text-destructive",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] || "bg-muted text-muted-foreground"} ${className || ""}`}>{status.replace(/_/g, " ")}</span>;
};

// ── Small button ──
const Btn = ({ children, variant = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "outline" | "destructive" }) => {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    default: "bg-muted text-foreground hover:bg-muted/80",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-border text-foreground hover:bg-muted",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  };
  return <button className={`${base} ${variants[variant]}`} {...props}>{children}</button>;
};

// ── Sidebar nav component ──
function AdminSidebar({ activeTab, setActiveTab, counts }: { activeTab: AdminTab; setActiveTab: (t: AdminTab) => void; counts: Record<string, number> }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="px-3 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary shrink-0" />
          {!collapsed && <span className="text-sm font-bold text-foreground">Reallo Admin</span>}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                      tooltip={item.label}
                      className={activeTab === item.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[12px]">{item.label}</span>
                          {counts[item.id] !== undefined && counts[item.id] > 0 && (
                            <span className="text-[9px] bg-muted rounded-full px-1.5 py-0.5 font-medium">{counts[item.id]}</span>
                          )}
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

// ── Main Admin ──
const Admin = () => {
  const { isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [ghostCount, setGhostCount] = useState(0);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [goalCategories, setGoalCategories] = useState<GoalCategoryRow[]>([]);
  const [editedGoals, setEditedGoals] = useState<Record<string, Partial<GoalCategoryRow>>>({});
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});
  const [verificationTxs, setVerificationTxs] = useState<VerificationTx[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [decisionApps, setDecisionApps] = useState<DecisionAppRow[]>([]);
  const [decisionResponses, setDecisionResponses] = useState<DecisionResponseRow[]>([]);
  const [userWarnings, setUserWarnings] = useState<UserWarning[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [warningText, setWarningText] = useState("");
  const [banReason, setBanReason] = useState("");
  const [editingProfile, setEditingProfile] = useState<{ email: string; points_balance: number; queue_position: number } | null>(null);
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

    const [icRes, icsRes, iceRes] = await Promise.all([
      supabase.from("influencer_challenges" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("influencer_challenge_submissions" as any).select("*").order("submitted_at", { ascending: false }),
      supabase.from("influencer_challenge_enrollments" as any).select("*"),
    ]);
    setInfChallenges((icRes.data || []) as any[]);
    setInfChallengeSubmissions((icsRes.data || []) as any[]);
    setInfChallengeEnrollments((iceRes.data || []) as any[]);

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

  // ── All handlers (unchanged logic) ──
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
      goal_type: newGoal.goal_type, subcategory: newGoal.subcategory || null,
      label: newGoal.label, max_price: newGoal.max_price,
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
      app_name: newApp.app_name, app_logo_url: newApp.app_logo_url || null,
      category: newApp.category, points_select: newApp.points_select,
      points_switch_intent: newApp.points_switch_intent, points_switch_complete: newApp.points_switch_complete,
      switch_link: newApp.switch_link || null, referral_message: newApp.referral_message || null,
      referral_link: newApp.referral_link || null, referral_points: newApp.referral_points,
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
      const { error: respError } = await fromDResponses().update({ referral_approved: true, points_awarded: app.referral_points }).eq("id", responseId);
      if (respError) { toast({ title: "Error updating response", description: respError.message }); return; }
      const { data: profile, error: profileError } = await supabase.from("profiles").select("points_balance").eq("id", userId).single();
      if (profileError || !profile) { toast({ title: "Error fetching profile", description: profileError?.message || "Profile not found" }); return; }
      const newBalance = (profile.points_balance || 0) + app.referral_points;
      const { error: updateError } = await supabase.from("profiles").update({ points_balance: newBalance }).eq("id", userId);
      if (updateError) { toast({ title: "Error updating points", description: updateError.message }); return; }
      toast({ title: "Referral approved", description: `${app.referral_points} points awarded to user` });
      await fetchData();
    } catch (error) { toast({ title: "Approval failed", description: (error as Error).message }); }
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
      const verifiedInThisRun = new Set<string>();

      for (const row of rows) {
        const { data: alreadyVerified } = await supabase.from("verification_transactions")
          .select("id, user_id").eq("transaction_id", row.transaction_id).eq("is_verified", true).limit(1);
        const isGlobalDuplicate = (alreadyVerified && alreadyVerified.length > 0) || verifiedInThisRun.has(row.transaction_id);
        const { data: matches } = await supabase.from("verification_transactions")
          .select("id, user_id, verification_id").eq("transaction_id", row.transaction_id).eq("is_verified", false).eq("is_duplicate", false);

        if (matches && matches.length > 0) {
          if (isGlobalDuplicate) {
            for (const match of matches) {
              await supabase.from("verification_transactions").update({
                is_duplicate: true,
                duplicate_note: `Duplicate of already-verified transaction. Original verified for user ${alreadyVerified?.[0]?.user_id?.slice(0, 8) || 'unknown'}.`
              } as any).eq("id", match.id);
              await sendNotification({ userId: match.user_id, type: "warning", title: "Duplicate Transaction ID Detected", message: `Your transaction ID "${row.transaction_id}" was flagged as a duplicate and could not be verified. This transaction ID has already been used.` });
              duplicateCount++;
            }
          } else {
            const firstMatch = matches[0];
            await supabase.from("verification_transactions").update({ is_verified: true, verified_amount: row.amount }).eq("id", firstMatch.id);
            verifiedInThisRun.add(row.transaction_id);
            matchCount++;
            for (let i = 1; i < matches.length; i++) {
              await supabase.from("verification_transactions").update({
                is_duplicate: true,
                duplicate_note: `Duplicate submission. Already verified for user ${firstMatch.user_id.slice(0, 8)}.`
              } as any).eq("id", matches[i].id);
              await sendNotification({ userId: matches[i].user_id, type: "warning", title: "Duplicate Transaction ID Detected", message: `Your transaction ID "${row.transaction_id}" was flagged as a duplicate and could not be verified.` });
              duplicateCount++;
            }
            const { data: allTxs } = await supabase.from("verification_transactions").select("is_verified, verified_amount").eq("verification_id", firstMatch.verification_id);
            const { data: verif } = await supabase.from("spend_verifications").select("frequency").eq("id", firstMatch.verification_id).single();
            if (allTxs && verif) {
              const verifiedTxs = allTxs.filter(t => t.is_verified);
              const totalAmount = verifiedTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0);
              const freq = (verif as any).frequency;
              const updateProfileSpend = async (userId: string, annualSpend: number, markVerified = false) => {
                const { data: userProfile } = await supabase.from("profiles").select("selected_goal").eq("id", userId).single();
                let newTarget: number | undefined;
                if (userProfile?.selected_goal) {
                  const goalType = (userProfile.selected_goal as string).split(":")[0];
                  const goalSub = (userProfile.selected_goal as string).includes(":") ? (userProfile.selected_goal as string).split(":")[1] : null;
                  let query = supabase.from("goal_categories").select("max_price").eq("goal_type", goalType);
                  if (goalSub) query = query.eq("subcategory", goalSub);
                  else query = query.is("subcategory", null);
                  const { data: goalCat } = await query.limit(1).maybeSingle();
                  if (goalCat) { newTarget = Math.min(annualSpend, (goalCat as any).max_price); }
                }
                const updateData: Record<string, any> = { total_annual_spend: annualSpend };
                if (markVerified) updateData.spend_verified = true;
                if (newTarget !== undefined) updateData.target_amount = newTarget;
                await supabase.from("profiles").update(updateData).eq("id", userId);
              };
              const multiplier = freq === "daily" ? 12 : freq === "weekly" ? 13 : 12;
              const annualSpend = freq === "monthly"
                ? Math.round(Number(verifiedTxs[0]?.verified_amount || 0) * 12)
                : Math.round(totalAmount * multiplier);
              await supabase.from("spend_verifications").update({
                recalculated_amount: annualSpend,
                ...(freq === "monthly" ? { status: "verified" } : {})
              }).eq("id", firstMatch.verification_id);
              await updateProfileSpend(firstMatch.user_id, annualSpend, freq === "monthly");
              if (freq !== "monthly") {
                const { data: vData } = await supabase.from("spend_verifications").select("ends_at").eq("id", firstMatch.verification_id).single();
                if (vData && new Date() >= new Date((vData as any).ends_at)) {
                  await supabase.from("spend_verifications").update({ status: "verified" }).eq("id", firstMatch.verification_id);
                  await updateProfileSpend(firstMatch.user_id, annualSpend, true);
                }
              }
            }
          }
        }
      }
      toast({ title: `CSV processed`, description: `${matchCount} verified, ${duplicateCount} duplicates flagged from ${rows.length} rows.` });
      await fetchData();
    } catch { toast({ title: "CSV error", description: "Failed to process CSV file." }); }
    setCsvUploading(false);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const handleBanUser = async (userId: string, reason: string) => {
    await supabase.from("profiles").update({ is_banned: true, ban_reason: reason } as any).eq("id", userId);
    await sendNotification({ userId, type: "ban", title: "Account Banned", message: `Your account has been banned. Reason: ${reason}` });
    toast({ title: "User banned" });
    setBanReason(""); setSelectedUserId(null);
    await fetchData();
  };

  const handleUnbanUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_banned: false, ban_reason: null } as any).eq("id", userId);
    await sendNotification({ userId, type: "info", title: "Account Unbanned", message: "Your account ban has been lifted." });
    toast({ title: "User unbanned" });
    await fetchData();
  };

  const handleIssueWarning = async (userId: string, reason: string) => {
    const { user } = (await supabase.auth.getUser()).data;
    if (!user) return;
    await supabase.from("user_warnings" as any).insert({ user_id: userId, reason, issued_by: user.id } as any);
    await sendNotification({ userId, type: "warning", title: "Warning Issued", message: `You have received a warning: ${reason}` });
    toast({ title: "Warning issued" });
    setWarningText("");
    await fetchData();
  };

  const handleUpdateProfile = async (userId: string, updates: { email?: string; points_balance?: number; queue_position?: number }) => {
    await supabase.from("profiles").update(updates).eq("id", userId);
    toast({ title: "Profile updated" });
    setEditingProfile(null); setSelectedUserId(null);
    await fetchData();
  };

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
    const a = document.createElement("a"); a.href = url; a.download = "decision_analytics.csv"; a.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground text-[13px]">Loading...</p></div>;
  if (!isAdmin) return null;

  const referralApps = decisionApps.filter(a => a.category === "referral");

  const totalSpend = profiles.reduce((s, p) => s + (p.total_annual_spend || 0), 0);
  const totalPoints = profiles.reduce((s, p) => s + (p.points_balance || 0), 0);
  const pendingWithdrawals = infWithdrawals.filter((w: any) => w.status === "pending").length;
  const pendingApps = infApps.filter((a: any) => a.status === "pending_review" || a.status === "pending_appeal").length;

  const counts: Record<string, number> = {
    users: profiles.length,
    warnings: userWarnings.length,
    ghosts: ghostCount,
    activity: activities.length,
    goals: goalCategories.length,
    decisions: decisionApps.length,
    analytics: decisionResponses.length,
    verification: verificationTxs.length,
    inf_apps: pendingApps,
    inf_wallets: infWallets.filter((w: any) => w.status === "pending_activation").length,
    inf_referrals: infReferrals.length,
    inf_withdrawals: pendingWithdrawals,
    inf_challenges: infChallenges.length,
  };

  // Common input styles
  const inputCls = "w-full rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const cardCls = "rounded-xl border border-border bg-card p-5";

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-sm font-semibold text-foreground capitalize">{activeTab === "overview" ? "Dashboard Overview" : activeTab.replace(/_/g, " ")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="outline" onClick={fetchData} disabled={refreshing}>
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {!refreshing && "Refresh"}
              </Btn>
              <Btn variant="outline" onClick={() => navigate("/")}>Home</Btn>
              <Btn variant="outline" onClick={signOut}><LogOut className="w-3.5 h-3.5" /></Btn>
            </div>
          </header>

          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ═══ OVERVIEW ═══ */}
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Total Users" value={profiles.length} icon={Users} variant="primary" />
                  <MetricCard label="Annual Spend" value={formatNaira(totalSpend)} icon={Wallet} />
                  <MetricCard label="Total Points" value={totalPoints.toLocaleString()} icon={Star} />
                  <MetricCard label="Ghost Users" value={ghostCount} icon={Ghost} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pending actions */}
                  <div className={cardCls}>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Pending Actions</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                        <span className="text-[12px] text-muted-foreground">Influencer Applications</span>
                        <span className="text-[12px] font-semibold text-foreground">{pendingApps}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                        <span className="text-[12px] text-muted-foreground">Pending Withdrawals</span>
                        <span className="text-[12px] font-semibold text-foreground">{pendingWithdrawals}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                        <span className="text-[12px] text-muted-foreground">Wallet Activations</span>
                        <span className="text-[12px] font-semibold text-foreground">{infWallets.filter((w: any) => w.status === "pending_activation").length}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[12px] text-muted-foreground">Unverified Transactions</span>
                        <span className="text-[12px] font-semibold text-foreground">{verificationTxs.filter(t => !t.is_verified && !t.is_duplicate).length}</span>
                      </div>
                    </div>
                  </div>

                  {/* User breakdown */}
                  <div className={cardCls}>
                    <h3 className="text-sm font-semibold text-foreground mb-3">User Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                        <span className="text-[12px] text-muted-foreground">Active Users</span>
                        <span className="text-[12px] font-semibold text-primary">{profiles.filter(p => !p.is_banned).length}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                        <span className="text-[12px] text-muted-foreground">Banned Users</span>
                        <span className="text-[12px] font-semibold text-destructive">{profiles.filter(p => p.is_banned).length}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                        <span className="text-[12px] text-muted-foreground">Warnings Issued</span>
                        <span className="text-[12px] font-semibold text-foreground">{userWarnings.length}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[12px] text-muted-foreground">Duplicate Transactions</span>
                        <span className="text-[12px] font-semibold text-foreground">{verificationTxs.filter(t => t.is_duplicate).length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className={cardCls}>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <Btn variant="outline" onClick={() => setActiveTab("users")} className="w-full justify-start"><Users className="w-3.5 h-3.5" /> Manage Users</Btn>
                      <Btn variant="outline" onClick={() => setActiveTab("verification")} className="w-full justify-start"><CheckCircle2 className="w-3.5 h-3.5" /> Upload CSV</Btn>
                      <Btn variant="outline" onClick={() => setActiveTab("inf_apps")} className="w-full justify-start"><Star className="w-3.5 h-3.5" /> Review Applications</Btn>
                      <Btn variant="outline" onClick={() => setActiveTab("analytics")} className="w-full justify-start"><BarChart3 className="w-3.5 h-3.5" /> View Analytics</Btn>
                    </div>
                  </div>
                </div>

                {/* Recent activity */}
                <div className={cardCls}>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
                  <div className="space-y-1">
                    {activities.slice(0, 8).map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground font-mono">{a.user_id.slice(0, 8)}...</span>
                          <span className="text-[12px] text-foreground capitalize">{a.action_type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-primary">+{a.positions_moved}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {activities.length === 0 && <p className="text-center py-4 text-muted-foreground text-[12px]">No activity yet</p>}
                  </div>
                </div>
              </>
            )}

            {/* ═══ USERS ═══ */}
            {activeTab === "users" && (
              <div className={cardCls}>
                <SectionHeader title={`Registered Users (${profiles.length})`} />
                <div className="space-y-2 max-h-[700px] overflow-y-auto">
                  {profiles.map((p) => {
                    const isSelected = selectedUserId === p.id;
                    const pWarnings = userWarnings.filter(w => w.user_id === p.id);
                    const pDuplicates = verificationTxs.filter(t => t.user_id === p.id && t.is_duplicate);
                    return (
                      <div key={p.id} className={`rounded-lg border p-3 ${p.is_banned ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-background'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-semibold text-foreground">{p.email}</p>
                              {p.is_banned && <StatusBadge status="BANNED" className="bg-destructive/10 text-destructive" />}
                              {pDuplicates.length > 0 && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{pDuplicates.length} dup</span>}
                              {pWarnings.length > 0 && <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">{pWarnings.length} warn</span>}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Spend: {formatNaira(p.total_annual_spend || 0)} · Queue: #{p.queue_position} · Points: {p.points_balance} · Refs: {referralCounts[p.id] || 0}
                            </p>
                          </div>
                          <button onClick={() => { setSelectedUserId(isSelected ? null : p.id); setEditingProfile(null); }} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted">
                            {isSelected ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {isSelected && (
                          <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
                            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                              <span>ID: {p.id.slice(0, 12)}...</span>
                              <span>Joined: {new Date(p.created_at).toLocaleDateString()}</span>
                              <span>Goal: {p.selected_goal || 'None'}</span>
                            </div>

                            {pDuplicates.length > 0 && (
                              <div className="rounded-lg bg-accent/5 border border-accent/20 p-2">
                                <p className="text-[10px] text-accent font-semibold mb-1">Duplicate Transactions:</p>
                                {pDuplicates.map(d => (
                                  <p key={d.id} className="text-[10px] text-muted-foreground font-mono">{d.transaction_id} — {d.duplicate_note}</p>
                                ))}
                              </div>
                            )}

                            {editingProfile ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[9px] text-muted-foreground mb-1">Points</p>
                                    <input type="number" value={editingProfile.points_balance} onChange={e => setEditingProfile(prev => prev ? { ...prev, points_balance: parseInt(e.target.value) || 0 } : null)} className={inputCls} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-muted-foreground mb-1">Queue #</p>
                                    <input type="number" value={editingProfile.queue_position} onChange={e => setEditingProfile(prev => prev ? { ...prev, queue_position: parseInt(e.target.value) || 0 } : null)} className={inputCls} />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Btn variant="primary" onClick={() => handleUpdateProfile(p.id, { points_balance: editingProfile.points_balance, queue_position: editingProfile.queue_position })}><Check className="w-3 h-3" /> Save</Btn>
                                  <Btn variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Btn>
                                </div>
                              </div>
                            ) : (
                              <Btn variant="outline" onClick={() => setEditingProfile({ email: p.email, points_balance: p.points_balance, queue_position: p.queue_position })} className="w-full"><Edit2 className="w-3 h-3" /> Edit Profile</Btn>
                            )}

                            <div className="flex gap-2">
                              <input value={selectedUserId === p.id ? warningText : ""} onChange={e => setWarningText(e.target.value)} placeholder="Warning reason..." className={`flex-1 ${inputCls}`} />
                              <Btn variant="outline" onClick={() => { if (warningText.trim()) handleIssueWarning(p.id, warningText); }} disabled={!warningText.trim()}><AlertTriangle className="w-3 h-3" /> Warn</Btn>
                            </div>

                            {p.is_banned ? (
                              <Btn variant="primary" onClick={() => handleUnbanUser(p.id)} className="w-full"><Check className="w-3 h-3" /> Unban User</Btn>
                            ) : (
                              <div className="flex gap-2">
                                <input value={selectedUserId === p.id ? banReason : ""} onChange={e => setBanReason(e.target.value)} placeholder="Ban reason..." className={`flex-1 ${inputCls}`} />
                                <Btn variant="destructive" onClick={() => { if (banReason.trim()) handleBanUser(p.id, banReason); }} disabled={!banReason.trim()}><Ban className="w-3 h-3" /> Ban</Btn>
                              </div>
                            )}

                            {pWarnings.length > 0 && (
                              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-2">
                                <p className="text-[10px] font-semibold text-destructive mb-1">Warning History:</p>
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
              </div>
            )}

            {/* ═══ GHOSTS ═══ */}
            {activeTab === "ghosts" && (
              <div className={cardCls}>
                <SectionHeader title="Ghost Users" />
                <div className="text-center py-12">
                  <Ghost className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-4xl font-bold text-foreground">{ghostCount}</p>
                  <p className="text-[12px] text-muted-foreground mt-2">Ghost users seeded in the waitlist queue</p>
                </div>
              </div>
            )}

            {/* ═══ ACTIVITY ═══ */}
            {activeTab === "activity" && (
              <div className={cardCls}>
                <SectionHeader title="Recent Activity" />
                <div className="space-y-1">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-[11px] text-muted-foreground font-mono">{a.user_id.slice(0, 8)}...</p>
                        <p className="text-[12px] capitalize text-foreground">{a.action_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-semibold text-primary">+{a.positions_moved} skip</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && <p className="text-center py-8 text-muted-foreground text-[12px]">No activity yet</p>}
                </div>
              </div>
            )}

            {/* ═══ GOALS ═══ */}
            {activeTab === "goals" && (
              <div className="space-y-4">
                <div className={cardCls}>
                  <SectionHeader title="Goal Categories" action={
                    Object.keys(editedGoals).length > 0 ? (
                      <Btn variant="primary" onClick={handleSaveGoals} disabled={saving}><Save className="w-3 h-3" /> {saving ? "Saving..." : "Save All"}</Btn>
                    ) : undefined
                  } />
                  <div className="space-y-3">
                    {goalCategories.map((cat) => {
                      const edited = editedGoals[cat.id] || {};
                      return (
                        <div key={cat.id} className="rounded-lg border border-border p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <Edit2 className="w-3 h-3 text-muted-foreground" />
                            <button onClick={() => handleDeleteGoal(cat.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Type</p>
                              <input value={edited.goal_type ?? cat.goal_type} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], goal_type: e.target.value } }))} className={inputCls} />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Subcategory</p>
                              <input value={edited.subcategory ?? (cat.subcategory || "")} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], subcategory: e.target.value || null } }))} className={inputCls} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Label</p>
                              <input value={edited.label ?? cat.label} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], label: e.target.value } }))} className={inputCls} />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Max Price ₦</p>
                              <input type="number" value={edited.max_price ?? cat.max_price} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], max_price: parseInt(e.target.value) || 0 } }))} className={inputCls} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={cardCls}>
                  <SectionHeader title="Add Goal Category" />
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <input value={newGoal.goal_type} onChange={e => setNewGoal(p => ({ ...p, goal_type: e.target.value }))} placeholder="Type (e.g. education)" className={inputCls} />
                    <input value={newGoal.subcategory} onChange={e => setNewGoal(p => ({ ...p, subcategory: e.target.value }))} placeholder="Subcategory (optional)" className={inputCls} />
                    <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder="Label" className={inputCls} />
                    <input type="number" value={newGoal.max_price} onChange={e => setNewGoal(p => ({ ...p, max_price: parseInt(e.target.value) || 0 }))} placeholder="Max price" className={inputCls} />
                  </div>
                  <Btn variant="primary" onClick={handleCreateGoal} className="w-full"><Plus className="w-3 h-3" /> Add Goal</Btn>
                </div>
              </div>
            )}

            {/* ═══ DECISIONS ═══ */}
            {activeTab === "decisions" && (
              <div className="space-y-4">
                <div className={cardCls}>
                  <SectionHeader title="Add App to Checklist" />
                  <div className="space-y-3">
                    <input value={newApp.app_name} onChange={e => setNewApp(p => ({ ...p, app_name: e.target.value }))} placeholder="App name (e.g. OPay, Temu)" className={inputCls} />
                    <input value={newApp.app_logo_url} onChange={e => setNewApp(p => ({ ...p, app_logo_url: e.target.value }))} placeholder="Logo URL (optional)" className={inputCls} />
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Category</p>
                      <select value={newApp.category} onChange={e => setNewApp(p => ({ ...p, category: e.target.value }))} className={`${inputCls} bg-card`}>
                        <option value="yes_no">Yes/No (Switch Offer)</option>
                        <option value="referral">Referral (Try It Out)</option>
                        <option value="robust">Robust (Advanced Switch)</option>
                      </select>
                    </div>
                    {(newApp.category === "yes_no" || newApp.category === "robust") && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div><p className="text-[10px] text-muted-foreground mb-1">Select pts</p><input type="number" value={newApp.points_select} onChange={e => setNewApp(p => ({ ...p, points_select: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                          <div><p className="text-[10px] text-muted-foreground mb-1">Switch intent pts</p><input type="number" value={newApp.points_switch_intent} onChange={e => setNewApp(p => ({ ...p, points_switch_intent: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                          <div><p className="text-[10px] text-muted-foreground mb-1">Switch complete pts</p><input type="number" value={newApp.points_switch_complete} onChange={e => setNewApp(p => ({ ...p, points_switch_complete: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                        </div>
                        {newApp.category === "yes_no" && <input value={newApp.switch_link} onChange={e => setNewApp(p => ({ ...p, switch_link: e.target.value }))} placeholder="Switch link URL" className={inputCls} />}
                      </>
                    )}
                    {newApp.category === "robust" && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Link to Referral Apps (switch options):</p>
                        {referralApps.length === 0 && <p className="text-[10px] text-muted-foreground">Create referral apps first.</p>}
                        <div className="space-y-1 max-h-[150px] overflow-y-auto">
                          {referralApps.map(ra => (
                            <label key={ra.id} className="flex items-center gap-2 rounded-lg border border-border p-2 cursor-pointer hover:bg-muted/50">
                              <input type="checkbox" checked={newApp.switch_to_referral_app_ids.includes(ra.id)} onChange={e => {
                                if (e.target.checked) setNewApp(p => ({ ...p, switch_to_referral_app_ids: [...p.switch_to_referral_app_ids, ra.id] }));
                                else setNewApp(p => ({ ...p, switch_to_referral_app_ids: p.switch_to_referral_app_ids.filter(id => id !== ra.id) }));
                              }} className="accent-primary" />
                              <span className="text-[12px] text-foreground">{ra.app_name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {newApp.category === "referral" && (
                      <>
                        <textarea value={newApp.referral_message} onChange={e => setNewApp(p => ({ ...p, referral_message: e.target.value }))} placeholder="Referral message" className={`${inputCls} min-h-[60px] resize-none`} />
                        <input value={newApp.referral_link} onChange={e => setNewApp(p => ({ ...p, referral_link: e.target.value }))} placeholder="Referral/download link" className={inputCls} />
                        <div><p className="text-[10px] text-muted-foreground mb-1">Referral points</p><input type="number" value={newApp.referral_points} onChange={e => setNewApp(p => ({ ...p, referral_points: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                      </>
                    )}
                    <Btn variant="primary" onClick={handleCreateDecisionApp} className="w-full"><Plus className="w-3 h-3" /> Add App</Btn>
                  </div>
                </div>

                {decisionApps.map(app => {
                  const appResponses = decisionResponses.filter(r => r.app_id === app.id);
                  const pendingApprovals = appResponses.filter(r => r.referral_screenshot_url && !r.referral_approved);
                  return (
                    <div key={app.id} className={cardCls}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {app.app_logo_url ? (
                            <img src={app.app_logo_url} alt={app.app_name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">{app.app_name.charAt(0)}</div>
                          )}
                          <div>
                            <h4 className="font-semibold text-foreground text-[13px]">{app.app_name}</h4>
                            <p className="text-[11px] text-muted-foreground capitalize">{app.category === "yes_no" ? "Yes/No" : app.category === "referral" ? "Referral" : "Robust"} · {app.is_active ? "Active" : "Inactive"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Btn variant="outline" onClick={() => handleToggleDecisionApp(app.id, app.is_active)}>{app.is_active ? "Deactivate" : "Activate"}</Btn>
                          <button onClick={() => handleDeleteDecisionApp(app.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Responses: {appResponses.length} ·
                        {app.category === "yes_no" || app.category === "robust"
                          ? ` Select: ${app.points_select}pts | Intent: ${app.points_switch_intent}pts | Complete: ${app.points_switch_complete}pts`
                          : ` Referral: ${app.referral_points}pts`}
                      </p>
                      {app.category === "robust" && (app.switch_to_referral_app_ids || []).length > 0 && (
                        <p className="text-[10px] text-primary mt-1">Linked: {(app.switch_to_referral_app_ids || []).map(id => decisionApps.find(a => a.id === id)?.app_name).filter(Boolean).join(", ")}</p>
                      )}
                      {pendingApprovals.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] text-primary font-semibold">Pending Approvals ({pendingApprovals.length})</p>
                          {pendingApprovals.map(pr => {
                            const userEmail = profiles.find(p => p.id === pr.user_id)?.email || pr.user_id.slice(0, 8);
                            const screenshotUrl = getPublicScreenshotUrl(pr.referral_screenshot_url);
                            return (
                              <div key={pr.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-muted-foreground">{userEmail}</span>
                                  {screenshotUrl && pr.referral_screenshot_url !== "pending_review" && (
                                    <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline mt-0.5"><ExternalLink className="w-2.5 h-2.5" /> View Screenshot</a>
                                  )}
                                </div>
                                <Btn variant="primary" onClick={() => handleApproveReferral(pr.id, pr.app_id, pr.user_id)}><Check className="w-3 h-3" /> Approve</Btn>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══ ANALYTICS ═══ */}
            {activeTab === "analytics" && (
              <div className={cardCls}>
                <SectionHeader title="Decision Analytics" action={<Btn variant="outline" onClick={downloadDecisionAnalytics}><Download className="w-3 h-3" /> Download CSV</Btn>} />
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MetricCard label="Total Responses" value={decisionResponses.length} icon={BarChart3} variant="primary" />
                  <MetricCard label="Has App" value={decisionResponses.filter(r => r.has_app).length} icon={CheckCircle2} />
                  <MetricCard label="Referrals Approved" value={decisionResponses.filter(r => r.referral_approved).length} icon={Check} />
                </div>
                {decisionApps.map(app => {
                  const appResps = decisionResponses.filter(r => r.app_id === app.id);
                  const hasApp = appResps.filter(r => r.has_app).length;
                  const wouldSwitch = appResps.filter(r => r.would_switch === true).length;
                  const switched = appResps.filter(r => r.switch_completed).length;
                  const pct = appResps.length > 0 ? Math.round((hasApp / appResps.length) * 100) : 0;
                  return (
                    <div key={app.id} className="rounded-lg border border-border p-4 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-foreground text-[13px]">{app.app_name}</p>
                        <span className="text-[10px] text-muted-foreground capitalize">{app.category}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
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
              </div>
            )}

            {/* ═══ VERIFICATION ═══ */}
            {activeTab === "verification" && (
              <div className="space-y-4">
                <div className={cardCls}>
                  <SectionHeader title="Upload Transaction CSV" />
                  <p className="text-[11px] text-muted-foreground mb-3">CSV columns: <span className="font-mono">transaction_id, amount</span></p>
                  <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  <Btn variant="primary" onClick={() => csvInputRef.current?.click()} disabled={csvUploading} className="w-full">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> {csvUploading ? "Processing..." : "Upload CSV"}
                  </Btn>
                </div>
                <div className={cardCls}>
                  <SectionHeader title="User Transactions" />
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <MetricCard label="Verified" value={verificationTxs.filter(t => t.is_verified).length} icon={CheckCircle2} variant="primary" />
                    <MetricCard label="Pending" value={verificationTxs.filter(t => !t.is_verified && !t.is_duplicate).length} icon={Activity} />
                    <MetricCard label="Duplicates" value={verificationTxs.filter(t => t.is_duplicate).length} icon={AlertTriangle} variant="destructive" />
                  </div>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {verificationTxs.map(tx => {
                      const userEmail = profiles.find(p => p.id === tx.user_id)?.email || tx.user_id.slice(0, 8);
                      return (
                        <div key={tx.id} className={`flex items-center justify-between rounded-lg border p-3 ${tx.is_duplicate ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
                          <div>
                            <p className="text-[11px] text-muted-foreground">{userEmail}</p>
                            <p className="text-[12px] font-mono text-foreground">{tx.transaction_id}</p>
                            {tx.is_duplicate && <p className="text-[9px] text-destructive">{tx.duplicate_note || 'Duplicate'}</p>}
                          </div>
                          <div className="text-right">
                            {tx.is_duplicate ? (
                              <div className="flex items-center gap-1 text-destructive"><AlertTriangle className="w-3.5 h-3.5" /><span className="text-[10px]">Duplicate</span></div>
                            ) : tx.is_verified ? (
                              <div className="flex items-center gap-1 text-primary"><CheckCircle2 className="w-3.5 h-3.5" /><span className="text-[11px]">₦{tx.verified_amount?.toLocaleString("en-NG")}</span></div>
                            ) : <span className="text-[11px] text-muted-foreground">Pending</span>}
                          </div>
                        </div>
                      );
                    })}
                    {verificationTxs.length === 0 && <p className="text-center py-8 text-muted-foreground text-[12px]">No transactions submitted yet</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ WARNINGS ═══ */}
            {activeTab === "warnings" && (
              <div className={cardCls}>
                <SectionHeader title="User Warnings & Bans" />
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MetricCard label="Total Warnings" value={userWarnings.length} icon={AlertTriangle} variant="primary" />
                  <MetricCard label="Banned Users" value={profiles.filter(p => p.is_banned).length} icon={Ban} variant="destructive" />
                  <MetricCard label="Dup TX IDs" value={verificationTxs.filter(t => t.is_duplicate).length} icon={Activity} />
                </div>

                {/* Duplicate TX Users Section */}
                {(() => {
                  const dupTxs = verificationTxs.filter(t => t.is_duplicate);
                  const dupUserIds = [...new Set(dupTxs.map(t => t.user_id))];
                  if (dupUserIds.length === 0) return null;
                  return (
                    <div className="mb-4">
                      <p className="text-[12px] font-semibold text-foreground mb-2">🚩 Users with Duplicate Transaction IDs</p>
                      <div className="space-y-2">
                        {dupUserIds.map(uid => {
                          const prof = profiles.find(p => p.id === uid);
                          const userDups = dupTxs.filter(t => t.user_id === uid);
                          return (
                            <div key={uid} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div>
                                  <p className="text-[12px] font-semibold text-foreground">{prof?.email || uid.slice(0, 8)}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Queue: #{prof?.queue_position} • Points: {prof?.points_balance} • Spend: ₦{(prof?.total_annual_spend || 0).toLocaleString("en-NG")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {prof?.is_banned && <StatusBadge status="BANNED" className="bg-destructive/10 text-destructive" />}
                                  <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{userDups.length} dup{userDups.length > 1 ? "s" : ""}</span>
                                </div>
                              </div>
                              <div className="mt-2 space-y-1">
                                {userDups.map(dt => (
                                  <div key={dt.id} className="flex items-center justify-between text-[10px] bg-background/50 rounded px-2 py-1">
                                    <span className="text-foreground font-mono">{dt.transaction_id}</span>
                                    <span className="text-muted-foreground">{dt.duplicate_note || "Duplicate"}</span>
                                  </div>
                                ))}
                              </div>
                              {prof && !prof.is_banned && (
                                <Btn variant="destructive" className="mt-2" onClick={async () => {
                                  await supabase.from("profiles").update({ is_banned: true, ban_reason: "Duplicate transaction IDs in spend verification" }).eq("id", uid);
                                  await sendNotification({ userId: uid, type: "warning", title: "Account Banned", message: "Your account has been banned due to duplicate transaction IDs." });
                                  toast({ title: "User banned" });
                                  await fetchData();
                                }}><Ban className="w-3 h-3" /> Ban User</Btn>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[12px] font-semibold text-foreground mb-2">Warning History</p>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {userWarnings.map(w => {
                    const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id.slice(0, 8);
                    return (
                      <div key={w.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{w.reason}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                      </div>
                    );
                  })}
                  {userWarnings.length === 0 && <p className="text-center py-8 text-muted-foreground text-[12px]">No warnings issued yet</p>}
                </div>
              </div>
            )}

            {/* ═══ INFLUENCER APPS ═══ */}
            {activeTab === "inf_apps" && (
              <div className={cardCls}>
                <SectionHeader title="Influencer Applications" />
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MetricCard label="Pending" value={infApps.filter(a => a.status === "pending_review").length} icon={Activity} variant="primary" />
                  <MetricCard label="Approved" value={infApps.filter(a => a.status === "approved").length} icon={CheckCircle2} />
                  <MetricCard label="Rejected" value={infApps.filter(a => a.status === "rejected").length} icon={X} variant="destructive" />
                </div>
                <div className="space-y-2">
                  {infApps.map((app: any) => {
                    const userEmail = profiles.find(p => p.id === app.user_id)?.email || app.user_id?.slice(0, 8);
                    return (
                      <div key={app.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                            <a href={app.social_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-2.5 h-2.5" /> {app.social_link}</a>
                          </div>
                          <StatusBadge status={app.status} />
                        </div>
                        {(app.status === "pending_review" || app.status === "pending_appeal") && (
                          <div className="flex gap-2 mt-2">
                            {app.status === "pending_appeal" && <p className="text-[10px] text-primary w-full mb-1">⚡ This is an appeal</p>}
                            <Btn variant="primary" onClick={async () => {
                              await supabase.from("influencer_applications" as any).update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", app.id);
                              await supabase.from("profiles").update({ queue_position: 0, off_queue_at: new Date().toISOString() }).eq("id", app.user_id);
                              await sendNotification({ userId: app.user_id, type: "influencer_approved", title: "Influencer Application Approved!", message: "Congratulations! Your influencer application has been approved." });
                              toast({ title: "Application approved" });
                              await fetchData();
                            }} className="flex-1"><Check className="w-3 h-3" /> Approve</Btn>
                            <Btn variant="outline" onClick={async () => {
                              const newStatus = app.status === "pending_appeal" ? "appeal_rejected" : "rejected";
                              await supabase.from("influencer_applications" as any).update({ status: newStatus, reviewed_at: new Date().toISOString() }).eq("id", app.id);
                              await sendNotification({ userId: app.user_id, type: "influencer_rejected", title: "Influencer Application Update", message: app.status === "pending_appeal" ? "Your appeal has been reviewed and was not approved." : "Your influencer application was not approved." });
                              toast({ title: app.status === "pending_appeal" ? "Appeal rejected" : "Application rejected" });
                              await fetchData();
                            }} className="flex-1">Reject</Btn>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {infApps.length === 0 && <p className="text-center py-8 text-muted-foreground text-[12px]">No applications yet</p>}
                </div>
              </div>
            )}

            {/* ═══ INF WALLETS ═══ */}
            {activeTab === "inf_wallets" && (
              <div className={cardCls}>
                <SectionHeader title="Influencer Wallet Activations" />
                <div className="space-y-2">
                  {infWallets.map((w: any) => {
                    const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id?.slice(0, 8);
                    const bank = infBankAccounts.find((b: any) => b.user_id === w.user_id);
                    return (
                      <div key={w.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                          <StatusBadge status={w.status} />
                        </div>
                        {bank && (
                          <div className="text-[11px] text-muted-foreground mb-2">
                            <p>Bank: {bank.bank_name} · Acct: {bank.account_number}</p>
                            <p>Name: {bank.account_name}</p>
                            {bank.id_document_url && (
                              <button onClick={async () => {
                                const { data, error } = await supabase.storage.from("id-documents").createSignedUrl(bank.id_document_url!, 3600);
                                if (error || !data?.signedUrl) { alert("Failed to load document"); return; }
                                window.open(data.signedUrl, "_blank");
                              }} className="text-primary hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-2.5 h-2.5" /> View ID Document</button>
                            )}
                          </div>
                        )}
                        {w.status === "pending_activation" && (
                          <div className="flex gap-2">
                            <Btn variant="primary" onClick={async () => {
                              await supabase.from("influencer_wallets" as any).update({ status: "active" }).eq("id", w.id);
                              if (bank) await supabase.from("influencer_bank_accounts" as any).update({ verification_status: "verified" }).eq("id", bank.id);
                              await sendNotification({ userId: w.user_id, type: "wallet_activated", title: "Wallet Activated!", message: "Your influencer wallet has been activated." });
                              toast({ title: "Wallet activated" }); await fetchData();
                            }} className="flex-1"><Check className="w-3 h-3" /> Approve Wallet</Btn>
                            <Btn variant="outline" onClick={async () => {
                              await supabase.from("influencer_wallets" as any).update({ status: "rejected" }).eq("id", w.id);
                              await sendNotification({ userId: w.user_id, type: "rejection", title: "Wallet Activation Rejected", message: "Your wallet activation request has been rejected." });
                              toast({ title: "Wallet rejected" }); await fetchData();
                            }} className="flex-1">Reject</Btn>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">Balance: {formatNaira(w.balance || 0)}</p>
                      </div>
                    );
                  })}
                  {infWallets.length === 0 && <p className="text-center py-8 text-muted-foreground text-[12px]">No wallet activations yet</p>}
                </div>
              </div>
            )}

            {/* ═══ INF REFERRALS ═══ */}
            {activeTab === "inf_referrals" && (
              <div className={cardCls}>
                <SectionHeader title="Influencer Referrals" />
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <MetricCard label="Total Referrals" value={infReferrals.length} icon={Users} variant="primary" />
                  <MetricCard label="Total Earnings" value={formatNaira(infReferrals.reduce((s: number, r: any) => s + (r.reward_amount || 0), 0))} icon={Wallet} />
                </div>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {infReferrals.map((r: any) => {
                    const infEmail = profiles.find(p => p.id === r.influencer_id)?.email || r.influencer_id?.slice(0, 8);
                    const refEmail = profiles.find(p => p.id === r.referred_user_id)?.email || r.referred_user_id?.slice(0, 8);
                    return (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="text-[11px] text-foreground">{infEmail} → {refEmail}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <p className="text-[11px] text-primary font-semibold">{formatNaira(r.reward_amount)}</p>
                      </div>
                    );
                  })}
                  {infReferrals.length === 0 && <p className="text-center py-8 text-muted-foreground text-[12px]">No influencer referrals yet</p>}
                </div>
              </div>
            )}

            {/* ═══ INF WITHDRAWALS ═══ */}
            {activeTab === "inf_withdrawals" && (
              <div className={cardCls}>
                <SectionHeader title="Influencer Withdrawals" />
                <div className="space-y-2">
                  {infWithdrawals.map((w: any) => {
                    const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id?.slice(0, 8);
                    const bank = infBankAccounts.find((b: any) => b.id === w.bank_account_id);
                    return (
                      <div key={w.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                          <StatusBadge status={w.status} />
                        </div>
                        <p className="text-[13px] font-bold text-primary">{formatNaira(w.amount)}</p>
                        {bank && <p className="text-[10px] text-muted-foreground">{bank.bank_name} · {bank.account_number} · {bank.account_name}</p>}
                        {w.status === "pending" && (
                          <div className="flex gap-2 mt-2">
                            <Btn variant="primary" onClick={async () => {
                              const wallet = infWallets.find((wl: any) => wl.user_id === w.user_id);
                              if (wallet) {
                                const newBal = Math.max(0, (wallet.balance || 0) - w.amount);
                                await supabase.from("influencer_wallets" as any).update({ balance: newBal }).eq("id", wallet.id);
                              }
                              await supabase.from("influencer_withdrawals" as any).update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", w.id);
                              await sendNotification({ userId: w.user_id, type: "withdrawal_approved", title: "Withdrawal Approved", message: `Your withdrawal of ₦${w.amount.toLocaleString("en-NG")} has been approved.` });
                              toast({ title: "Withdrawal approved" }); await fetchData();
                            }} className="flex-1"><Check className="w-3 h-3" /> Approve</Btn>
                            <Btn variant="outline" onClick={async () => {
                              await supabase.from("influencer_withdrawals" as any).update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", w.id);
                              toast({ title: "Withdrawal rejected" }); await fetchData();
                            }} className="flex-1">Reject</Btn>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {infWithdrawals.length === 0 && <p className="text-center py-8 text-muted-foreground text-[12px]">No withdrawals yet</p>}
                </div>
              </div>
            )}

            {/* ═══ INF CHALLENGES ═══ */}
            {activeTab === "inf_challenges" && (
              <div className="space-y-4">
                <div className={cardCls}>
                  <SectionHeader title="Create Challenge" />
                  <div className="space-y-3">
                    <input value={newChallenge.title} onChange={e => setNewChallenge(p => ({ ...p, title: e.target.value }))} placeholder="Challenge title" className={inputCls} />
                    <textarea value={newChallenge.description} onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))} placeholder="Description" className={`${inputCls} min-h-[60px] resize-none`} />
                    <textarea value={newChallenge.instructions} onChange={e => setNewChallenge(p => ({ ...p, instructions: e.target.value }))} placeholder="Instructions" className={`${inputCls} min-h-[60px] resize-none`} />
                    <input value={newChallenge.hashtag} onChange={e => setNewChallenge(p => ({ ...p, hashtag: e.target.value }))} placeholder="Hashtag" className={inputCls} />
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Challenge Type</p>
                      <select value={newChallenge.challenge_type} onChange={e => setNewChallenge(p => ({ ...p, challenge_type: e.target.value, total_videos: e.target.value === "single" ? 1 : p.total_videos }))} className={`${inputCls} bg-card`}>
                        <option value="single">Single Video</option>
                        <option value="set">Set (Multiple Videos)</option>
                      </select>
                    </div>
                    {newChallenge.challenge_type === "set" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-[10px] text-muted-foreground mb-1">Total Videos</p><input type="number" value={newChallenge.total_videos} onChange={e => setNewChallenge(p => ({ ...p, total_videos: parseInt(e.target.value) || 1 }))} min={2} className={inputCls} /></div>
                        <div><p className="text-[10px] text-muted-foreground mb-1">Post interval (days)</p><input type="number" value={newChallenge.posting_interval_days} onChange={e => setNewChallenge(p => ({ ...p, posting_interval_days: parseInt(e.target.value) || 1 }))} min={1} className={inputCls} /></div>
                      </div>
                    )}
                    <div><p className="text-[10px] text-muted-foreground mb-1">Reward per video (₦)</p><input type="number" value={newChallenge.reward_per_video} onChange={e => setNewChallenge(p => ({ ...p, reward_per_video: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                    <Btn variant="primary" onClick={async () => {
                      if (!newChallenge.title) return;
                      await supabase.from("influencer_challenges" as any).insert({
                        title: newChallenge.title, description: newChallenge.description,
                        instructions: newChallenge.instructions, hashtag: newChallenge.hashtag,
                        challenge_type: newChallenge.challenge_type,
                        total_videos: newChallenge.challenge_type === "single" ? 1 : newChallenge.total_videos,
                        reward_per_video: newChallenge.reward_per_video, posting_interval_days: newChallenge.posting_interval_days,
                      } as any);
                      toast({ title: "Challenge created" });
                      setNewChallenge({ title: "", description: "", instructions: "", hashtag: "", challenge_type: "single", total_videos: 1, reward_per_video: 3000, posting_interval_days: 1 });
                      await fetchData();
                    }} className="w-full"><Plus className="w-3 h-3" /> Create Challenge</Btn>
                  </div>
                </div>

                {infChallenges.map((ch: any) => {
                  const enrollments = infChallengeEnrollments.filter((e: any) => e.challenge_id === ch.id);
                  const submissions = infChallengeSubmissions.filter((s: any) => s.challenge_id === ch.id);
                  const pendingSubs = submissions.filter((s: any) => s.status === "pending_review");
                  return (
                    <div key={ch.id} className={cardCls}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground text-[13px]">{ch.title}</h4>
                          <p className="text-[10px] text-muted-foreground">
                            {ch.challenge_type === "single" ? "Single Video" : `Set of ${ch.total_videos} videos`} · {formatNaira(ch.reward_per_video)}/video · {ch.hashtag} · {ch.is_active ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Btn variant="outline" onClick={async () => {
                            await supabase.from("influencer_challenges" as any).update({ is_active: !ch.is_active } as any).eq("id", ch.id);
                            await fetchData();
                          }}>{ch.is_active ? "Deactivate" : "Activate"}</Btn>
                          <button onClick={async () => {
                            await supabase.from("influencer_challenges" as any).delete().eq("id", ch.id);
                            toast({ title: "Challenge deleted" }); await fetchData();
                          }} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">{ch.description}</p>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <MetricCard label="Enrolled" value={enrollments.length} icon={Users} variant="primary" />
                        <MetricCard label="Submissions" value={submissions.length} icon={Upload} />
                        <MetricCard label="Pending" value={pendingSubs.length} icon={Activity} />
                      </div>
                      {pendingSubs.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-primary font-semibold">Pending Approvals</p>
                          {pendingSubs.map((sub: any) => {
                            const userEmail = profiles.find(p => p.id === sub.user_id)?.email || sub.user_id?.slice(0, 8);
                            const enrollment = enrollments.find((e: any) => e.user_id === sub.user_id);
                            return (
                              <div key={sub.id} className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <div>
                                    <p className="text-[11px] text-foreground font-semibold">{userEmail}</p>
                                    <p className="text-[9px] text-muted-foreground">Video #{sub.video_number} of {ch.total_videos}</p>
                                  </div>
                                  <a href={sub.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-2.5 h-2.5" /> View</a>
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <Btn variant="primary" onClick={async () => {
                                    await supabase.from("influencer_challenge_submissions" as any).update({ status: "approved", reviewed_at: new Date().toISOString() } as any).eq("id", sub.id);
                                    if (enrollment) {
                                      const newPending = Math.max(0, (enrollment.pending_earnings || 0) - ch.reward_per_video);
                                      const newApproved = (enrollment.approved_earnings || 0) + ch.reward_per_video;
                                      const allSubs = submissions.filter((s: any) => s.user_id === sub.user_id);
                                      const approvedCount = allSubs.filter((s: any) => s.status === "approved").length + 1;
                                      const isComplete = approvedCount >= ch.total_videos;
                                      await supabase.from("influencer_challenge_enrollments" as any).update({ pending_earnings: newPending, approved_earnings: newApproved, completed: isComplete } as any).eq("id", enrollment.id);
                                      if (isComplete) {
                                        const { data: wallet } = await supabase.from("influencer_wallets" as any).select("*").eq("user_id", sub.user_id).eq("status", "active").maybeSingle();
                                        if (wallet) await supabase.from("influencer_wallets" as any).update({ balance: ((wallet as any).balance || 0) + newApproved } as any).eq("id", (wallet as any).id);
                                      }
                                    }
                                    await sendNotification({ userId: sub.user_id, type: "earning", title: "Video Submission Approved!", message: `Your video #${sub.video_number} for "${ch.title}" has been approved. You earned ₦${ch.reward_per_video.toLocaleString("en-NG")}!` });
                                    toast({ title: "Submission approved" }); await fetchData();
                                  }} className="flex-1"><Check className="w-3 h-3" /> Approve</Btn>
                                  <Btn variant="outline" onClick={async () => {
                                    await supabase.from("influencer_challenge_submissions" as any).update({ status: "rejected", reviewed_at: new Date().toISOString() } as any).eq("id", sub.id);
                                    await sendNotification({ userId: sub.user_id, type: "rejection", title: "Video Submission Rejected", message: `Your video #${sub.video_number} for "${ch.title}" was not approved.` });
                                    toast({ title: "Submission rejected" }); await fetchData();
                                  }} className="flex-1">Reject</Btn>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {infChallenges.length === 0 && <div className={cardCls}><p className="text-center py-8 text-muted-foreground text-[12px]">No challenges created yet</p></div>}
              </div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {activeTab === "settings" && (
              <div className={cardCls}>
                <SectionHeader title="App Settings" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <label className="text-[12px] font-medium text-foreground">Verify Page Active</label>
                      <p className="text-[11px] text-muted-foreground">If disabled, users will see "Coming Soon".</p>
                    </div>
                    <input type="checkbox" checked={verifyPageActive} onChange={e => setVerifyPageActive(e.target.checked)} className="w-5 h-5 accent-primary cursor-pointer" />
                  </div>
                  <div><label className="text-[11px] text-muted-foreground">Verify Expense Button Link</label><input value={verifyExpenseLink} onChange={e => setVerifyExpenseLink(e.target.value)} placeholder="https://..." className={`${inputCls} mt-1`} /></div>
                  <div><label className="text-[11px] text-muted-foreground">Post-Queue Referral Points</label><input type="number" value={postQueueReferralPoints} onChange={e => setPostQueueReferralPoints(e.target.value)} className={`${inputCls} mt-1`} /></div>
                  <div><label className="text-[11px] text-muted-foreground">Verify Spend Link</label><input value={verifySpendLink} onChange={e => setVerifySpendLink(e.target.value)} placeholder="https://..." className={`${inputCls} mt-1`} /></div>
                  <div><label className="text-[11px] text-muted-foreground">Verify Spend Description</label><textarea value={verifySpendDescription} onChange={e => setVerifySpendDescription(e.target.value)} className={`${inputCls} mt-1 min-h-[60px] resize-none`} /></div>
                  <hr className="border-border" />
                  <h4 className="text-sm font-semibold text-foreground">Footer Content</h4>
                  <div><label className="text-[11px] text-muted-foreground">About Us</label><textarea value={footerAboutUs} onChange={e => setFooterAboutUs(e.target.value)} className={`${inputCls} mt-1 min-h-[60px] resize-none`} /></div>
                  <div><label className="text-[11px] text-muted-foreground">Contact Us</label><textarea value={footerContactUs} onChange={e => setFooterContactUs(e.target.value)} className={`${inputCls} mt-1 min-h-[60px] resize-none`} /></div>
                  <div><label className="text-[11px] text-muted-foreground">Invest With Us</label><textarea value={footerInvestWithUs} onChange={e => setFooterInvestWithUs(e.target.value)} className={`${inputCls} mt-1 min-h-[60px] resize-none`} /></div>
                  <Btn variant="primary" onClick={handleSaveSettings} disabled={saving} className="w-full"><Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Settings"}</Btn>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
