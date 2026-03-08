import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ShieldCheck, Clock, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Verification {
  id: string;
  frequency: string;
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

const VerifySpendFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txInputs, setTxInputs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [verifySettings, setVerifySettings] = useState({ link: "", description: "" });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [vRes, settingsRes] = await Promise.all([
      supabase.from("spend_verifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
      supabase.from("admin_settings").select("*"),
    ]);

    const v = (vRes.data || [])[0] as Verification | undefined;
    if (v) {
      setVerification(v);
      const { data: txs } = await supabase
        .from("verification_transactions")
        .select("*")
        .eq("verification_id", v.id)
        .order("submitted_at", { ascending: true });
      const txList = (txs || []) as Transaction[];
      setTransactions(txList);

      // Set up input boxes based on frequency
      const maxBoxes = v.frequency === "daily" ? 30 : v.frequency === "weekly" ? 4 : 1;
      const filled = txList.map(t => t.transaction_id);
      const inputs = Array.from({ length: maxBoxes }, (_, i) => filled[i] || "");
      setTxInputs(inputs);
    }

    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    setVerifySettings({
      link: settings.find(s => s.key === "verify_spend_link")?.value || "",
      description: settings.find(s => s.key === "verify_spend_description")?.value || "Verify your spend by completing the action at the link below.",
    });
  };

  const getMaxBoxes = (freq: string) => freq === "daily" ? 30 : freq === "weekly" ? 4 : 1;

  const handleStartVerification = async () => {
    if (!user) return;
    setStarting(true);
    const days = frequency === "daily" ? 30 : frequency === "weekly" ? 28 : 1;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + days);

    await supabase.from("spend_verifications").insert({
      user_id: user.id,
      frequency,
      verification_link: verifySettings.link,
      verification_description: verifySettings.description,
      ends_at: endsAt.toISOString(),
    });

    toast({ title: "Verification started!", description: frequency === "monthly" ? "Submit your transaction ID." : `Submit transaction IDs over the next ${days} days.` });
    setStarting(false);
    await fetchData();
  };

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleSubmitTx = async (index: number) => {
    const txId = txInputs[index]?.trim();
    if (!txId || !verification || !user) return;

    // Check if this slot already has a submitted transaction
    if (transactions[index]) {
      toast({ title: "Already submitted", description: "This slot already has a transaction ID." });
      return;
    }

    setSubmitting(true);

    // Check for duplicate across all users
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

  const handleEditDuplicateTx = async (tx: Transaction & { edit_count?: number }) => {
    const newTxId = editValue.trim();
    if (!newTxId || !user) return;

    setSubmitting(true);

    // Check if the new ID is also a duplicate
    const { data: dupCheck } = await supabase
      .from("verification_transactions")
      .select("id")
      .eq("transaction_id", newTxId)
      .neq("id", tx.id)
      .limit(1);

    const isStillDuplicate = (dupCheck || []).length > 0;

    if (isStillDuplicate) {
      // Second duplicate = auto-ban
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
      // Edit successful — clear duplicate flag
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
  const isComplete = verification?.status === "completed" || verification?.status === "verified";
  const daysLeft = verification ? Math.max(0, Math.ceil((new Date(verification.ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const verificationEnded = verification ? now >= new Date(verification.ends_at) : false;

  // Calculate verified spend based on frequency
  const verifiedTxs = transactions.filter(t => t.is_verified);
  const totalVerifiedAmount = verifiedTxs.reduce((sum, t) => sum + Number(t.verified_amount || 0), 0);
  
  // Daily: sum × 12, Weekly: sum × 13, Monthly: single tx × 12
  const getMultiplier = (freq: string) => freq === "daily" ? 12 : freq === "weekly" ? 13 : 12;
  
  const calculatedAnnualSpend = verification?.frequency === "monthly"
    ? (verifiedTxs.length > 0 ? Number(verifiedTxs[0].verified_amount || 0) * 12 : 0)
    : totalVerifiedAmount * getMultiplier(verification?.frequency || "daily");

  // Show "already verified" if complete
  if (isComplete || (verification && verification.status === "verified")) {
    return (
      <GlassCard variant="strong" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-[13px]">Spend Verified</h3>
        </div>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass rounded-xl p-4 text-center border border-primary/20">
          <CheckCircle2 className="w-7 h-7 text-primary mx-auto mb-2" />
          <p className="font-semibold text-foreground text-[13px]">Verification Complete!</p>
          {verification?.recalculated_amount !== null && verification?.recalculated_amount !== undefined && (
            <p className="text-[12px] text-primary mt-1">
              Verified Annual Spend: ₦{verification.recalculated_amount.toLocaleString("en-NG")}
            </p>
          )}
        </motion.div>
        <p className="text-[10px] text-muted-foreground">
          {verifiedTxs.length} transactions verified
        </p>
      </GlassCard>
    );
  }

  if (!verification) {
    return (
      <GlassCard variant="strong" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-[13px]">Verify Your Spend</h3>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Before claiming your amount, verify your yearly data spend.
        </p>
        {verifySettings.description && (
          <p className="text-[11px] text-muted-foreground">{verifySettings.description}</p>
        )}
        {verifySettings.link && (
          <a href={verifySettings.link} target="_blank" rel="noopener noreferrer">
            <GlassButton variant="outline" className="w-full text-[12px]">
              <ExternalLink className="w-3 h-3 mr-1 inline" /> Go to verification link
            </GlassButton>
          </a>
        )}
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
            {frequency === "daily" && "Submit transaction IDs over 30 days (sum of verified × 12 = annual spend)"}
            {frequency === "weekly" && "Submit transaction IDs over 28 days (sum of verified × 13 = annual spend)"}
            {frequency === "monthly" && "1 transaction ID (tx × 12 = annual spend, calculated immediately)"}
          </p>
        </div>
        <GlassButton variant="primary" className="w-full text-[13px]" onClick={handleStartVerification} disabled={starting}>
          {starting ? "Starting..." : "Start Verification"}
        </GlassButton>
      </GlassCard>
    );
  }

  const maxBoxes = getMaxBoxes(verification.frequency);

  return (
    <GlassCard variant="strong" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-[13px]">Spend Verification</h3>
        </div>
        {!verificationEnded && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{daysLeft}d left</span>
          </div>
        )}
      </div>

      {verifiedTxs.length > 0 && calculatedAnnualSpend > 0 && (
        <div className="glass rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground">Calculated Annual Spend</p>
          <p className="text-[13px] font-semibold text-primary">₦{calculatedAnnualSpend.toLocaleString("en-NG")}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {verifiedTxs.length} verified tx × {getMultiplier(verification?.frequency || "daily")}
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
            return (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-[10px] text-muted-foreground w-6 text-right">{idx + 1}.</span>
                <div className="flex-1">
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
                    className="text-[12px]"
                  />
                </div>
                {isSubmitted ? (
                  existingTx.is_verified ? (
                    <div className="flex items-center gap-1 text-primary min-w-[60px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">₦{existingTx.verified_amount?.toLocaleString("en-NG")}</span>
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
                    onClick={() => handleSubmitTx(idx)}
                    disabled={submitting || !val.trim()}
                    className="px-3 py-2 text-[10px] min-w-[60px]"
                  >
                    Submit
                  </GlassButton>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Frequency: {verification.frequency} • {verifiedTxs.length}/{transactions.length} verified
      </p>
    </GlassCard>
  );
};

export default VerifySpendFlow;
