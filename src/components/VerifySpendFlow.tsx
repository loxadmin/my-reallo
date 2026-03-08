import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ShieldCheck, Clock, ExternalLink, CheckCircle2, AlertCircle, Zap, Wifi, UtensilsCrossed, Car } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

const spendMeta: Record<SpendType, { label: string; icon: React.ReactNode }> = {
  data: { label: "Data", icon: <Wifi className="w-3 h-3" /> },
  electricity: { label: "Electricity", icon: <Zap className="w-3 h-3" /> },
  food: { label: "Food", icon: <UtensilsCrossed className="w-3 h-3" /> },
  transport: { label: "Transport", icon: <Car className="w-3 h-3" /> },
};

const VerifySpendFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
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
  const [activeTab, setActiveTab] = useState<SpendType>("data");
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

    // Fetch all verifications and settings in parallel
    const [dataRes, elecRes, foodRes, transRes, settingsRes] = await Promise.all([
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "data").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "electricity").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "food").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "transport").order("created_at", { ascending: false }).limit(1),
      supabase.from("admin_settings").select("*"),
    ]);

    const results: Record<SpendType, any[]> = {
      data: dataRes.data || [],
      electricity: elecRes.data || [],
      food: foodRes.data || [],
      transport: transRes.data || [],
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
      user_id: user.id,
      frequency: freq,
      spend_type: type,
      verification_link: verifySettings.link,
      verification_description: verifySettings.description,
      ends_at: endsAt.toISOString(),
    } as any);

    toast({
      title: `${spendMeta[type].label} verification started!`,
      description: isMonthlyType
        ? `Submit your ${spendMeta[type].label.toLowerCase()} transaction ID.`
        : freq === "monthly" ? "Submit your transaction ID." : `Submit transaction IDs over the next ${days} days.`,
    });
    setStarting(false);
    await fetchData();
  };

  const handleSubmitTx = async (index: number, type: SpendType) => {
    const inputs = txInputs[type];
    const txs = transactions[type];
    const verification = verifications[type];
    const txId = inputs[index]?.trim();
    if (!txId || !verification || !user) return;

    if (txs[index]) {
      toast({ title: "Already submitted", description: "This slot already has a transaction ID." });
      return;
    }

    setSubmitting(true);

    const { data: dupCheck } = await supabase
      .from("verification_transactions")
      .select("id")
      .eq("transaction_id", txId)
      .limit(1);

    const isDuplicate = (dupCheck || []).length > 0;

    await supabase.from("verification_transactions").insert({
      verification_id: verification.id,
      user_id: user.id,
      transaction_id: txId,
      is_duplicate: isDuplicate,
      duplicate_note: isDuplicate ? "Duplicate detected on initial submission" : null,
    });

    if (isDuplicate) {
      toast({
        title: "Duplicate Transaction ID",
        description: "This transaction ID already exists. You can edit it once — a second duplicate will result in a ban.",
        variant: "destructive",
      });
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

    const { data: dupCheck } = await supabase
      .from("verification_transactions")
      .select("id")
      .eq("transaction_id", newTxId)
      .neq("id", tx.id)
      .limit(1);

    const isStillDuplicate = (dupCheck || []).length > 0;

    if (isStillDuplicate) {
      await supabase.from("verification_transactions").update({
        transaction_id: newTxId,
        edit_count: (tx.edit_count || 0) + 1,
        is_duplicate: true,
        duplicate_note: "Second duplicate — auto-banned",
      } as any).eq("id", tx.id);

      await supabase.from("profiles").update({
        is_banned: true,
        ban_reason: "Submitted duplicate transaction IDs twice during spend verification",
      }).eq("id", user.id);

      await supabase.from("user_warnings").insert({
        user_id: user.id,
        reason: "Auto-banned: submitted duplicate transaction ID twice (original: " + tx.transaction_id + ", edit: " + newTxId + ")",
        issued_by: user.id,
      } as any);

      toast({
        title: "Account Banned",
        description: "Your account has been banned for submitting duplicate transaction IDs twice.",
        variant: "destructive",
      });
    } else {
      await supabase.from("verification_transactions").update({
        transaction_id: newTxId,
        edit_count: (tx.edit_count || 0) + 1,
        is_duplicate: false,
        duplicate_note: "Edited from duplicate: " + tx.transaction_id,
      } as any).eq("id", tx.id);

      toast({ title: "Transaction ID updated", description: "Your edited transaction ID has been accepted." });
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
    if (isMonthlyType) {
      return vTxs.length > 0 ? Number(vTxs[0].verified_amount || 0) * 12 : 0;
    }
    return v.frequency === "monthly"
      ? (vTxs.length > 0 ? Number(vTxs[0].verified_amount || 0) * 12 : 0)
      : vTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0) * getMultiplier(v.frequency);
  };

  // Filter to only active categories (admin toggled on) that user has spend for
  const activeTypes = allTypes.filter(t => categoryToggles[t]);
  const allComplete = activeTypes.every(t => isComplete(t));
  const totalVerifiedAnnualSpend = allTypes.reduce((s, t) => s + getAnnualSpend(t), 0);

  if (allComplete && activeTypes.length > 0) {
    return (
      <GlassCard variant="strong" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-[13px]">Spend Verified</h3>
        </div>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass rounded-xl p-4 text-center border border-primary/20">
          <CheckCircle2 className="w-7 h-7 text-primary mx-auto mb-2" />
          <p className="font-semibold text-foreground text-[13px]">Verification Complete!</p>
          <p className="text-[12px] text-primary mt-1">
            Total Verified Annual Spend: ₦{totalVerifiedAnnualSpend.toLocaleString("en-NG")}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
            {allTypes.map(t => {
              const spend = getAnnualSpend(t);
              if (spend <= 0) return null;
              return (
                <span key={t} className="flex items-center gap-0.5">
                  {spendMeta[t].icon} {spendMeta[t].label}: ₦{spend.toLocaleString("en-NG")}
                </span>
              );
            })}
          </div>
        </motion.div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="strong" className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-[13px]">Verify Your Spend</h3>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-2">
        {activeTypes.map(t => (
          <div key={t} className={`glass rounded-xl p-2 text-center text-[10px] border ${isComplete(t) ? "border-primary/40 text-primary" : "border-muted text-muted-foreground"}`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">{spendMeta[t].icon}</div>
            {spendMeta[t].label} {isComplete(t) ? "✓" : verifications[t] ? "In Progress" : "Not Started"}
          </div>
        ))}
      </div>

      {!allComplete && (
        <p className="text-[10px] text-destructive/80">
          ⚠ All active categories must be verified for spend verification to be complete.
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1">
        {activeTypes.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-lg py-2 text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${activeTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {spendMeta[t].icon} {spendMeta[t].label}
          </button>
        ))}
      </div>

      {/* Active Tab Panel */}
      {activeTypes.includes(activeTab) && (
        <VerificationPanel
          type={activeTab}
          verification={verifications[activeTab]}
          transactions={transactions[activeTab]}
          txInputs={txInputs[activeTab]}
          setTxInputs={(v) => setTxInputs(prev => ({ ...prev, [activeTab]: v }))}
          isComplete={isComplete(activeTab)}
          verifiedTxs={getVerifiedTxs(activeTab)}
          annualSpend={getAnnualSpend(activeTab)}
          frequency={activeTab === "data" ? frequency : "monthly"}
          setFrequency={activeTab === "data" ? setFrequency : () => {}}
          verifySettings={verifySettings}
          starting={starting}
          submitting={submitting}
          editingTxId={editingTxId}
          editValue={editValue}
          setEditingTxId={setEditingTxId}
          setEditValue={setEditValue}
          onStart={() => handleStartVerification(activeTab)}
          onSubmitTx={(idx) => handleSubmitTx(idx, activeTab)}
          onEditTx={handleEditDuplicateTx}
          getMaxBoxes={activeTab === "data" ? getMaxBoxes : () => 1}
          getMultiplier={activeTab === "data" ? getMultiplier : () => 12}
          isMonthlyType={activeTab !== "data"}
        />
      )}
    </GlassCard>
  );
};

interface VerificationPanelProps {
  type: SpendType;
  verification: Verification | null;
  transactions: Transaction[];
  txInputs: string[];
  setTxInputs: (v: string[]) => void;
  isComplete: boolean;
  verifiedTxs: Transaction[];
  annualSpend: number;
  frequency: "daily" | "weekly" | "monthly";
  setFrequency: (f: "daily" | "weekly" | "monthly") => void;
  verifySettings: { link: string; description: string };
  starting: boolean;
  submitting: boolean;
  editingTxId: string | null;
  editValue: string;
  setEditingTxId: (id: string | null) => void;
  setEditValue: (v: string) => void;
  onStart: () => void;
  onSubmitTx: (idx: number) => void;
  onEditTx: (tx: Transaction) => void;
  getMaxBoxes: (freq: string) => number;
  getMultiplier: (freq: string) => number;
  isMonthlyType: boolean;
}

const VerificationPanel = ({
  type, verification, transactions, txInputs, setTxInputs,
  isComplete, verifiedTxs, annualSpend, frequency, setFrequency,
  verifySettings, starting, submitting, editingTxId, editValue,
  setEditingTxId, setEditValue, onStart, onSubmitTx, onEditTx,
  getMaxBoxes, getMultiplier, isMonthlyType,
}: VerificationPanelProps) => {
  const meta = spendMeta[type];

  if (isComplete) {
    return (
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass rounded-xl p-4 text-center border border-primary/20">
        <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="font-semibold text-foreground text-[12px]">{meta.label} Verified!</p>
        {verification?.recalculated_amount != null && (
          <p className="text-[11px] text-primary mt-1">
            Annual {meta.label} Spend: ₦{verification.recalculated_amount.toLocaleString("en-NG")}
          </p>
        )}
      </motion.div>
    );
  }

  if (!verification) {
    return (
      <div className="space-y-3">
        <p className="text-[12px] text-muted-foreground">
          Verify your yearly {meta.label.toLowerCase()} spend by submitting transaction IDs.
        </p>
        {verifySettings.link && (
          <a href={verifySettings.link} target="_blank" rel="noopener noreferrer">
            <GlassButton variant="outline" className="w-full text-[12px]">
              <ExternalLink className="w-3 h-3 mr-1 inline" /> Go to verification link
            </GlassButton>
          </a>
        )}
        {type === "data" && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-2">Select submission frequency:</p>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 glass rounded-xl py-2 text-[11px] capitalize transition-all ${frequency === f ? "border border-primary text-primary" : "text-muted-foreground"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {frequency === "daily" && "Submit transaction IDs over 30 days (sum × 12 = annual)"}
              {frequency === "weekly" && "Submit transaction IDs over 28 days (sum × 13 = annual)"}
              {frequency === "monthly" && "1 transaction ID (tx × 12 = annual)"}
            </p>
          </div>
        )}
        {isMonthlyType && (
          <p className="text-[10px] text-muted-foreground">
            {meta.label} is verified monthly — submit 1 transaction ID (tx × 12 = annual).
          </p>
        )}
        <GlassButton variant="primary" className="w-full text-[13px]" onClick={onStart} disabled={starting}>
          {starting ? "Starting..." : `Start ${meta.label} Verification`}
        </GlassButton>
      </div>
    );
  }

  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((new Date(verification.ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const verificationEnded = now >= new Date(verification.ends_at);
  const maxBoxes = isMonthlyType ? 1 : getMaxBoxes(verification.frequency);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {meta.icon}
          <span>{meta.label} • {verification.frequency}</span>
        </div>
        {!verificationEnded && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{daysLeft}d left</span>
          </div>
        )}
      </div>

      {verifiedTxs.length > 0 && annualSpend > 0 && (
        <div className="glass rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground">Calculated Annual {meta.label} Spend</p>
          <p className="text-[13px] font-semibold text-primary">₦{annualSpend.toLocaleString("en-NG")}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {verifiedTxs.length} verified tx × {isMonthlyType ? 12 : getMultiplier(verification.frequency)}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Transaction IDs ({transactions.length}/{maxBoxes})
        </p>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {txInputs.map((val, idx) => {
            const existingTx = transactions[idx];
            const isSubmitted = !!existingTx;
            const isDuplicate = existingTx?.is_duplicate;
            const canEdit = isDuplicate && (existingTx?.edit_count || 0) === 0;
            const isEditing = editingTxId === existingTx?.id;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-muted-foreground w-6 text-right">{idx + 1}.</span>
                  <div className="flex-1">
                    {isEditing ? (
                      <GlassInput
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder="Enter new Transaction ID"
                        className="text-[12px] border-destructive/50"
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
                        className={`text-[12px] ${isDuplicate ? "border-destructive/50" : ""}`}
                      />
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex gap-1">
                      <GlassButton
                        variant="primary"
                        onClick={() => onEditTx(existingTx)}
                        disabled={submitting || !editValue.trim()}
                        className="px-2 py-2 text-[10px] min-w-[50px]"
                      >
                        Save
                      </GlassButton>
                      <GlassButton
                        variant="outline"
                        onClick={() => { setEditingTxId(null); setEditValue(""); }}
                        className="px-2 py-2 text-[10px]"
                      >
                        ✕
                      </GlassButton>
                    </div>
                  ) : isSubmitted ? (
                    existingTx.is_verified ? (
                      <div className="flex items-center gap-1 text-primary min-w-[60px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">₦{existingTx.verified_amount?.toLocaleString("en-NG")}</span>
                      </div>
                    ) : isDuplicate ? (
                      <div className="flex items-center gap-1 min-w-[60px]">
                        {canEdit ? (
                          <GlassButton
                            variant="outline"
                            onClick={() => { setEditingTxId(existingTx.id); setEditValue(""); }}
                            className="px-2 py-2 text-[10px] text-destructive border-destructive/30"
                          >
                            Edit
                          </GlassButton>
                        ) : (
                          <span className="text-[10px] text-destructive">Duplicate</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground min-w-[60px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Pending</span>
                      </div>
                    )
                  ) : (
                    <GlassButton
                      variant="primary"
                      onClick={() => onSubmitTx(idx)}
                      disabled={submitting || !val.trim()}
                      className="px-3 py-2 text-[10px] min-w-[60px]"
                    >
                      Submit
                    </GlassButton>
                  )}
                </div>
                {isDuplicate && !isEditing && canEdit && (
                  <p className="text-[9px] text-destructive ml-8">⚠ Duplicate detected — edit once or face a ban</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {verifiedTxs.length}/{transactions.length} verified
      </p>
    </div>
  );
};

export default VerifySpendFlow;
