import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ShieldCheck, Clock, ExternalLink, CheckCircle2, AlertCircle, Zap, Wifi, UtensilsCrossed, Car, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface Verification {
  id: string;
  frequency: string;
  spend_type: string;
  verification_link: string;
  verification_description: string;
  started_at: string;
  ends_at: string;
  status: string;
  recalculated_amount: number | null;
}

interface Transaction {
  id: string;
  verification_id: string;
  transaction_id: string;
  submitted_at: string;
  is_verified: boolean;
  verified_amount: number | null;
  is_duplicate: boolean;
  duplicate_note: string | null;
  edit_count: number;
}

type SpendType = "data" | "electricity" | "food" | "transport";

const spendMeta: Record<SpendType, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  data: { label: "Data", icon: <Wifi className="w-4 h-4" />, color: "text-primary", description: "Mobile data & internet subscriptions" },
  electricity: { label: "Electricity", icon: <Zap className="w-4 h-4" />, color: "text-primary", description: "Power & electricity bills" },
  food: { label: "Food", icon: <UtensilsCrossed className="w-4 h-4" />, color: "text-primary", description: "Groceries & food purchases" },
  transport: { label: "Transport", icon: <Car className="w-4 h-4" />, color: "text-primary", description: "Transportation & fuel costs" },
};

const VerifySpendFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { formatCurrency } = useCurrency();
  const [verifications, setVerifications] = useState<Record<SpendType, Verification | null>>({
    data: null, electricity: null, food: null, transport: null,
  });
  const [transactions, setTransactions] = useState<Record<SpendType, Transaction[]>>({
    data: [], electricity: [], food: [], transport: [],
  });
  const [txInputs, setTxInputs] = useState<Record<SpendType, string[]>>({
    data: [], electricity: [""], food: [""], transport: [""],
  });
  const [submitting, setSubmitting] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [verifySettings, setVerifySettings] = useState({ link: "", description: "" });
  const [starting, setStarting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SpendType | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [categoryToggles, setCategoryToggles] = useState<Record<SpendType, boolean>>({
    data: true, electricity: true, food: true, transport: true,
  });

  const allTypes: SpendType[] = ["data", "electricity", "food", "transport"];

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [dataRes, elecRes, foodRes, transRes, settingsRes] = await Promise.all([
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "data").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "electricity").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "food").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "transport").order("created_at", { ascending: false }).limit(1),
      supabase.from("admin_settings").select("*"),
    ]);

    const results: Record<SpendType, any[]> = {
      data: dataRes.data || [], electricity: elecRes.data || [],
      food: foodRes.data || [], transport: transRes.data || [],
    };

    const newVerifications: Record<SpendType, Verification | null> = { data: null, electricity: null, food: null, transport: null };
    const newTransactions: Record<SpendType, Transaction[]> = { data: [], electricity: [], food: [], transport: [] };
    const newTxInputs: Record<SpendType, string[]> = { data: [], electricity: [""], food: [""], transport: [""] };

    for (const type of allTypes) {
      const v = results[type][0] as Verification | undefined;
      if (v) {
        newVerifications[type] = v;
        const { data: txs } = await supabase.from("verification_transactions").select("*").eq("verification_id", v.id).order("submitted_at", { ascending: true });
        const txList = (txs || []) as Transaction[];
        newTransactions[type] = txList;
        const isMonthlyType = type === "electricity" || type === "food" || type === "transport";
        const maxBoxes = isMonthlyType ? 1 : getMaxBoxes(v.frequency);
        const filled = txList.map(t => t.transaction_id);
        newTxInputs[type] = Array.from({ length: maxBoxes }, (_, i) => filled[i] || "");
      }
    }

    setVerifications(newVerifications);
    setTransactions(newTransactions);
    setTxInputs(newTxInputs);

    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    setVerifySettings({
      link: settings.find(s => s.key === "verify_spend_link")?.value || "",
      description: settings.find(s => s.key === "verify_spend_description")?.value || "Verify your spend by completing the action at the link below.",
    });
    setCategoryToggles({
      data: settings.find(s => s.key === "verify_data_active")?.value !== "false",
      electricity: settings.find(s => s.key === "verify_electricity_active")?.value !== "false",
      food: settings.find(s => s.key === "verify_food_active")?.value !== "false",
      transport: settings.find(s => s.key === "verify_transport_active")?.value !== "false",
    });
  };

  const getMaxBoxes = (freq: string) => freq === "daily" ? 30 : freq === "weekly" ? 4 : 1;
  const getMultiplier = (freq: string) => freq === "daily" ? 12 : freq === "weekly" ? 13 : 12;

  const handleStartVerification = async (type: SpendType) => {
    if (!user) return;
    setStarting(true);
    const isMonthlyType = type === "electricity" || type === "food" || type === "transport";
    const freq = isMonthlyType ? "monthly" : frequency;
    const days = freq === "daily" ? 30 : freq === "weekly" ? 28 : 1;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + days);
    await supabase.from("spend_verifications").insert({
      user_id: user.id, frequency: freq, spend_type: type,
      verification_link: verifySettings.link, verification_description: verifySettings.description,
      ends_at: endsAt.toISOString(),
    } as any);
    toast({ title: `${spendMeta[type].label} verification started!` });
    setStarting(false);
    await fetchData();
  };

  const handleSubmitTx = async (index: number, type: SpendType) => {
    const inputs = txInputs[type];
    const txs = transactions[type];
    const verification = verifications[type];
    const txId = inputs[index]?.trim();
    if (!txId || !verification || !user) return;
    if (txs[index]) { toast({ title: "Already submitted" }); return; }
    setSubmitting(true);
    const { data: dupCheck } = await supabase.from("verification_transactions").select("id").eq("transaction_id", txId).limit(1);
    const isDuplicate = (dupCheck || []).length > 0;
    await supabase.from("verification_transactions").insert({
      verification_id: verification.id, user_id: user.id, transaction_id: txId,
      is_duplicate: isDuplicate, duplicate_note: isDuplicate ? "Duplicate detected on initial submission" : null,
    });
    if (isDuplicate) {
      toast({ title: "Duplicate Transaction ID", description: "You can edit it once — a second duplicate will result in a ban.", variant: "destructive" });
    } else {
      toast({ title: "Transaction ID submitted" });
    }
    setSubmitting(false);
    await fetchData();
    await refreshProfile();
  };

  const handleEditDuplicateTx = async (tx: Transaction) => {
    const newTxId = editValue.trim();
    if (!newTxId || !user) return;
    setSubmitting(true);
    const { data: dupCheck } = await supabase.from("verification_transactions").select("id").eq("transaction_id", newTxId).neq("id", tx.id).limit(1);
    const isStillDuplicate = (dupCheck || []).length > 0;
    if (isStillDuplicate) {
      await supabase.from("verification_transactions").update({
        transaction_id: newTxId, edit_count: (tx.edit_count || 0) + 1,
        is_duplicate: true, duplicate_note: "Second duplicate — auto-banned",
      } as any).eq("id", tx.id);
      await supabase.from("profiles").update({ is_banned: true, ban_reason: "Submitted duplicate transaction IDs twice during spend verification" }).eq("id", user.id);
      await supabase.from("user_warnings").insert({ user_id: user.id, reason: "Auto-banned: submitted duplicate transaction ID twice (original: " + tx.transaction_id + ", edit: " + newTxId + ")", issued_by: user.id } as any);
      toast({ title: "Account Banned", description: "Your account has been banned for submitting duplicate transaction IDs twice.", variant: "destructive" });
    } else {
      await supabase.from("verification_transactions").update({
        transaction_id: newTxId, edit_count: (tx.edit_count || 0) + 1,
        is_duplicate: false, duplicate_note: "Edited from duplicate: " + tx.transaction_id,
      } as any).eq("id", tx.id);
      toast({ title: "Transaction ID updated" });
    }
    setEditingTxId(null);
    setEditValue("");
    setSubmitting(false);
    await fetchData();
    await refreshProfile();
  };

  const isOffQueue = (profile?.queue_position ?? 999) <= 0;
  if (!isOffQueue || !user) return null;

  const isComplete = (type: SpendType) => {
    const v = verifications[type];
    return v?.status === "completed" || v?.status === "verified";
  };
  const getVerifiedTxs = (type: SpendType) => transactions[type].filter(t => t.is_verified);
  const getAnnualSpend = (type: SpendType) => {
    const v = verifications[type];
    const vTxs = getVerifiedTxs(type);
    if (!v) return 0;
    const isMonthlyType = type === "electricity" || type === "food" || type === "transport";
    if (isMonthlyType) return vTxs.length > 0 ? Number(vTxs[0].verified_amount || 0) * 12 : 0;
    return v.frequency === "monthly"
      ? (vTxs.length > 0 ? Number(vTxs[0].verified_amount || 0) * 12 : 0)
      : vTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0) * getMultiplier(v.frequency);
  };

  const activeTypes = allTypes.filter(t => categoryToggles[t]);
  const completedCount = activeTypes.filter(t => isComplete(t)).length;
  const allComplete = completedCount === activeTypes.length && activeTypes.length > 0;
  const totalVerifiedAnnualSpend = allTypes.reduce((s, t) => s + getAnnualSpend(t), 0);
  const overallProgress = activeTypes.length > 0 ? (completedCount / activeTypes.length) * 100 : 0;

  const getStatus = (type: SpendType): "completed" | "in_progress" | "not_started" => {
    if (isComplete(type)) return "completed";
    if (verifications[type]) return "in_progress";
    return "not_started";
  };

  const statusConfig = {
    completed: { label: "Verified", badgeClass: "bg-primary/10 text-primary border-primary/20" },
    in_progress: { label: "In Progress", badgeClass: "bg-accent/10 text-accent border-accent/20" },
    not_started: { label: "Not Started", badgeClass: "bg-muted text-muted-foreground border-border" },
  };

  // All complete view
  if (allComplete) {
    return (
      <GlassCard variant="strong" className="space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-[13px]">Spend Verified</h3>
            <p className="text-[11px] text-muted-foreground">All categories verified</p>
          </div>
        </div>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-5 text-center border border-primary/20">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>
          <p className="font-semibold text-foreground text-[14px]">Verification Complete!</p>
          <p className="text-[13px] text-primary font-semibold mt-1">
            {formatCurrency(totalVerifiedAnnualSpend)}
          </p>
          <p className="text-[11px] text-muted-foreground">Total Verified Annual Spend</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {allTypes.map(t => {
              const spend = getAnnualSpend(t);
              if (spend <= 0) return null;
              return (
                <div key={t} className="glass rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                    {spendMeta[t].icon}
                    <span className="text-[10px]">{spendMeta[t].label}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-foreground">{formatCurrency(spend)}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </GlassCard>
    );
  }

  // Detail view for a selected category
  if (selectedCategory) {
    const type = selectedCategory;
    const meta = spendMeta[type];
    const verification = verifications[type];
    const txs = transactions[type];
    const inputs = txInputs[type];
    const complete = isComplete(type);
    const verifiedTxs = getVerifiedTxs(type);
    const annualSpend = getAnnualSpend(type);
    const isMonthlyType = type !== "data";

    return (
      <GlassCard variant="strong" className="space-y-4">
        {/* Back header */}
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[12px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to categories
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {meta.icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-[14px]">{meta.label} Verification</h3>
            <p className="text-[11px] text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        {complete ? (
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass rounded-2xl p-5 text-center border border-primary/20">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-semibold text-foreground text-[13px]">{meta.label} Verified!</p>
            {verification?.recalculated_amount != null && (
              <p className="text-[12px] text-primary mt-1 font-semibold">
                Annual: {formatCurrency(verification.recalculated_amount)}
              </p>
            )}
          </motion.div>
        ) : !verification ? (
          <div className="space-y-4">
            {verifySettings.description && (
              <div className="glass rounded-xl p-4 border border-border">
                <p className="text-[12px] text-foreground leading-relaxed">{verifySettings.description}</p>
              </div>
            )}

            {verifySettings.link && (
              <a href={verifySettings.link} target="_blank" rel="noopener noreferrer" className="block">
                <div className="glass rounded-xl p-3.5 flex items-center justify-between hover:border-primary/30 transition-colors border border-border">
                  <div className="flex items-center gap-2.5">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    <span className="text-[12px] text-foreground font-medium">Open verification link</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </a>
            )}

            {type === "data" && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-muted-foreground font-medium">How often do you buy data?</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["daily", "weekly", "monthly"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={`glass rounded-xl py-3 text-[12px] capitalize font-medium transition-all border ${
                        frequency === f
                          ? "border-primary text-primary bg-primary/5"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {frequency === "daily" && "Submit 30 transaction IDs (sum × 12 = annual)"}
                  {frequency === "weekly" && "Submit 4 transaction IDs (sum × 13 = annual)"}
                  {frequency === "monthly" && "Submit 1 transaction ID (amount × 12 = annual)"}
                </p>
              </div>
            )}

            {isMonthlyType && (
              <div className="glass rounded-xl p-3 border border-border">
                <p className="text-[11px] text-muted-foreground">
                  Submit 1 transaction ID — your monthly amount will be multiplied by 12 to estimate your annual spend.
                </p>
              </div>
            )}

            <GlassButton variant="primary" className="w-full text-[13px] py-3.5" onClick={() => handleStartVerification(type)} disabled={starting}>
              {starting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...</span>
              ) : (
                `Start Verification`
              )}
            </GlassButton>
          </div>
        ) : (
          <VerificationActivePanel
            type={type}
            verification={verification}
            transactions={txs}
            txInputs={inputs}
            setTxInputs={(v) => setTxInputs(prev => ({ ...prev, [type]: v }))}
            verifiedTxs={verifiedTxs}
            annualSpend={annualSpend}
            submitting={submitting}
            editingTxId={editingTxId}
            editValue={editValue}
            setEditingTxId={setEditingTxId}
            setEditValue={setEditValue}
            onSubmitTx={(idx) => handleSubmitTx(idx, type)}
            onEditTx={handleEditDuplicateTx}
            getMaxBoxes={type === "data" ? getMaxBoxes : () => 1}
            getMultiplier={type === "data" ? getMultiplier : () => 12}
            isMonthlyType={isMonthlyType}
          />
        )}
      </GlassCard>
    );
  }

  // Main overview
  return (
    <GlassCard variant="strong" className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-[13px]">Verify Your Spend</h3>
          <p className="text-[11px] text-muted-foreground">
            {completedCount}/{activeTypes.length} categories verified
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="space-y-2">
        <Progress value={overallProgress} className="h-1.5 bg-muted" />
        <p className="text-[10px] text-muted-foreground">
          Complete all categories to unlock full spend verification
        </p>
      </div>

      {/* Category cards */}
      <div className="space-y-2">
        {activeTypes.map((type, idx) => {
          const meta = spendMeta[type];
          const status = getStatus(type);
          const config = statusConfig[status];
          const annualSpend = getAnnualSpend(type);

          return (
            <motion.button
              key={type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedCategory(type)}
              className="w-full glass rounded-xl p-3.5 flex items-center gap-3 hover:border-primary/20 transition-all border border-transparent text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                {status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <span className="text-primary">{meta.icon}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-foreground">{meta.label}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${config.badgeClass}`}>
                    {config.label}
                  </span>
                </div>
                {status === "completed" && annualSpend > 0 ? (
                  <p className="text-[11px] text-primary font-medium mt-0.5">
                    {formatCurrency(annualSpend)}/yr verified
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{meta.description}</p>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {completedCount < activeTypes.length && (
        <div className="glass rounded-xl p-3 border border-destructive/10">
          <p className="text-[10px] text-destructive/80 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            All active categories must be verified for spend verification to be complete.
          </p>
        </div>
      )}
    </GlassCard>
  );
};

/* ── Active verification panel (transaction ID submission) ── */
interface ActivePanelProps {
  type: SpendType;
  verification: Verification;
  transactions: Transaction[];
  txInputs: string[];
  setTxInputs: (v: string[]) => void;
  verifiedTxs: Transaction[];
  annualSpend: number;
  submitting: boolean;
  editingTxId: string | null;
  editValue: string;
  setEditingTxId: (id: string | null) => void;
  setEditValue: (v: string) => void;
  onSubmitTx: (idx: number) => void;
  onEditTx: (tx: Transaction) => void;
  getMaxBoxes: (freq: string) => number;
  getMultiplier: (freq: string) => number;
  isMonthlyType: boolean;
}

const VerificationActivePanel = ({
  type, verification, transactions, txInputs, setTxInputs,
  verifiedTxs, annualSpend, submitting, editingTxId, editValue,
  setEditingTxId, setEditValue, onSubmitTx, onEditTx,
  getMaxBoxes, getMultiplier, isMonthlyType,
}: ActivePanelProps) => {
  const meta = spendMeta[type];
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((new Date(verification.ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const maxBoxes = isMonthlyType ? 1 : getMaxBoxes(verification.frequency);
  const submittedCount = transactions.length;
  const verifiedCount = verifiedTxs.length;
  const txProgress = maxBoxes > 0 ? (submittedCount / maxBoxes) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="glass rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{daysLeft > 0 ? `${daysLeft} days remaining` : "Period ended"}</span>
          </div>
          <span className="text-[11px] font-medium text-foreground capitalize">{verification.frequency}</span>
        </div>
        <Progress value={txProgress} className="h-1 bg-muted" />
        <p className="text-[10px] text-muted-foreground">
          {submittedCount}/{maxBoxes} submitted · {verifiedCount} verified
        </p>
      </div>

      {/* Calculated spend */}
      {verifiedCount > 0 && annualSpend > 0 && (
        <div className="glass rounded-xl p-4 border border-primary/15 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Estimated Annual {meta.label} Spend</p>
          <p className="text-[16px] font-bold text-primary">₦{annualSpend.toLocaleString("en-NG")}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {verifiedCount} verified × {isMonthlyType ? 12 : getMultiplier(verification.frequency)} multiplier
          </p>
        </div>
      )}

      {/* Transaction inputs */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-foreground">Transaction IDs</p>
        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
          {txInputs.map((val, idx) => {
            const existingTx = transactions[idx];
            const isSubmitted = !!existingTx;
            const isDuplicate = existingTx?.is_duplicate;
            const canEdit = isDuplicate && (existingTx?.edit_count || 0) === 0;
            const isEditing = editingTxId === existingTx?.id;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-muted-foreground w-5 text-right font-mono">{idx + 1}</span>
                  <div className="flex-1">
                    {isEditing ? (
                      <GlassInput
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder="Enter corrected Transaction ID"
                        className="text-[12px] border-destructive/30"
                        autoFocus
                      />
                    ) : (
                      <GlassInput
                        value={isSubmitted ? existingTx.transaction_id : val}
                        onChange={e => {
                          if (!isSubmitted) {
                            const next = [...txInputs];
                            next[idx] = e.target.value;
                            setTxInputs(next);
                          }
                        }}
                        placeholder={`Transaction ID #${idx + 1}`}
                        disabled={isSubmitted}
                        className={`text-[12px] ${isDuplicate ? "border-destructive/30" : isSubmitted && existingTx.is_verified ? "border-primary/30" : ""}`}
                      />
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex gap-1">
                      <GlassButton variant="primary" onClick={() => onEditTx(existingTx)} disabled={submitting || !editValue.trim()} className="px-3 py-2 text-[10px]">
                        Save
                      </GlassButton>
                      <GlassButton variant="outline" onClick={() => { setEditingTxId(null); setEditValue(""); }} className="px-2 py-2 text-[10px]">
                        ✕
                      </GlassButton>
                    </div>
                  ) : isSubmitted ? (
                    existingTx.is_verified ? (
                      <div className="flex items-center gap-1 text-primary shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">₦{existingTx.verified_amount?.toLocaleString("en-NG")}</span>
                      </div>
                    ) : isDuplicate ? (
                      canEdit ? (
                        <GlassButton
                          variant="outline"
                          onClick={() => { setEditingTxId(existingTx.id); setEditValue(""); }}
                          className="px-3 py-2 text-[10px] text-destructive border-destructive/20"
                        >
                          Fix
                        </GlassButton>
                      ) : (
                        <span className="text-[10px] text-destructive font-medium shrink-0">Duplicate</span>
                      )
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-[10px]">Pending</span>
                      </div>
                    )
                  ) : (
                    <GlassButton variant="primary" onClick={() => onSubmitTx(idx)} disabled={submitting || !val.trim()} className="px-3 py-2 text-[10px]">
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit"}
                    </GlassButton>
                  )}
                </div>
                {isDuplicate && !isEditing && canEdit && (
                  <p className="text-[9px] text-destructive/80 ml-7 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" /> Duplicate detected — tap Fix to correct (one chance only)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VerifySpendFlow;
