import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ShieldCheck, Clock, ExternalLink, CheckCircle2, AlertCircle, Zap, Wifi, UtensilsCrossed, Bus } from "lucide-react";
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

const VerifySpendFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [dataVerification, setDataVerification] = useState<Verification | null>(null);
  const [elecVerification, setElecVerification] = useState<Verification | null>(null);
  const [foodVerification, setFoodVerification] = useState<Verification | null>(null);
  const [transportVerification, setTransportVerification] = useState<Verification | null>(null);
  const [dataTxs, setDataTxs] = useState<Transaction[]>([]);
  const [elecTxs, setElecTxs] = useState<Transaction[]>([]);
  const [foodTxs, setFoodTxs] = useState<Transaction[]>([]);
  const [transportTxs, setTransportTxs] = useState<Transaction[]>([]);
  const [dataTxInputs, setDataTxInputs] = useState<string[]>([]);
  const [elecTxInputs, setElecTxInputs] = useState<string[]>([]);
  const [foodTxInputs, setFoodTxInputs] = useState<string[]>([]);
  const [transportTxInputs, setTransportTxInputs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [verifySettings, setVerifySettings] = useState({ link: "", description: "" });
  const [starting, setStarting] = useState(false);
  const [activeTab, setActiveTab] = useState<SpendType>("data");
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [verifyFoodActive, setVerifyFoodActive] = useState(false);
  const [verifyTransportActive, setVerifyTransportActive] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [dataRes, elecRes, foodRes, transportRes, settingsRes] = await Promise.all([
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "data").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "electricity").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "food").order("created_at", { ascending: false }).limit(1),
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).eq("spend_type", "transport").order("created_at", { ascending: false }).limit(1),
      supabase.from("admin_settings").select("*"),
    ]);

    const loadVerification = async (
      res: any,
      setVerif: (v: Verification | null) => void,
      setTxs: (t: Transaction[]) => void,
      setInputs: (i: string[]) => void,
      isElectricity: boolean = false
    ) => {
      const v = (res.data || [])[0] as Verification | undefined;
      if (v) {
        setVerif(v);
        const { data: txs } = await supabase.from("verification_transactions").select("*").eq("verification_id", v.id).order("submitted_at", { ascending: true });
        const txList = (txs || []) as Transaction[];
        setTxs(txList);
        if (isElectricity) {
          setInputs(Array.from({ length: 1 }, (_, i) => txList[i]?.transaction_id || ""));
        } else {
          const maxBoxes = getMaxBoxes(v.frequency);
          const filled = txList.map(t => t.transaction_id);
          setInputs(Array.from({ length: maxBoxes }, (_, i) => filled[i] || ""));
        }
      } else {
        setVerif(null);
        setTxs([]);
        setInputs(isElectricity ? [""] : []);
      }
    };

    await Promise.all([
      loadVerification(dataRes, setDataVerification, setDataTxs, setDataTxInputs),
      loadVerification(elecRes, setElecVerification, setElecTxs, setElecTxInputs, true),
      loadVerification(foodRes, setFoodVerification, setFoodTxs, setFoodTxInputs),
      loadVerification(transportRes, setTransportVerification, setTransportTxs, setTransportTxInputs),
    ]);

    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    setVerifySettings({
      link: settings.find(s => s.key === "verify_spend_link")?.value || "",
      description: settings.find(s => s.key === "verify_spend_description")?.value || "Verify your spend by completing the action at the link below.",
    });
    setVerifyFoodActive(settings.find(s => s.key === "verify_food_active")?.value !== "false");
    setVerifyTransportActive(settings.find(s => s.key === "verify_transport_active")?.value !== "false");
  };

  const getMaxBoxes = (freq: string) => freq === "daily" ? 30 : freq === "weekly" ? 4 : 1;
  const getMultiplier = (freq: string) => freq === "daily" ? 12 : freq === "weekly" ? 13 : 12;

  const handleStartVerification = async (type: SpendType) => {
    if (!user) return;
    setStarting(true);

    const freq = type === "electricity" ? "monthly" : frequency;
    const days = freq === "daily" ? 30 : freq === "weekly" ? 28 : 1;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + days);

    const typeLabels: Record<SpendType, string> = { data: "Data", electricity: "Electricity", food: "Food", transport: "Transport" };

    await supabase.from("spend_verifications").insert({
      user_id: user.id,
      frequency: freq,
      spend_type: type,
      verification_link: verifySettings.link,
      verification_description: verifySettings.description,
      ends_at: endsAt.toISOString(),
    } as any);

    toast({
      title: `${typeLabels[type]} verification started!`,
      description: type === "electricity"
        ? "Submit your monthly electricity transaction ID."
        : freq === "monthly" ? "Submit your transaction ID." : `Submit transaction IDs over the next ${days} days.`,
    });
    setStarting(false);
    await fetchData();
  };

  const handleSubmitTx = async (index: number, type: SpendType) => {
    const inputsMap: Record<SpendType, string[]> = { data: dataTxInputs, electricity: elecTxInputs, food: foodTxInputs, transport: transportTxInputs };
    const txsMap: Record<SpendType, Transaction[]> = { data: dataTxs, electricity: elecTxs, food: foodTxs, transport: transportTxs };
    const verifMap: Record<SpendType, Verification | null> = { data: dataVerification, electricity: elecVerification, food: foodVerification, transport: transportVerification };
    const inputs = inputsMap[type];
    const transactions = txsMap[type];
    const verification = verifMap[type];
    const txId = inputs[index]?.trim();
    if (!txId || !verification || !user) return;

    if (transactions[index]) {
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

  const now = new Date();
  const dataComplete = dataVerification?.status === "completed" || dataVerification?.status === "verified";
  const elecComplete = elecVerification?.status === "completed" || elecVerification?.status === "verified";
  const foodComplete = foodVerification?.status === "completed" || foodVerification?.status === "verified";
  const transportComplete = transportVerification?.status === "completed" || transportVerification?.status === "verified";
  const utilityComplete = dataComplete && elecComplete;

  const dataVerifiedTxs = dataTxs.filter(t => t.is_verified);
  const elecVerifiedTxs = elecTxs.filter(t => t.is_verified);
  const foodVerifiedTxs = foodTxs.filter(t => t.is_verified);
  const transportVerifiedTxs = transportTxs.filter(t => t.is_verified);

  const calcAnnual = (verif: Verification | null, verifiedTxs: Transaction[], isElec: boolean = false) => {
    if (!verif) return 0;
    if (isElec) return verifiedTxs.length > 0 ? Number(verifiedTxs[0].verified_amount || 0) * 12 : 0;
    return verif.frequency === "monthly"
      ? (verifiedTxs.length > 0 ? Number(verifiedTxs[0].verified_amount || 0) * 12 : 0)
      : verifiedTxs.reduce((s, t) => s + Number(t.verified_amount || 0), 0) * getMultiplier(verif.frequency);
  };

  const dataAnnualSpend = calcAnnual(dataVerification, dataVerifiedTxs);
  const elecAnnualSpend = calcAnnual(elecVerification, elecVerifiedTxs, true);
  const foodAnnualSpend = calcAnnual(foodVerification, foodVerifiedTxs);
  const transportAnnualSpend = calcAnnual(transportVerification, transportVerifiedTxs);
  const totalVerifiedAnnualSpend = dataAnnualSpend + elecAnnualSpend + foodAnnualSpend + transportAnnualSpend;

  // Build tab list based on active settings
  const tabs: { type: SpendType; label: string; icon: any; active: boolean }[] = [
    { type: "data", label: "Data", icon: Wifi, active: true },
    { type: "electricity", label: "Elec", icon: Zap, active: true },
    ...(verifyFoodActive ? [{ type: "food" as SpendType, label: "Food", icon: UtensilsCrossed, active: true }] : []),
    ...(verifyTransportActive ? [{ type: "transport" as SpendType, label: "Transport", icon: Bus, active: true }] : []),
  ];

  const completionMap: Record<SpendType, boolean> = { data: dataComplete, electricity: elecComplete, food: foodComplete, transport: transportComplete };
  const verifMap: Record<SpendType, Verification | null> = { data: dataVerification, electricity: elecVerification, food: foodVerification, transport: transportVerification };
  const txsMap: Record<SpendType, Transaction[]> = { data: dataTxs, electricity: elecTxs, food: foodTxs, transport: transportTxs };
  const inputsMap: Record<SpendType, string[]> = { data: dataTxInputs, electricity: elecTxInputs, food: foodTxInputs, transport: transportTxInputs };
  const setInputsMap: Record<SpendType, (v: string[]) => void> = { data: setDataTxInputs, electricity: setElecTxInputs, food: setFoodTxInputs, transport: setTransportTxInputs };
  const verifiedTxsMap: Record<SpendType, Transaction[]> = { data: dataVerifiedTxs, electricity: elecVerifiedTxs, food: foodVerifiedTxs, transport: transportVerifiedTxs };
  const annualSpendMap: Record<SpendType, number> = { data: dataAnnualSpend, electricity: elecAnnualSpend, food: foodAnnualSpend, transport: transportAnnualSpend };

  const allRequiredComplete = utilityComplete && (!verifyFoodActive || foodComplete) && (!verifyTransportActive || transportComplete);

  if (allRequiredComplete) {
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
            <span><Wifi className="w-3 h-3 inline mr-1" />Data: ₦{dataAnnualSpend.toLocaleString("en-NG")}</span>
            <span><Zap className="w-3 h-3 inline mr-1" />Elec: ₦{elecAnnualSpend.toLocaleString("en-NG")}</span>
            {verifyFoodActive && <span><UtensilsCrossed className="w-3 h-3 inline mr-1" />Food: ₦{foodAnnualSpend.toLocaleString("en-NG")}</span>}
            {verifyTransportActive && <span><Bus className="w-3 h-3 inline mr-1" />Transport: ₦{transportAnnualSpend.toLocaleString("en-NG")}</span>}
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
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <div key={tab.type} className={`flex-1 min-w-[60px] glass rounded-xl p-2 text-center text-[10px] border ${completionMap[tab.type] ? "border-primary/40 text-primary" : "border-muted text-muted-foreground"}`}>
            <tab.icon className="w-3 h-3 mx-auto mb-1" />
            {tab.label} {completionMap[tab.type] ? "✓" : verifMap[tab.type] ? "⏳" : "—"}
          </div>
        ))}
      </div>

      {!allRequiredComplete && (
        <p className="text-[10px] text-destructive/80">
          ⚠ All active categories must be verified for spend verification to be complete.
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`flex-1 rounded-lg py-2 text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${activeTab === tab.type ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Panel */}
      {tabs.map(tab => activeTab === tab.type && (
        <VerificationPanel
          key={tab.type}
          type={tab.type}
          verification={verifMap[tab.type]}
          transactions={txsMap[tab.type]}
          txInputs={inputsMap[tab.type]}
          setTxInputs={setInputsMap[tab.type]}
          isComplete={completionMap[tab.type]}
          verifiedTxs={verifiedTxsMap[tab.type]}
          annualSpend={annualSpendMap[tab.type]}
          frequency={tab.type === "electricity" ? "monthly" : frequency}
          setFrequency={tab.type === "electricity" ? () => {} : setFrequency}
          verifySettings={verifySettings}
          starting={starting}
          submitting={submitting}
          editingTxId={editingTxId}
          editValue={editValue}
          setEditingTxId={setEditingTxId}
          setEditValue={setEditValue}
          onStart={() => handleStartVerification(tab.type)}
          onSubmitTx={(idx) => handleSubmitTx(idx, tab.type)}
          onEditTx={handleEditDuplicateTx}
          getMaxBoxes={tab.type === "electricity" ? () => 1 : getMaxBoxes}
          getMultiplier={tab.type === "electricity" ? () => 12 : getMultiplier}
        />
      ))}
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
}

const VerificationPanel = ({
  type, verification, transactions, txInputs, setTxInputs,
  isComplete, verifiedTxs, annualSpend, frequency, setFrequency,
  verifySettings, starting, submitting, editingTxId, editValue,
  setEditingTxId, setEditValue, onStart, onSubmitTx, onEditTx,
  getMaxBoxes, getMultiplier,
}: VerificationPanelProps) => {
  const label = type === "data" ? "Data" : "Electricity";
  const icon = type === "data" ? <Wifi className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />;

  if (isComplete) {
    return (
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass rounded-xl p-4 text-center border border-primary/20">
        <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="font-semibold text-foreground text-[12px]">{label} Verified!</p>
        {verification?.recalculated_amount != null && (
          <p className="text-[11px] text-primary mt-1">
            Annual {label} Spend: ₦{verification.recalculated_amount.toLocaleString("en-NG")}
          </p>
        )}
      </motion.div>
    );
  }

  if (!verification) {
    return (
      <div className="space-y-3">
        <p className="text-[12px] text-muted-foreground">
          Verify your yearly {label.toLowerCase()} spend by submitting transaction IDs.
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
        {type === "electricity" && (
          <p className="text-[10px] text-muted-foreground">
            Electricity is verified monthly — submit 1 transaction ID (tx × 12 = annual).
          </p>
        )}
        <GlassButton variant="primary" className="w-full text-[13px]" onClick={onStart} disabled={starting}>
          {starting ? "Starting..." : `Start ${label} Verification`}
        </GlassButton>
      </div>
    );
  }

  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((new Date(verification.ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const verificationEnded = now >= new Date(verification.ends_at);
  const maxBoxes = type === "electricity" ? 1 : getMaxBoxes(verification.frequency);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {icon}
          <span>{label} • {verification.frequency}</span>
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
          <p className="text-[11px] text-muted-foreground">Calculated Annual {label} Spend</p>
          <p className="text-[13px] font-semibold text-primary">₦{annualSpend.toLocaleString("en-NG")}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {verifiedTxs.length} verified tx × {type === "electricity" ? 12 : getMultiplier(verification.frequency)}
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
