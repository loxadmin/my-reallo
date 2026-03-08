import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Ghost, Activity, LogOut, RefreshCw, Shield, Settings, Save,
  BarChart3, Plus, Trash2, Link, Upload, CheckCircle2, FileSpreadsheet,
  Smartphone, Check, ExternalLink, CreditCard as Edit2, Download, Star,
  Wallet, ArrowDownToLine, Ban, AlertTriangle, Eye, X, Bell, LayoutDashboard,
  ChevronDown, ChevronRight, Menu, Search, Zap, TrendingUp, TrendingDown, DollarSign
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "@/hooks/use-toast";
import { sendNotification } from "@/lib/notifications";
import WaterBackground from "@/components/WaterBackground";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter, SidebarTrigger, useSidebar,
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

type AdminCurrency = "NGN" | "USD" | "EUR" | "GBP";
const ADMIN_CURRENCY_SYMBOLS: Record<AdminCurrency, string> = { NGN: "₦", USD: "$", EUR: "€", GBP: "£" };
const ADMIN_CURRENCY_DEFAULTS: Record<AdminCurrency, number> = { NGN: 1, USD: 1600, EUR: 1700, GBP: 2000 };

const formatCompact = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "K";
  return String(Math.round(n));
};

const makeAdminFormat = (currency: AdminCurrency, rates: Record<AdminCurrency, number>) => {
  const sym = ADMIN_CURRENCY_SYMBOLS[currency];
  const rate = rates[currency];
  const convert = (naira: number) => currency === "NGN" ? naira : naira / rate;
  const fmt = (naira: number) => {
    const v = convert(naira);
    if (currency === "NGN") return sym + v.toLocaleString("en-NG");
    return sym + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtCompact = (naira: number) => sym + formatCompact(convert(naira));
  return { fmt, fmtCompact };
};
const fromApps = () => supabase.from("decision_apps" as any);
const fromDResponses = () => supabase.from("decision_responses" as any);

type AdminTab = "overview" | "users" | "ghosts" | "activity" | "goals" | "decisions" | "analytics" | "verification" | "settings" | "inf_apps" | "inf_wallets" | "inf_referrals" | "inf_withdrawals" | "inf_challenges" | "warnings";

const navGroups = [
  {
    label: "GENERAL",
    items: [
      { id: "overview" as AdminTab, label: "Dashboard", icon: LayoutDashboard },
      { id: "users" as AdminTab, label: "Users", icon: Users },
      { id: "goals" as AdminTab, label: "Goals", icon: Settings },
      { id: "decisions" as AdminTab, label: "Decision Apps", icon: Smartphone },
      { id: "verification" as AdminTab, label: "Verification", icon: CheckCircle2 },
      { id: "warnings" as AdminTab, label: "Warnings", icon: AlertTriangle },
    ],
  },
  {
    label: "INFLUENCER",
    items: [
      { id: "inf_apps" as AdminTab, label: "Applications", icon: Star },
      { id: "inf_wallets" as AdminTab, label: "Wallets", icon: Wallet },
      { id: "inf_referrals" as AdminTab, label: "Referrals", icon: Users },
      { id: "inf_withdrawals" as AdminTab, label: "Withdrawals", icon: ArrowDownToLine },
      { id: "inf_challenges" as AdminTab, label: "Challenges", icon: Upload },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { id: "settings" as AdminTab, label: "Settings", icon: Link },
      { id: "analytics" as AdminTab, label: "Analytics", icon: BarChart3 },
      { id: "ghosts" as AdminTab, label: "Ghost Users", icon: Ghost },
      { id: "activity" as AdminTab, label: "Activity Log", icon: Activity },
    ],
  },
];

// ── Sidebar ──
function AdminSidebar({ activeTab, setActiveTab, counts, onLogout }: { activeTab: AdminTab; setActiveTab: (t: AdminTab) => void; counts: Record<string, number>; onLogout: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-5 py-6 border-b border-sidebar-border/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Shield className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-[14px] font-bold text-sidebar-foreground tracking-tight">Reallo Admin</span>}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 py-4 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="mb-3">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40 font-semibold mb-2 px-3">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {group.items.map((item) => {
                  const count = counts[item.id];
                  const isActive = activeTab === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setActiveTab(item.id)}
                        tooltip={item.label}
                        className={`rounded-xl h-10 px-3 transition-all duration-200 border ${isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-md border-primary/30"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 border-transparent"
                        }`}
                      >
                        <item.icon className="w-[18px] h-[18px] shrink-0" />
                        {!collapsed && (
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span className="text-[13px] truncate">{item.label}</span>
                            {count !== undefined && count > 0 && (
                              <span className={`text-[10px] min-w-[22px] text-center px-1.5 py-0.5 rounded-md font-bold shrink-0 ml-2 ${isActive ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary/15 text-primary"}`}>
                                {count > 99 ? "99+" : count}
                              </span>
                            )}
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-4 py-4 border-t border-sidebar-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Logout"
              className="rounded-xl h-10 px-3 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 border border-transparent transition-all"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="text-[13px]">Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// ── Metric Card (reference-style) ──
const MetricCard = ({ label, value, icon: Icon, trend, trendLabel }: {
  label: string; value: string | number; icon: any; trend?: "up" | "down" | "neutral"; trendLabel?: string;
}) => (
  <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-2.5 hover:shadow-md transition-shadow overflow-hidden">
    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
    <p className="text-xl font-bold text-foreground leading-none">{value}</p>
    {trend && trendLabel && (
      <div className="flex items-center gap-1.5">
        {trend === "up" ? <TrendingUp className="w-3 h-3 text-primary shrink-0" /> : trend === "down" ? <TrendingDown className="w-3 h-3 text-destructive shrink-0" /> : null}
        <span className={`text-[10px] font-medium ${trend === "up" ? "text-primary" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>{trendLabel}</span>
      </div>
    )}
  </div>
);

// ── Section header ──
const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-5">
    <div>
      <p className="text-[15px] font-bold text-foreground">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ── Status badge ──
const StatusBadge = ({ status, className }: { status: string; className?: string }) => {
  const colors: Record<string, string> = {
    active: "bg-primary/15 text-primary border-primary/20",
    approved: "bg-primary/15 text-primary border-primary/20",
    verified: "bg-primary/15 text-primary border-primary/20",
    pending: "bg-accent/10 text-accent-foreground border-accent/20",
    pending_review: "bg-accent/10 text-accent-foreground border-accent/20",
    pending_activation: "bg-accent/10 text-accent-foreground border-accent/20",
    pending_appeal: "bg-accent/10 text-accent-foreground border-accent/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    appeal_rejected: "bg-destructive/10 text-destructive border-destructive/20",
    BANNED: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${colors[status] || "bg-muted text-muted-foreground border-border"} ${className || ""}`}>{status.replace(/_/g, " ")}</span>;
};

// ── Button ──
const Btn = ({ children, variant = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "outline" | "destructive" }) => {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  const variants: Record<string, string> = {
    default: "bg-muted text-foreground hover:bg-muted/80",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    outline: "border border-border text-foreground hover:bg-muted/50",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20",
  };
  return <button className={`${base} ${variants[variant]}`} {...props}>{children}</button>;
};

// ── Table wrapper ──
const TableCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden ${className || ""}`}>
    {children}
  </div>
);

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="px-5 py-3 border-b border-border/30 bg-muted/20">
    <div className="flex items-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider gap-3">
      {children}
    </div>
  </div>
);

const TableRow = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`px-5 py-3 border-b border-border/15 last:border-0 flex items-center gap-3 hover:bg-muted/15 transition-colors ${onClick ? "cursor-pointer" : ""} ${className || ""}`}>
    {children}
  </div>
);

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
  const [verifyDataActive, setVerifyDataActive] = useState(true);
  const [verifyElectricityActive, setVerifyElectricityActive] = useState(true);
  const [verifyFoodActive, setVerifyFoodActive] = useState(true);
  const [verifyTransportActive, setVerifyTransportActive] = useState(true);
  const [postQueueReferralPoints, setPostQueueReferralPoints] = useState("1000");
  const [verifySpendLink, setVerifySpendLink] = useState("");
  const [verifySpendDescription, setVerifySpendDescription] = useState("");
  const [footerContactUs, setFooterContactUs] = useState("");
  const [footerAboutUs, setFooterAboutUs] = useState("");
  const [footerInvestWithUs, setFooterInvestWithUs] = useState("");
  const [currencyRateUsd, setCurrencyRateUsd] = useState("1600");
  const [currencyRateEur, setCurrencyRateEur] = useState("1700");
  const [currencyRateGbp, setCurrencyRateGbp] = useState("2000");
  const [searchQuery, setSearchQuery] = useState("");
  const [adminCurrency, setAdminCurrency] = useState<AdminCurrency>("NGN");
  const adminRates: Record<AdminCurrency, number> = useMemo(() => ({
    NGN: 1,
    USD: Number(currencyRateUsd) || ADMIN_CURRENCY_DEFAULTS.USD,
    EUR: Number(currencyRateEur) || ADMIN_CURRENCY_DEFAULTS.EUR,
    GBP: Number(currencyRateGbp) || ADMIN_CURRENCY_DEFAULTS.GBP,
  }), [currencyRateUsd, currencyRateEur, currencyRateGbp]);
  const { fmt: formatNaira, fmtCompact: formatNairaCompact } = useMemo(() => makeAdminFormat(adminCurrency, adminRates), [adminCurrency, adminRates]);
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
    setVerifyDataActive(settings.find(s => s.key === "verify_data_active")?.value === "false" ? false : true);
    setVerifyElectricityActive(settings.find(s => s.key === "verify_electricity_active")?.value === "false" ? false : true);
    setVerifyFoodActive(settings.find(s => s.key === "verify_food_active")?.value === "false" ? false : true);
    setVerifyTransportActive(settings.find(s => s.key === "verify_transport_active")?.value === "false" ? false : true);
    setPostQueueReferralPoints(settings.find(s => s.key === "post_queue_referral_points")?.value || "1000");
    setVerifySpendLink(settings.find(s => s.key === "verify_spend_link")?.value || "");
    setVerifySpendDescription(settings.find(s => s.key === "verify_spend_description")?.value || "");
    setFooterContactUs(settings.find(s => s.key === "footer_contact_us")?.value || "");
    setFooterAboutUs(settings.find(s => s.key === "footer_about_us")?.value || "");
    setFooterInvestWithUs(settings.find(s => s.key === "footer_invest_with_us")?.value || "");
    setCurrencyRateUsd(settings.find(s => s.key === "currency_rate_usd")?.value || "1600");
    setCurrencyRateEur(settings.find(s => s.key === "currency_rate_eur")?.value || "1700");
    setCurrencyRateGbp(settings.find(s => s.key === "currency_rate_gbp")?.value || "2000");

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
      supabase.from("admin_settings").upsert({ key: "verify_data_active", value: String(verifyDataActive), updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_electricity_active", value: String(verifyElectricityActive), updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_food_active", value: String(verifyFoodActive), updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_transport_active", value: String(verifyTransportActive), updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "post_queue_referral_points", value: postQueueReferralPoints, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_spend_link", value: verifySpendLink, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "verify_spend_description", value: verifySpendDescription, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "footer_contact_us", value: footerContactUs, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "footer_about_us", value: footerAboutUs, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "footer_invest_with_us", value: footerInvestWithUs, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "currency_rate_usd", value: currencyRateUsd, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "currency_rate_eur", value: currencyRateEur, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "currency_rate_gbp", value: currencyRateGbp, updated_at: new Date().toISOString() }),
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
            const { data: verif } = await supabase.from("spend_verifications").select("frequency, spend_type").eq("id", firstMatch.verification_id).single();
            if (allTxs && verif) {
              const verifiedTxs = allTxs.filter(t => t.is_verified);
              const totalAmount = verifiedTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0);
              const freq = (verif as any).frequency;

              const recalcForVerification = async (verId: string, userId: string) => {
                const multiplier = freq === "daily" ? 12 : freq === "weekly" ? 13 : 12;
                const thisAnnual = freq === "monthly"
                  ? Math.round(Number(verifiedTxs[0]?.verified_amount || 0) * 12)
                  : Math.round(totalAmount * multiplier);
                await supabase.from("spend_verifications").update({
                  recalculated_amount: thisAnnual,
                  ...(freq === "monthly" ? { status: "verified" } : {})
                }).eq("id", verId);
                if (freq !== "monthly") {
                  const { data: vData } = await supabase.from("spend_verifications").select("ends_at").eq("id", verId).single();
                  if (vData && new Date() >= new Date((vData as any).ends_at)) {
                    await supabase.from("spend_verifications").update({ status: "verified" }).eq("id", verId);
                  }
                }
                const { data: allVerifs } = await supabase.from("spend_verifications")
                  .select("spend_type, recalculated_amount, status")
                  .eq("user_id", userId);
                const verifList = (allVerifs || []) as { spend_type: string; recalculated_amount: number | null; status: string }[];
                const dataV = verifList.find(v => v.spend_type === "data");
                const elecV = verifList.find(v => v.spend_type === "electricity");
                const dataAmt = dataV?.recalculated_amount || 0;
                const elecAmt = elecV?.recalculated_amount || 0;
                const totalAnnual = dataAmt + elecAmt;
                const bothVerified = dataV?.status === "verified" && elecV?.status === "verified";

                const { data: userProfile } = await supabase.from("profiles").select("selected_goal").eq("id", userId).single();
                let newTarget: number | undefined;
                if (userProfile?.selected_goal) {
                  const goalType = (userProfile.selected_goal as string).split(":")[0];
                  const goalSub = (userProfile.selected_goal as string).includes(":") ? (userProfile.selected_goal as string).split(":")[1] : null;
                  let query = supabase.from("goal_categories").select("max_price").eq("goal_type", goalType);
                  if (goalSub) query = query.eq("subcategory", goalSub);
                  else query = query.is("subcategory", null);
                  const { data: goalCat } = await query.limit(1).maybeSingle();
                  if (goalCat) { newTarget = Math.min(totalAnnual, (goalCat as any).max_price); }
                }
                const updateData: Record<string, any> = { total_annual_spend: totalAnnual };
                if (bothVerified) updateData.spend_verified = true;
                if (newTarget !== undefined) updateData.target_amount = newTarget;
                await supabase.from("profiles").update(updateData).eq("id", userId);
              };

              await recalcForVerification(firstMatch.verification_id, firstMatch.user_id);
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

  // Build event graph data (last 30 days) - must be before early returns
  const eventGraphData = useMemo(() => {
    const days: Record<string, { date: string; signups: number; referrals: number; verifications: number; points: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = { date: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }), signups: 0, referrals: 0, verifications: 0, points: 0 };
    }
    for (const p of profiles) {
      const key = p.created_at?.split("T")[0];
      if (key && days[key]) days[key].signups++;
    }
    for (const a of activities) {
      const key = a.created_at?.split("T")[0];
      if (key && days[key]) {
        if (a.action_type === "referral") days[key].referrals++;
        else days[key].points += (a.positions_moved || 0);
      }
    }
    for (const t of verificationTxs) {
      const key = t.submitted_at?.split("T")[0];
      if (key && days[key]) days[key].verifications++;
    }
    return Object.values(days);
  }, [profiles, activities, verificationTxs]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground text-[13px]">Loading...</p></div>;
  if (!isAdmin) return null;

  const referralApps = decisionApps.filter(a => a.category === "referral");
  const totalSpend = profiles.reduce((s, p) => s + (p.total_annual_spend || 0), 0);
  const totalPoints = profiles.reduce((s, p) => s + (p.points_balance || 0), 0);
  const totalRevenue = verificationTxs.filter(t => t.is_verified).reduce((s, t) => s + Number(t.verified_amount || 0), 0);
  const pendingWithdrawals = infWithdrawals.filter((w: any) => w.status === "pending").length;
  const pendingApps = infApps.filter((a: any) => a.status === "pending_review" || a.status === "pending_appeal").length;
  const bannedCount = profiles.filter(p => p.is_banned).length;
  const activeUsers = profiles.filter(p => !p.is_banned).length;

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

  const inputCls = "w-full rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm px-3 py-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";
  const cardCls = "rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-6";

  const filteredProfiles = searchQuery
    ? profiles.filter(p => p.email.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.includes(searchQuery))
    : profiles;

  const tabTitle: Record<AdminTab, string> = {
    overview: "Dashboard", users: "Users", ghosts: "Ghost Users", activity: "Activity Log",
    goals: "Goal Categories", decisions: "Decision Apps", analytics: "Analytics",
    verification: "Verification", settings: "Settings", inf_apps: "Influencer Applications",
    inf_wallets: "Influencer Wallets", inf_referrals: "Influencer Referrals",
    inf_withdrawals: "Influencer Withdrawals", inf_challenges: "Influencer Challenges", warnings: "Warnings",
  };

  const downloadFinancialStatement = (format: "csv" | "pdf") => {
    const sym = ADMIN_CURRENCY_SYMBOLS[adminCurrency];
    const rate = adminRates[adminCurrency];
    const cv = (n: number) => adminCurrency === "NGN" ? n : n / rate;
    const fmtVal = (n: number) => cv(n).toFixed(2);
    const today = new Date().toISOString().split("T")[0];

    const verifiedTxs = verificationTxs.filter(t => t.is_verified);
    const totalVerified = verifiedTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0);
    const totalInfluencerPayouts = infWithdrawals.filter((w: any) => w.status === "approved").reduce((s: number, w: any) => s + (w.amount || 0), 0);
    const totalVoucherValue = 0; // placeholder if vouchers data available

    const lines = [
      ["Reallo Financial Statement"],
      [`Generated: ${today}`, `Currency: ${adminCurrency}`],
      [],
      ["PLATFORM OVERVIEW"],
      ["Metric", "Value"],
      ["Total Users", String(profiles.length)],
      ["Active Users", String(activeUsers)],
      ["Banned Users", String(bannedCount)],
      [],
      ["REVENUE"],
      ["Metric", `Amount (${sym})`],
      ["Total Annual Spend (all users)", `${sym}${fmtVal(totalSpend)}`],
      ["Processed Revenue (verified txns)", `${sym}${fmtVal(totalRevenue)}`],
      ["Verified Transactions Count", String(verifiedTxs.length)],
      [],
      ["POINTS ECONOMY"],
      ["Metric", "Value"],
      ["Total Points in Circulation", String(totalPoints)],
      [`Points Value (${sym})`, `${sym}${fmtVal(totalPoints * 0.5)}`],
      [],
      ["INFLUENCER PAYOUTS"],
      ["Metric", `Amount (${sym})`],
      ["Total Influencer Referral Earnings", `${sym}${fmtVal(infReferrals.reduce((s: number, r: any) => s + (r.reward_amount || 0), 0))}`],
      ["Total Approved Withdrawals", `${sym}${fmtVal(totalInfluencerPayouts)}`],
      ["Pending Withdrawals", String(pendingWithdrawals)],
      [],
      ["VERIFIED TRANSACTIONS"],
      ["Transaction ID", `Amount (${sym})`, "Date", "User ID"],
      ...verifiedTxs.slice(0, 500).map(t => [
        t.transaction_id,
        `${sym}${fmtVal(Number(t.verified_amount || 0))}`,
        new Date(t.submitted_at).toLocaleDateString(),
        t.user_id.slice(0, 8),
      ]),
    ];

    if (format === "csv") {
      const csv = lines.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `reallo-financial-statement-${today}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "CSV Downloaded", description: "Financial statement exported successfully." });
    } else {
      // Generate a printable HTML and open as PDF
      const htmlRows = lines.map(row => {
        if (row.length === 0) return "<tr><td>&nbsp;</td></tr>";
        if (row.length === 1) return `<tr><td colspan="4" style="font-size:16px;font-weight:bold;padding:12px 0 4px;">${row[0]}</td></tr>`;
        const isHeader = ["Metric", "Transaction ID"].includes(row[0]);
        const tag = isHeader ? "th" : "td";
        return `<tr>${row.map(c => `<${tag} style="padding:4px 12px 4px 0;text-align:left;${isHeader ? "font-weight:600;border-bottom:1px solid #ccc;" : ""}">${c}</${tag}>`)
          .join("")}</tr>`;
      }).join("\n");
      const html = `<!DOCTYPE html><html><head><title>Reallo Financial Statement</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a}table{border-collapse:collapse;width:100%}th,td{font-size:12px}</style></head><body><table>${htmlRows}</table></body></html>`;
      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); w.print(); }
      toast({ title: "PDF Ready", description: "Print dialog opened. Save as PDF." });
    }
  };


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background relative">
        {/* Water background behind everything */}
        <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
          <WaterBackground />
        </div>

        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} onLogout={signOut} />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Top bar */}
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b border-border/40 bg-background/70 backdrop-blur-xl px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search users, IDs..."
                  className="pl-9 pr-4 py-1.5 rounded-lg border border-border/40 bg-muted/30 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 w-[240px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={adminCurrency}
                onChange={e => setAdminCurrency(e.target.value as AdminCurrency)}
                className="rounded-lg border border-border/40 bg-muted/30 text-[11px] text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
              >
                {(["NGN", "USD", "EUR", "GBP"] as AdminCurrency[]).map(c => (
                  <option key={c} value={c}>{ADMIN_CURRENCY_SYMBOLS[c]} {c}</option>
                ))}
              </select>
              <ThemeToggle />
              <Btn variant="outline" onClick={fetchData} disabled={refreshing}>
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {!refreshing && "Refresh"}
              </Btn>
              <Btn variant="outline" onClick={() => navigate("/")}>Home</Btn>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

            {/* Page title */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">{activeTab === "overview" ? "Welcome Back" : tabTitle[activeTab]}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {activeTab === "overview" ? "Here's what's happening with your platform today" : `Manage ${tabTitle[activeTab].toLowerCase()}`}
                </p>
              </div>
              {activeTab === "overview" && (
                <div className="flex items-center gap-2">
                  <Btn variant="outline" onClick={() => downloadFinancialStatement("csv")}>
                    <Download className="w-3.5 h-3.5" /> CSV
                  </Btn>
                  <Btn variant="outline" onClick={() => downloadFinancialStatement("pdf")}>
                    <Download className="w-3.5 h-3.5" /> PDF
                  </Btn>
                </div>
              )}
            </div>

            {/* ═══ OVERVIEW ═══ */}
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <MetricCard label="Total Users" value={formatCompact(profiles.length)} icon={Users} trend="up" trendLabel={`${formatCompact(activeUsers)} active`} />
                  <MetricCard label="Annual Spend" value={formatNairaCompact(totalSpend)} icon={Wallet} trend="up" trendLabel="All users" />
                  <MetricCard label="Processed Revenue" value={formatNairaCompact(totalRevenue)} icon={DollarSign} trend="up" trendLabel={`${verificationTxs.filter(t => t.is_verified).length} verified txns`} />
                  <MetricCard label="Total Points" value={formatCompact(totalPoints)} icon={Star} trend="neutral" trendLabel="In circulation" />
                  <MetricCard label="Banned Users" value={formatCompact(bannedCount)} icon={Ban} trend={bannedCount > 0 ? "down" : "neutral"} trendLabel={`${formatCompact(userWarnings.length)} warnings`} />
                  <MetricCard label="Ghost Users" value={formatCompact(ghostCount)} icon={Ghost} trend="neutral" trendLabel="Seeded" />
                </div>

                {/* Events Graph */}
                <TableCard className="overflow-hidden">
                  <div className="px-6 py-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-[14px] font-bold text-foreground">Platform Activity</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days overview</p>
                    </div>
                    <div className="flex items-center gap-5 text-[11px]">
                      {[
                        { label: "Signups", color: "hsl(var(--primary))" },
                        { label: "Referrals", color: "hsl(262 80% 60%)" },
                        { label: "Verifications", color: "hsl(200 80% 55%)" },
                      ].map(item => (
                        <span key={item.label} className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-md inline-block" style={{ background: item.color }} />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 pb-5" style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventGraphData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="20%">
                        <defs>
                          <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          </linearGradient>
                          <linearGradient id="gradReferrals" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(262 80% 60%)" stopOpacity={0.85} />
                            <stop offset="100%" stopColor="hsl(262 80% 60%)" stopOpacity={0.35} />
                          </linearGradient>
                          <linearGradient id="gradVerifications" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(200 80% 55%)" stopOpacity={0.85} />
                            <stop offset="100%" stopColor="hsl(200 80% 55%)" stopOpacity={0.35} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(0 0% 50% / 0.08)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(0 0% 50% / 0.5)" }} interval="preserveStartEnd" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(0 0% 50% / 0.5)" }} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "hsl(0 0% 50% / 0.06)", radius: 6 }}
                          contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(0 0% 50% / 0.15)", background: "hsl(var(--card))", color: "hsl(var(--foreground))", boxShadow: "0 8px 32px -8px hsl(0 0% 0% / 0.15)", padding: "10px 14px" }}
                        />
                        <Bar dataKey="signups" fill="url(#gradSignups)" radius={[6, 6, 0, 0]} name="Signups" />
                        <Bar dataKey="referrals" fill="url(#gradReferrals)" radius={[6, 6, 0, 0]} name="Referrals" />
                        <Bar dataKey="verifications" fill="url(#gradVerifications)" radius={[6, 6, 0, 0]} name="Verifications" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TableCard>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Pending actions */}
                  <TableCard>
                    <div className="px-5 py-4 border-b border-border/30">
                      <h3 className="text-[13px] font-semibold text-foreground">Pending Actions</h3>
                    </div>
                    <div className="divide-y divide-border/20">
                      {[
                        { label: "Influencer Applications", value: pendingApps, onClick: () => setActiveTab("inf_apps") },
                        { label: "Pending Withdrawals", value: pendingWithdrawals, onClick: () => setActiveTab("inf_withdrawals") },
                        { label: "Wallet Activations", value: infWallets.filter((w: any) => w.status === "pending_activation").length, onClick: () => setActiveTab("inf_wallets") },
                        { label: "Unverified Transactions", value: verificationTxs.filter(t => !t.is_verified && !t.is_duplicate).length, onClick: () => setActiveTab("verification") },
                      ].map((item) => (
                        <div key={item.label} onClick={item.onClick} className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 cursor-pointer transition-colors">
                          <span className="text-[12px] text-muted-foreground">{item.label}</span>
                          <span className={`text-[13px] font-bold ${item.value > 0 ? "text-primary" : "text-foreground"}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </TableCard>

                  {/* User breakdown */}
                  <TableCard>
                    <div className="px-5 py-4 border-b border-border/30">
                      <h3 className="text-[13px] font-semibold text-foreground">User Breakdown</h3>
                    </div>
                    <div className="divide-y divide-border/20">
                      {[
                        { label: "Active Users", value: activeUsers, color: "text-primary" },
                        { label: "Banned Users", value: bannedCount, color: "text-destructive" },
                        { label: "Warnings Issued", value: userWarnings.length, color: "text-foreground" },
                        { label: "Duplicate Transactions", value: verificationTxs.filter(t => t.is_duplicate).length, color: "text-destructive" },
                      ].map((item) => (
                        <div key={item.label} className="px-5 py-3 flex items-center justify-between">
                          <span className="text-[12px] text-muted-foreground">{item.label}</span>
                          <span className={`text-[13px] font-bold ${item.color}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </TableCard>

                  {/* Quick actions */}
                  <TableCard>
                    <div className="px-5 py-4 border-b border-border/30">
                      <h3 className="text-[13px] font-semibold text-foreground">Quick Actions</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <Btn variant="outline" onClick={() => setActiveTab("users")} className="w-full justify-start"><Users className="w-3.5 h-3.5" /> Manage Users</Btn>
                      <Btn variant="outline" onClick={() => setActiveTab("verification")} className="w-full justify-start"><FileSpreadsheet className="w-3.5 h-3.5" /> Upload CSV</Btn>
                      <Btn variant="outline" onClick={() => setActiveTab("inf_apps")} className="w-full justify-start"><Star className="w-3.5 h-3.5" /> Review Applications</Btn>
                      <Btn variant="primary" onClick={() => setActiveTab("analytics")} className="w-full justify-start"><BarChart3 className="w-3.5 h-3.5" /> View Analytics</Btn>
                    </div>
                  </TableCard>
                </div>

                {/* Recent Activity table */}
                <TableCard>
                  <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-foreground">Recent Activity</h3>
                    <Btn variant="outline" onClick={() => setActiveTab("activity")}>View All</Btn>
                  </div>
                  <TableHeader>
                    <span className="flex-1 min-w-0">User</span>
                    <span className="w-24 shrink-0">Action</span>
                    <span className="w-20 shrink-0 text-right">Positions</span>
                    <span className="w-24 shrink-0 text-right">Date</span>
                  </TableHeader>
                  {activities.slice(0, 6).map((a) => (
                    <TableRow key={a.id}>
                      <span className="flex-1 min-w-0 text-[11px] text-muted-foreground font-mono truncate">{a.user_id.slice(0, 8)}</span>
                      <span className="w-24 shrink-0 text-[11px] text-foreground capitalize">{a.action_type}</span>
                      <span className="w-20 shrink-0 text-right text-[11px] font-semibold text-primary">+{a.positions_moved}</span>
                      <span className="w-24 shrink-0 text-right text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                    </TableRow>
                  ))}
                  {activities.length === 0 && <div className="py-8 text-center text-muted-foreground text-[12px]">No activity yet</div>}
                </TableCard>
              </>
            )}

            {/* ═══ USERS ═══ */}
            {activeTab === "users" && (
              <TableCard>
                <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-foreground">Registered Users ({filteredProfiles.length})</h3>
                </div>
                <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <TableHeader>
                  <span className="flex-1 min-w-0">User</span>
                  <span className="w-20 shrink-0">Spend</span>
                  <span className="w-14 shrink-0">Queue</span>
                  <span className="w-16 shrink-0">Points</span>
                  <span className="w-10 shrink-0">Refs</span>
                  <span className="w-16 shrink-0">Status</span>
                  <span className="w-8 shrink-0"></span>
                </TableHeader>
                <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {filteredProfiles.map((p) => {
                    const isSelected = selectedUserId === p.id;
                    const pWarnings = userWarnings.filter(w => w.user_id === p.id);
                    const pDuplicates = verificationTxs.filter(t => t.user_id === p.id && t.is_duplicate);
                    return (
                      <div key={p.id}>
                        <TableRow onClick={() => { setSelectedUserId(isSelected ? null : p.id); setEditingProfile(null); }}>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-[11px] font-medium text-foreground truncate">{p.email}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">Joined {new Date(p.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className="w-20 shrink-0 text-[11px] text-foreground">{formatNairaCompact(p.total_annual_spend || 0)}</span>
                          <span className="w-14 shrink-0 text-[11px] text-muted-foreground">#{p.queue_position}</span>
                          <span className="w-16 shrink-0 text-[11px] text-foreground">{formatCompact(p.points_balance)}</span>
                          <span className="w-10 shrink-0 text-[11px] text-muted-foreground">{referralCounts[p.id] || 0}</span>
                          <span className="w-16 shrink-0">
                            {p.is_banned ? <StatusBadge status="BANNED" /> : pDuplicates.length > 0 ? <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full border border-destructive/20">{pDuplicates.length} dup</span> : <StatusBadge status="active" />}
                          </span>
                          <span className="w-8 shrink-0 flex justify-end">
                            {isSelected ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                          </span>
                        </TableRow>

                        {isSelected && (
                          <div className="px-5 py-4 bg-muted/10 border-b border-border/20 space-y-3 overflow-hidden">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                              <span className="truncate">ID: {p.id.slice(0, 16)}...</span>
                              <span className="truncate">Goal: {p.selected_goal || 'None'}</span>
                              <span>Warnings: {pWarnings.length}</span>
                              <span>Duplicates: {pDuplicates.length}</span>
                            </div>

                            {pDuplicates.length > 0 && (
                              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                                <p className="text-[10px] text-destructive font-semibold mb-1">Duplicate Transactions:</p>
                                {pDuplicates.map(d => (
                                  <p key={d.id} className="text-[10px] text-muted-foreground font-mono">{d.transaction_id} — {d.duplicate_note}</p>
                                ))}
                              </div>
                            )}

                            {editingProfile ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground mb-1">Points</p>
                                    <input type="number" value={editingProfile.points_balance} onChange={e => setEditingProfile(prev => prev ? { ...prev, points_balance: parseInt(e.target.value) || 0 } : null)} className={inputCls} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground mb-1">Queue #</p>
                                    <input type="number" value={editingProfile.queue_position} onChange={e => setEditingProfile(prev => prev ? { ...prev, queue_position: parseInt(e.target.value) || 0 } : null)} className={inputCls} />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Btn variant="primary" onClick={() => handleUpdateProfile(p.id, { points_balance: editingProfile.points_balance, queue_position: editingProfile.queue_position })}><Check className="w-3 h-3" /> Save</Btn>
                                  <Btn variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Btn>
                                </div>
                              </div>
                            ) : (
                              <Btn variant="outline" onClick={() => setEditingProfile({ email: p.email, points_balance: p.points_balance, queue_position: p.queue_position })}><Edit2 className="w-3 h-3" /> Edit Profile</Btn>
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
                              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
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
              </TableCard>
            )}

            {/* ═══ GHOSTS ═══ */}
            {activeTab === "ghosts" && (
              <div className={cardCls}>
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Ghost className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-4xl font-bold text-foreground">{ghostCount}</p>
                  <p className="text-[12px] text-muted-foreground mt-2">Ghost users seeded in the waitlist queue</p>
                </div>
              </div>
            )}

            {/* ═══ ACTIVITY ═══ */}
            {activeTab === "activity" && (
              <TableCard>
                <div className="px-5 py-4 border-b border-border/30">
                  <h3 className="text-[13px] font-semibold text-foreground">Activity Log ({activities.length})</h3>
                </div>
                <TableHeader>
                  <span className="flex-1">User</span>
                  <span className="w-32">Action</span>
                  <span className="w-24 text-right">Positions</span>
                  <span className="w-28 text-right">Date</span>
                </TableHeader>
                <div className="max-h-[600px] overflow-y-auto">
                  {activities.map((a) => (
                    <TableRow key={a.id}>
                      <span className="flex-1 text-[12px] text-muted-foreground font-mono">{a.user_id.slice(0, 12)}...</span>
                      <span className="w-32 text-[12px] text-foreground capitalize">{a.action_type}</span>
                      <span className="w-24 text-right text-[12px] font-semibold text-primary">+{a.positions_moved}</span>
                      <span className="w-28 text-right text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                    </TableRow>
                  ))}
                  {activities.length === 0 && <div className="py-8 text-center text-muted-foreground text-[12px]">No activity yet</div>}
                </div>
              </TableCard>
            )}

            {/* ═══ GOALS ═══ */}
            {activeTab === "goals" && (
              <div className="space-y-6">
                <TableCard>
                  <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-foreground">Goal Categories</h3>
                    {Object.keys(editedGoals).length > 0 && (
                      <Btn variant="primary" onClick={handleSaveGoals} disabled={saving}><Save className="w-3 h-3" /> {saving ? "Saving..." : "Save All"}</Btn>
                    )}
                  </div>
                  <TableHeader>
                    <span className="w-32">Type</span>
                    <span className="w-32">Subcategory</span>
                    <span className="flex-1">Label</span>
                    <span className="w-28">Max Price</span>
                    <span className="w-12"></span>
                  </TableHeader>
                  {goalCategories.map((cat) => {
                    const edited = editedGoals[cat.id] || {};
                    return (
                      <div key={cat.id} className="px-5 py-3 border-b border-border/20 last:border-0">
                        <div className="flex items-center gap-4">
                          <input value={edited.goal_type ?? cat.goal_type} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], goal_type: e.target.value } }))} className={`w-32 ${inputCls}`} />
                          <input value={edited.subcategory ?? (cat.subcategory || "")} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], subcategory: e.target.value || null } }))} className={`w-32 ${inputCls}`} />
                          <input value={edited.label ?? cat.label} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], label: e.target.value } }))} className={`flex-1 ${inputCls}`} />
                          <input type="number" value={edited.max_price ?? cat.max_price} onChange={e => setEditedGoals(p => ({ ...p, [cat.id]: { ...p[cat.id], max_price: parseInt(e.target.value) || 0 } }))} className={`w-28 ${inputCls}`} />
                          <button onClick={() => handleDeleteGoal(cat.id)} className="w-12 flex justify-center text-destructive/60 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </TableCard>

                <div className={cardCls}>
                  <SectionHeader title="Add Goal Category" />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <input value={newGoal.goal_type} onChange={e => setNewGoal(p => ({ ...p, goal_type: e.target.value }))} placeholder="Type (e.g. education)" className={inputCls} />
                    <input value={newGoal.subcategory} onChange={e => setNewGoal(p => ({ ...p, subcategory: e.target.value }))} placeholder="Subcategory (optional)" className={inputCls} />
                    <input value={newGoal.label} onChange={e => setNewGoal(p => ({ ...p, label: e.target.value }))} placeholder="Label" className={inputCls} />
                    <input type="number" value={newGoal.max_price} onChange={e => setNewGoal(p => ({ ...p, max_price: parseInt(e.target.value) || 0 }))} placeholder="Max price" className={inputCls} />
                  </div>
                  <Btn variant="primary" onClick={handleCreateGoal}><Plus className="w-3 h-3" /> Add Goal</Btn>
                </div>
              </div>
            )}

            {/* ═══ DECISIONS ═══ */}
            {activeTab === "decisions" && (
              <div className="space-y-6">
                <div className={cardCls}>
                  <SectionHeader title="Add App to Checklist" />
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={newApp.app_name} onChange={e => setNewApp(p => ({ ...p, app_name: e.target.value }))} placeholder="App name" className={inputCls} />
                      <input value={newApp.app_logo_url} onChange={e => setNewApp(p => ({ ...p, app_logo_url: e.target.value }))} placeholder="Logo URL (optional)" className={inputCls} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Category</p>
                      <select value={newApp.category} onChange={e => setNewApp(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                        <option value="yes_no">Yes/No (Switch Offer)</option>
                        <option value="referral">Referral (Try It Out)</option>
                        <option value="robust">Robust (Advanced Switch)</option>
                      </select>
                    </div>
                    {(newApp.category === "yes_no" || newApp.category === "robust") && (
                      <>
                        <div className="grid grid-cols-3 gap-3">
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
                            <label key={ra.id} className="flex items-center gap-2 rounded-lg border border-border/40 p-2 cursor-pointer hover:bg-muted/30">
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
                    <Btn variant="primary" onClick={handleCreateDecisionApp}><Plus className="w-3 h-3" /> Add App</Btn>
                  </div>
                </div>

                {decisionApps.map(app => {
                  const appResponses = decisionResponses.filter(r => r.app_id === app.id);
                  const pendingApprovals = appResponses.filter(r => r.referral_screenshot_url && !r.referral_approved);
                  return (
                    <TableCard key={app.id}>
                      <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {app.app_logo_url ? (
                            <img src={app.app_logo_url} alt={app.app_name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">{app.app_name.charAt(0)}</div>
                          )}
                          <div>
                            <h4 className="font-semibold text-foreground text-[13px]">{app.app_name}</h4>
                            <p className="text-[10px] text-muted-foreground capitalize">{app.category === "yes_no" ? "Yes/No" : app.category === "referral" ? "Referral" : "Robust"} · {appResponses.length} responses</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={app.is_active ? "active" : "rejected"} />
                          <Btn variant="outline" onClick={() => handleToggleDecisionApp(app.id, app.is_active)}>{app.is_active ? "Deactivate" : "Activate"}</Btn>
                          <button onClick={() => handleDeleteDecisionApp(app.id)} className="text-destructive/60 hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      {app.category === "robust" && (app.switch_to_referral_app_ids || []).length > 0 && (
                        <div className="px-5 py-2 border-b border-border/20 text-[10px] text-primary">Linked: {(app.switch_to_referral_app_ids || []).map(id => decisionApps.find(a => a.id === id)?.app_name).filter(Boolean).join(", ")}</div>
                      )}
                      {pendingApprovals.length > 0 && (
                        <div className="p-4 space-y-2">
                          <p className="text-[11px] text-primary font-semibold mb-2">Pending Approvals ({pendingApprovals.length})</p>
                          {pendingApprovals.map(pr => {
                            const userEmail = profiles.find(p => p.id === pr.user_id)?.email || pr.user_id.slice(0, 8);
                            const screenshotUrl = getPublicScreenshotUrl(pr.referral_screenshot_url);
                            return (
                              <div key={pr.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                                <div>
                                  <span className="text-[11px] text-foreground">{userEmail}</span>
                                  {screenshotUrl && pr.referral_screenshot_url !== "pending_review" && (
                                    <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1 hover:underline mt-0.5"><ExternalLink className="w-2.5 h-2.5" /> Screenshot</a>
                                  )}
                                </div>
                                <Btn variant="primary" onClick={() => handleApproveReferral(pr.id, pr.app_id, pr.user_id)}><Check className="w-3 h-3" /> Approve</Btn>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TableCard>
                  );
                })}
              </div>
            )}

            {/* ═══ ANALYTICS ═══ */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard label="Total Responses" value={decisionResponses.length} icon={BarChart3} trend="up" trendLabel="All time" />
                  <MetricCard label="Has App" value={decisionResponses.filter(r => r.has_app).length} icon={CheckCircle2} />
                  <MetricCard label="Referrals Approved" value={decisionResponses.filter(r => r.referral_approved).length} icon={Check} />
                </div>
                <TableCard>
                  <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-foreground">Decision Analytics</h3>
                    <Btn variant="outline" onClick={downloadDecisionAnalytics}><Download className="w-3 h-3" /> Download CSV</Btn>
                  </div>
                  {decisionApps.map(app => {
                    const appResps = decisionResponses.filter(r => r.app_id === app.id);
                    const hasApp = appResps.filter(r => r.has_app).length;
                    const wouldSwitch = appResps.filter(r => r.would_switch === true).length;
                    const switched = appResps.filter(r => r.switch_completed).length;
                    const pct = appResps.length > 0 ? Math.round((hasApp / appResps.length) * 100) : 0;
                    return (
                      <div key={app.id} className="px-5 py-4 border-b border-border/20 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-foreground text-[13px]">{app.app_name}</p>
                          <span className="text-[10px] text-muted-foreground capitalize">{app.category}</span>
                        </div>
                        <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex gap-6 text-[11px]">
                          <span className="text-primary font-medium">{hasApp} selected ({pct}%)</span>
                          <span className="text-muted-foreground">{wouldSwitch} would switch</span>
                          <span className="text-muted-foreground">{switched} switched</span>
                          <span className="text-muted-foreground">{appResps.length} total</span>
                        </div>
                      </div>
                    );
                  })}
                </TableCard>
              </div>
            )}

            {/* ═══ VERIFICATION ═══ */}
            {activeTab === "verification" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard label="Verified" value={verificationTxs.filter(t => t.is_verified).length} icon={CheckCircle2} trend="up" trendLabel="Confirmed" />
                  <MetricCard label="Pending" value={verificationTxs.filter(t => !t.is_verified && !t.is_duplicate).length} icon={Activity} />
                  <MetricCard label="Duplicates" value={verificationTxs.filter(t => t.is_duplicate).length} icon={AlertTriangle} trend="down" trendLabel="Flagged" />
                </div>
                <div className={cardCls}>
                  <SectionHeader title="Upload Transaction CSV" subtitle="CSV columns: transaction_id, amount" />
                  <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  <Btn variant="primary" onClick={() => csvInputRef.current?.click()} disabled={csvUploading}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> {csvUploading ? "Processing..." : "Upload CSV"}
                  </Btn>
                </div>
                <TableCard>
                  <div className="px-5 py-4 border-b border-border/30">
                    <h3 className="text-[13px] font-semibold text-foreground">User Transactions</h3>
                  </div>
                  <TableHeader>
                    <span className="flex-1 min-w-0">User</span>
                    <span className="flex-1 min-w-0">Transaction ID</span>
                    <span className="w-24 shrink-0 text-right">Status</span>
                  </TableHeader>
                  <div className="max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {verificationTxs.map(tx => {
                      const userEmail = profiles.find(p => p.id === tx.user_id)?.email || tx.user_id.slice(0, 8);
                      return (
                        <TableRow key={tx.id} className={tx.is_duplicate ? "bg-destructive/5" : ""}>
                          <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">{userEmail}</span>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-[11px] font-mono text-foreground truncate">{tx.transaction_id}</p>
                            {tx.is_duplicate && <p className="text-[9px] text-destructive truncate">{tx.duplicate_note || 'Duplicate'}</p>}
                          </div>
                          <span className="w-24 shrink-0 flex justify-end">
                            {tx.is_duplicate ? (
                              <span className="flex items-center gap-1 text-destructive text-[10px]"><AlertTriangle className="w-3 h-3 shrink-0" /> Dup</span>
                            ) : tx.is_verified ? (
                              <span className="flex items-center gap-1 text-primary text-[10px]"><CheckCircle2 className="w-3 h-3 shrink-0" /> ₦{tx.verified_amount?.toLocaleString("en-NG")}</span>
                            ) : <span className="text-[10px] text-muted-foreground">Pending</span>}
                          </span>
                        </TableRow>
                      );
                    })}
                    {verificationTxs.length === 0 && <div className="py-8 text-center text-muted-foreground text-[12px]">No transactions submitted yet</div>}
                  </div>
                </TableCard>
              </div>
            )}

            {/* ═══ WARNINGS ═══ */}
            {activeTab === "warnings" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard label="Total Warnings" value={userWarnings.length} icon={AlertTriangle} trend="neutral" trendLabel="All time" />
                  <MetricCard label="Banned Users" value={bannedCount} icon={Ban} trend={bannedCount > 0 ? "down" : "neutral"} trendLabel={`of ${profiles.length}`} />
                  <MetricCard label="Dup TX IDs" value={verificationTxs.filter(t => t.is_duplicate).length} icon={Activity} />
                </div>

                {/* Duplicate TX Users */}
                {(() => {
                  const dupTxs = verificationTxs.filter(t => t.is_duplicate);
                  const dupUserIds = [...new Set(dupTxs.map(t => t.user_id))];
                  if (dupUserIds.length === 0) return null;
                  return (
                    <TableCard>
                      <div className="px-5 py-4 border-b border-border/30">
                        <h3 className="text-[13px] font-semibold text-foreground">🚩 Users with Duplicate Transaction IDs</h3>
                      </div>
                      {dupUserIds.map(uid => {
                        const prof = profiles.find(p => p.id === uid);
                        const userDups = dupTxs.filter(t => t.user_id === uid);
                        return (
                          <div key={uid} className="px-5 py-4 border-b border-border/20 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-[12px] font-semibold text-foreground">{prof?.email || uid.slice(0, 8)}</p>
                                <p className="text-[10px] text-muted-foreground">Queue: #{prof?.queue_position} • Points: {prof?.points_balance} • Spend: {formatNaira(prof?.total_annual_spend || 0)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {prof?.is_banned && <StatusBadge status="BANNED" />}
                                <span className="text-[10px] bg-destructive/10 text-destructive px-2.5 py-1 rounded-full border border-destructive/20 font-medium">{userDups.length} dup{userDups.length > 1 ? "s" : ""}</span>
                              </div>
                            </div>
                            <div className="space-y-1 mb-3">
                              {userDups.map(dt => (
                                <div key={dt.id} className="flex items-center justify-between text-[10px] bg-muted/30 rounded-lg px-3 py-2">
                                  <span className="text-foreground font-mono">{dt.transaction_id}</span>
                                  <span className="text-muted-foreground">{dt.duplicate_note || "Duplicate"}</span>
                                </div>
                              ))}
                            </div>
                            {prof && !prof.is_banned && (
                              <Btn variant="destructive" onClick={async () => {
                                await supabase.from("profiles").update({ is_banned: true, ban_reason: "Duplicate transaction IDs in spend verification" }).eq("id", uid);
                                await sendNotification({ userId: uid, type: "warning", title: "Account Banned", message: "Your account has been banned due to duplicate transaction IDs." });
                                toast({ title: "User banned" });
                                await fetchData();
                              }}><Ban className="w-3 h-3" /> Ban User</Btn>
                            )}
                          </div>
                        );
                      })}
                    </TableCard>
                  );
                })()}

                <TableCard>
                  <div className="px-5 py-4 border-b border-border/30">
                    <h3 className="text-[13px] font-semibold text-foreground">Warning History</h3>
                  </div>
                  <TableHeader>
                    <span className="flex-1">User</span>
                    <span className="flex-[2]">Reason</span>
                    <span className="w-28 text-right">Date</span>
                  </TableHeader>
                  <div className="max-h-[400px] overflow-y-auto">
                    {userWarnings.map(w => {
                      const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id.slice(0, 8);
                      return (
                        <TableRow key={w.id}>
                          <span className="flex-1 text-[12px] font-medium text-foreground">{userEmail}</span>
                          <span className="flex-[2] text-[11px] text-muted-foreground">{w.reason}</span>
                          <span className="w-28 text-right text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</span>
                        </TableRow>
                      );
                    })}
                    {userWarnings.length === 0 && <div className="py-8 text-center text-muted-foreground text-[12px]">No warnings issued yet</div>}
                  </div>
                </TableCard>
              </div>
            )}

            {/* ═══ INFLUENCER APPS ═══ */}
            {activeTab === "inf_apps" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard label="Pending" value={infApps.filter(a => a.status === "pending_review").length} icon={Activity} trend="neutral" trendLabel="Awaiting review" />
                  <MetricCard label="Approved" value={infApps.filter(a => a.status === "approved").length} icon={CheckCircle2} />
                  <MetricCard label="Rejected" value={infApps.filter(a => a.status === "rejected").length} icon={X} />
                </div>
                <TableCard>
                  <div className="px-5 py-4 border-b border-border/30">
                    <h3 className="text-[13px] font-semibold text-foreground">Applications</h3>
                  </div>
                  {infApps.map((app: any) => {
                    const userEmail = profiles.find(p => p.id === app.user_id)?.email || app.user_id?.slice(0, 8);
                    return (
                      <div key={app.id} className="px-5 py-4 border-b border-border/20 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                            <a href={app.social_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-2.5 h-2.5" /> {app.social_link}</a>
                          </div>
                          <StatusBadge status={app.status} />
                        </div>
                        {(app.status === "pending_review" || app.status === "pending_appeal") && (
                          <div className="flex gap-2 mt-2">
                            {app.status === "pending_appeal" && <p className="text-[10px] text-primary w-full mb-1">⚡ Appeal</p>}
                            <Btn variant="primary" onClick={async () => {
                              await supabase.from("influencer_applications" as any).update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", app.id);
                              await supabase.from("profiles").update({ queue_position: 0, off_queue_at: new Date().toISOString() }).eq("id", app.user_id);
                              await sendNotification({ userId: app.user_id, type: "influencer_approved", title: "Influencer Application Approved!", message: "Congratulations! Your influencer application has been approved." });
                              toast({ title: "Application approved" }); await fetchData();
                            }} className="flex-1"><Check className="w-3 h-3" /> Approve</Btn>
                            <Btn variant="outline" onClick={async () => {
                              const newStatus = app.status === "pending_appeal" ? "appeal_rejected" : "rejected";
                              await supabase.from("influencer_applications" as any).update({ status: newStatus, reviewed_at: new Date().toISOString() }).eq("id", app.id);
                              await sendNotification({ userId: app.user_id, type: "influencer_rejected", title: "Influencer Application Update", message: app.status === "pending_appeal" ? "Your appeal has been reviewed and was not approved." : "Your influencer application was not approved." });
                              toast({ title: app.status === "pending_appeal" ? "Appeal rejected" : "Application rejected" }); await fetchData();
                            }} className="flex-1">Reject</Btn>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {infApps.length === 0 && <div className="py-8 text-center text-muted-foreground text-[12px]">No applications yet</div>}
                </TableCard>
              </div>
            )}

            {/* ═══ INF WALLETS ═══ */}
            {activeTab === "inf_wallets" && (
              <TableCard>
                <div className="px-5 py-4 border-b border-border/30">
                  <h3 className="text-[13px] font-semibold text-foreground">Influencer Wallet Activations</h3>
                </div>
                {infWallets.map((w: any) => {
                  const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id?.slice(0, 8);
                  const bank = infBankAccounts.find((b: any) => b.user_id === w.user_id);
                  return (
                    <div key={w.id} className="px-5 py-4 border-b border-border/20 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                          {bank && <p className="text-[10px] text-muted-foreground">{bank.bank_name} · {bank.account_number} · {bank.account_name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground">{formatNaira(w.balance || 0)}</span>
                          <StatusBadge status={w.status} />
                        </div>
                      </div>
                      {bank?.id_document_url && (
                        <button onClick={async () => {
                          const { data, error } = await supabase.storage.from("id-documents").createSignedUrl(bank.id_document_url!, 3600);
                          if (error || !data?.signedUrl) { alert("Failed to load document"); return; }
                          window.open(data.signedUrl, "_blank");
                        }} className="text-primary hover:underline text-[10px] flex items-center gap-1 mb-2"><ExternalLink className="w-2.5 h-2.5" /> View ID Document</button>
                      )}
                      {w.status === "pending_activation" && (
                        <div className="flex gap-2 mt-1">
                          <Btn variant="primary" onClick={async () => {
                            await supabase.from("influencer_wallets" as any).update({ status: "active" }).eq("id", w.id);
                            if (bank) await supabase.from("influencer_bank_accounts" as any).update({ verification_status: "verified" }).eq("id", bank.id);
                            await sendNotification({ userId: w.user_id, type: "wallet_activated", title: "Wallet Activated!", message: "Your influencer wallet has been activated." });
                            toast({ title: "Wallet activated" }); await fetchData();
                          }} className="flex-1"><Check className="w-3 h-3" /> Approve</Btn>
                          <Btn variant="outline" onClick={async () => {
                            await supabase.from("influencer_wallets" as any).update({ status: "rejected" }).eq("id", w.id);
                            await sendNotification({ userId: w.user_id, type: "rejection", title: "Wallet Activation Rejected", message: "Your wallet activation request has been rejected." });
                            toast({ title: "Wallet rejected" }); await fetchData();
                          }} className="flex-1">Reject</Btn>
                        </div>
                      )}
                    </div>
                  );
                })}
                {infWallets.length === 0 && <div className="py-8 text-center text-muted-foreground text-[12px]">No wallet activations yet</div>}
              </TableCard>
            )}

            {/* ═══ INF REFERRALS ═══ */}
            {activeTab === "inf_referrals" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard label="Total Referrals" value={infReferrals.length} icon={Users} trend="up" trendLabel="All time" />
                  <MetricCard label="Total Earnings" value={formatNaira(infReferrals.reduce((s: number, r: any) => s + (r.reward_amount || 0), 0))} icon={Wallet} />
                </div>
                <TableCard>
                  <div className="px-5 py-4 border-b border-border/30">
                    <h3 className="text-[13px] font-semibold text-foreground">Referral History</h3>
                  </div>
                  <TableHeader>
                    <span className="flex-1 min-w-0">Influencer → Referred</span>
                    <span className="w-20 shrink-0 text-right">Reward</span>
                    <span className="w-24 shrink-0 text-right">Date</span>
                  </TableHeader>
                  <div className="max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {infReferrals.map((r: any) => {
                      const infEmail = profiles.find(p => p.id === r.influencer_id)?.email || r.influencer_id?.slice(0, 8);
                      const refEmail = profiles.find(p => p.id === r.referred_user_id)?.email || r.referred_user_id?.slice(0, 8);
                      return (
                        <TableRow key={r.id}>
                          <span className="flex-1 min-w-0 text-[11px] text-foreground truncate">{infEmail} → {refEmail}</span>
                          <span className="w-20 shrink-0 text-right text-[11px] text-primary font-semibold">{formatNaira(r.reward_amount)}</span>
                          <span className="w-24 shrink-0 text-right text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                        </TableRow>
                      );
                    })}
                    {infReferrals.length === 0 && <div className="py-8 text-center text-muted-foreground text-[12px]">No influencer referrals yet</div>}
                  </div>
                </TableCard>
              </div>
            )}

            {/* ═══ INF WITHDRAWALS ═══ */}
            {activeTab === "inf_withdrawals" && (
              <TableCard>
                <div className="px-5 py-4 border-b border-border/30">
                  <h3 className="text-[13px] font-semibold text-foreground">Influencer Withdrawals</h3>
                </div>
                {infWithdrawals.map((w: any) => {
                  const userEmail = profiles.find(p => p.id === w.user_id)?.email || w.user_id?.slice(0, 8);
                  const bank = infBankAccounts.find((b: any) => b.id === w.bank_account_id);
                  return (
                    <div key={w.id} className="px-5 py-4 border-b border-border/20 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-[12px] font-semibold text-foreground">{userEmail}</p>
                          {bank && <p className="text-[10px] text-muted-foreground">{bank.bank_name} · {bank.account_number} · {bank.account_name}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[14px] font-bold text-primary">{formatNaira(w.amount)}</p>
                          <StatusBadge status={w.status} />
                        </div>
                      </div>
                      {w.status === "pending" && (
                        <div className="flex gap-2 mt-3">
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
                {infWithdrawals.length === 0 && <div className="py-8 text-center text-muted-foreground text-[12px]">No withdrawals yet</div>}
              </TableCard>
            )}

            {/* ═══ INF CHALLENGES ═══ */}
            {activeTab === "inf_challenges" && (
              <div className="space-y-6">
                <div className={cardCls}>
                  <SectionHeader title="Create Challenge" />
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={newChallenge.title} onChange={e => setNewChallenge(p => ({ ...p, title: e.target.value }))} placeholder="Challenge title" className={inputCls} />
                      <input value={newChallenge.hashtag} onChange={e => setNewChallenge(p => ({ ...p, hashtag: e.target.value }))} placeholder="Hashtag" className={inputCls} />
                    </div>
                    <textarea value={newChallenge.description} onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))} placeholder="Description" className={`${inputCls} min-h-[60px] resize-none`} />
                    <textarea value={newChallenge.instructions} onChange={e => setNewChallenge(p => ({ ...p, instructions: e.target.value }))} placeholder="Instructions" className={`${inputCls} min-h-[60px] resize-none`} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Challenge Type</p>
                        <select value={newChallenge.challenge_type} onChange={e => setNewChallenge(p => ({ ...p, challenge_type: e.target.value, total_videos: e.target.value === "single" ? 1 : p.total_videos }))} className={inputCls}>
                          <option value="single">Single Video</option>
                          <option value="set">Set (Multiple Videos)</option>
                        </select>
                      </div>
                      <div><p className="text-[10px] text-muted-foreground mb-1">Reward per video (₦)</p><input type="number" value={newChallenge.reward_per_video} onChange={e => setNewChallenge(p => ({ ...p, reward_per_video: parseInt(e.target.value) || 0 }))} className={inputCls} /></div>
                    </div>
                    {newChallenge.challenge_type === "set" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[10px] text-muted-foreground mb-1">Total Videos</p><input type="number" value={newChallenge.total_videos} onChange={e => setNewChallenge(p => ({ ...p, total_videos: parseInt(e.target.value) || 1 }))} min={2} className={inputCls} /></div>
                        <div><p className="text-[10px] text-muted-foreground mb-1">Post interval (days)</p><input type="number" value={newChallenge.posting_interval_days} onChange={e => setNewChallenge(p => ({ ...p, posting_interval_days: parseInt(e.target.value) || 1 }))} min={1} className={inputCls} /></div>
                      </div>
                    )}
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
                    }}><Plus className="w-3 h-3" /> Create Challenge</Btn>
                  </div>
                </div>

                {infChallenges.map((ch: any) => {
                  const enrollments = infChallengeEnrollments.filter((e: any) => e.challenge_id === ch.id);
                  const submissions = infChallengeSubmissions.filter((s: any) => s.challenge_id === ch.id);
                  const pendingSubs = submissions.filter((s: any) => s.status === "pending_review");
                  return (
                    <TableCard key={ch.id}>
                      <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground text-[13px]">{ch.title}</h4>
                          <p className="text-[10px] text-muted-foreground">
                            {ch.challenge_type === "single" ? "Single Video" : `Set of ${ch.total_videos}`} · {formatNaira(ch.reward_per_video)}/video · {ch.hashtag}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={ch.is_active ? "active" : "rejected"} />
                          <Btn variant="outline" onClick={async () => {
                            await supabase.from("influencer_challenges" as any).update({ is_active: !ch.is_active } as any).eq("id", ch.id);
                            await fetchData();
                          }}>{ch.is_active ? "Deactivate" : "Activate"}</Btn>
                          <button onClick={async () => {
                            await supabase.from("influencer_challenges" as any).delete().eq("id", ch.id);
                            toast({ title: "Challenge deleted" }); await fetchData();
                          }} className="text-destructive/60 hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="px-5 py-3 border-b border-border/20">
                        <p className="text-[11px] text-muted-foreground">{ch.description}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 p-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{enrollments.length}</p>
                          <p className="text-[10px] text-muted-foreground">Enrolled</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{submissions.length}</p>
                          <p className="text-[10px] text-muted-foreground">Submissions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-primary">{pendingSubs.length}</p>
                          <p className="text-[10px] text-muted-foreground">Pending</p>
                        </div>
                      </div>
                      {pendingSubs.length > 0 && (
                        <div className="p-4 border-t border-border/20 space-y-2">
                          <p className="text-[11px] text-primary font-semibold">Pending Approvals</p>
                          {pendingSubs.map((sub: any) => {
                            const userEmail = profiles.find(p => p.id === sub.user_id)?.email || sub.user_id?.slice(0, 8);
                            const enrollment = enrollments.find((e: any) => e.user_id === sub.user_id);
                            return (
                              <div key={sub.id} className="rounded-lg border border-border/40 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="text-[11px] text-foreground font-semibold">{userEmail}</p>
                                    <p className="text-[9px] text-muted-foreground">Video #{sub.video_number} of {ch.total_videos}</p>
                                  </div>
                                  <a href={sub.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-2.5 h-2.5" /> View</a>
                                </div>
                                <div className="flex gap-2">
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
                    </TableCard>
                  );
                })}
                {infChallenges.length === 0 && <div className={cardCls}><p className="text-center py-8 text-muted-foreground text-[12px]">No challenges created yet</p></div>}
              </div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {activeTab === "settings" && (
              <div className={cardCls}>
                <SectionHeader title="App Settings" subtitle="Configure platform-wide settings" />
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                    <div>
                      <label className="text-[12px] font-medium text-foreground">Verify Page Active</label>
                      <p className="text-[11px] text-muted-foreground">If disabled, users will see "Coming Soon".</p>
                    </div>
                    <input type="checkbox" checked={verifyPageActive} onChange={e => setVerifyPageActive(e.target.checked)} className="w-5 h-5 accent-primary cursor-pointer rounded" />
                  </div>
                  <p className="text-[12px] font-medium text-foreground">Per-Category Verification Toggles</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: "data", label: "Data", state: verifyDataActive, setter: setVerifyDataActive },
                      { key: "electricity", label: "Electricity", state: verifyElectricityActive, setter: setVerifyElectricityActive },
                      { key: "food", label: "Food", state: verifyFoodActive, setter: setVerifyFoodActive },
                      { key: "transport", label: "Transport", state: verifyTransportActive, setter: setVerifyTransportActive },
                    ] as const).map(item => (
                      <div key={item.key} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                        <label className="text-[11px] font-medium text-foreground">{item.label}</label>
                        <input type="checkbox" checked={item.state} onChange={e => item.setter(e.target.checked)} className="w-4 h-4 accent-primary cursor-pointer rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[11px] text-muted-foreground font-medium">Verify Expense Button Link</label><input value={verifyExpenseLink} onChange={e => setVerifyExpenseLink(e.target.value)} placeholder="https://..." className={`${inputCls} mt-1.5`} /></div>
                    <div><label className="text-[11px] text-muted-foreground font-medium">Post-Queue Referral Points</label><input type="number" value={postQueueReferralPoints} onChange={e => setPostQueueReferralPoints(e.target.value)} className={`${inputCls} mt-1.5`} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[11px] text-muted-foreground font-medium">Verify Spend Link</label><input value={verifySpendLink} onChange={e => setVerifySpendLink(e.target.value)} placeholder="https://..." className={`${inputCls} mt-1.5`} /></div>
                    <div><label className="text-[11px] text-muted-foreground font-medium">Verify Spend Description</label><textarea value={verifySpendDescription} onChange={e => setVerifySpendDescription(e.target.value)} className={`${inputCls} mt-1.5 min-h-[60px] resize-none`} /></div>
                  </div>
                  <hr className="border-border/30" />
                  <h4 className="text-[13px] font-semibold text-foreground">Footer Content</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div><label className="text-[11px] text-muted-foreground font-medium">About Us</label><textarea value={footerAboutUs} onChange={e => setFooterAboutUs(e.target.value)} className={`${inputCls} mt-1.5 min-h-[80px] resize-none`} /></div>
                    <div><label className="text-[11px] text-muted-foreground font-medium">Contact Us</label><textarea value={footerContactUs} onChange={e => setFooterContactUs(e.target.value)} className={`${inputCls} mt-1.5 min-h-[80px] resize-none`} /></div>
                    <div><label className="text-[11px] text-muted-foreground font-medium">Invest With Us</label><textarea value={footerInvestWithUs} onChange={e => setFooterInvestWithUs(e.target.value)} className={`${inputCls} mt-1.5 min-h-[80px] resize-none`} /></div>
                  </div>
                  <hr className="border-border/30" />
                  <h4 className="text-[13px] font-semibold text-foreground">Currency Exchange Rates</h4>
                  <p className="text-[11px] text-muted-foreground -mt-3">Set how many Naira (₦) equals 1 unit of each currency. Users see amounts in their local currency based on geolocation.</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">1 USD = ₦</label>
                      <input type="number" value={currencyRateUsd} onChange={e => setCurrencyRateUsd(e.target.value)} placeholder="1600" className={`${inputCls} mt-1.5`} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">1 EUR = ₦</label>
                      <input type="number" value={currencyRateEur} onChange={e => setCurrencyRateEur(e.target.value)} placeholder="1700" className={`${inputCls} mt-1.5`} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">1 GBP = ₦</label>
                      <input type="number" value={currencyRateGbp} onChange={e => setCurrencyRateGbp(e.target.value)} placeholder="2000" className={`${inputCls} mt-1.5`} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Geolocation mapping: Nigeria → ₦, USA → $, UK → £, Europe → €, Others → $</p>
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
