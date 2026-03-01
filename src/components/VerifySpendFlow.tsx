import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { ShieldCheck, Clock, ExternalLink, Plus, CheckCircle2, AlertCircle } from "lucide-react";
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
}

const VerifySpendFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newTxId, setNewTxId] = useState("");
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
        .order("submitted_at", { ascending: false });
      setTransactions((txs || []) as Transaction[]);
    }

    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    setVerifySettings({
      link: settings.find(s => s.key === "verify_spend_link")?.value || "",
      description: settings.find(s => s.key === "verify_spend_description")?.value || "Verify your spend by completing the action at the link below.",
    });
  };

  const handleStartVerification = async () => {
    if (!user) return;
    setStarting(true);
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30);

    await supabase.from("spend_verifications").insert({
      user_id: user.id,
      frequency,
      verification_link: verifySettings.link,
      verification_description: verifySettings.description,
      ends_at: endsAt.toISOString(),
    });

    toast({ title: "Verification started!", description: "Submit transaction IDs over the next 30 days." });
    setStarting(false);
    await fetchData();
  };

  const handleSubmitTx = async () => {
    if (!newTxId.trim() || !verification || !user) return;
    setSubmitting(true);

    await supabase.from("verification_transactions").insert({
      verification_id: verification.id,
      user_id: user.id,
      transaction_id: newTxId.trim(),
    });

    toast({ title: "Transaction ID submitted" });
    setNewTxId("");
    setSubmitting(false);
    await fetchData();
  };

  const isOffQueue = (profile?.queue_position ?? 999) <= 0;
  if (!isOffQueue || !user) return null;

  const now = new Date();
  const daysLeft = verification ? Math.max(0, Math.ceil((new Date(verification.ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 30;
  const isComplete = verification?.status === "completed" || verification?.status === "verified";
  const allVerified = transactions.length > 0 && transactions.every(t => t.is_verified);

  // Determine if user can submit today based on frequency
  const canSubmitToday = () => {
    if (!verification || transactions.length === 0) return true;
    const lastSubmission = new Date(transactions[0].submitted_at);
    const diffDays = Math.floor((now.getTime() - lastSubmission.getTime()) / (1000 * 60 * 60 * 24));
    if (verification.frequency === "daily") return diffDays >= 1;
    if (verification.frequency === "weekly") return diffDays >= 7;
    if (verification.frequency === "monthly") return diffDays >= 30;
    return true;
  };

  // No verification started yet
  if (!verification) {
    return (
      <GlassCard variant="strong" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Verify Your Spend</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Before claiming your amount, verify your yearly data spend over 30 days.
        </p>
        {verifySettings.description && (
          <p className="text-xs text-muted-foreground">{verifySettings.description}</p>
        )}
        {verifySettings.link && (
          <a href={verifySettings.link} target="_blank" rel="noopener noreferrer">
            <GlassButton variant="outline" className="w-full text-xs">
              <ExternalLink className="w-3 h-3 mr-1 inline" /> Go to verification link
            </GlassButton>
          </a>
        )}
        <div>
          <p className="text-xs text-muted-foreground font-display mb-2">Select submission frequency:</p>
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`flex-1 glass rounded-xl py-2 text-xs font-display capitalize transition-all ${frequency === f ? "border border-primary text-primary" : "text-muted-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {frequency === "daily" && "Submit transaction IDs daily for 30 days"}
            {frequency === "weekly" && "Submit transaction IDs every 7 days for 30 days"}
            {frequency === "monthly" && "Submit transaction IDs once in 30 days"}
          </p>
        </div>
        <GlassButton variant="primary" className="w-full" onClick={handleStartVerification} disabled={starting}>
          {starting ? "Starting..." : "Start 30-Day Verification"}
        </GlassButton>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="strong" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Spend Verification</h3>
        </div>
        {!isComplete && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{daysLeft}d left</span>
          </div>
        )}
      </div>

      {allVerified && (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass rounded-xl p-4 text-center border border-primary/20">
          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-display font-semibold text-foreground">All Transactions Verified!</p>
          {verification.recalculated_amount !== null && (
            <p className="text-sm text-primary mt-1">
              Recalculated claimable: ₦{verification.recalculated_amount?.toLocaleString("en-NG")}
            </p>
          )}
        </motion.div>
      )}

      {/* Submit new transaction ID */}
      {!isComplete && daysLeft > 0 && (
        <div>
          {canSubmitToday() ? (
            <div className="flex gap-2">
              <input
                value={newTxId}
                onChange={e => setNewTxId(e.target.value)}
                placeholder="Enter transaction ID"
                className="flex-1 glass-input rounded-xl px-4 py-3 text-foreground text-sm"
              />
              <GlassButton variant="primary" onClick={handleSubmitTx} disabled={submitting || !newTxId.trim()} className="px-4">
                <Plus className="w-4 h-4" />
              </GlassButton>
            </div>
          ) : (
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">
                Next submission: {verification.frequency === "daily" ? "tomorrow" : verification.frequency === "weekly" ? "in a few days" : "end of period"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transaction list */}
      {transactions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-display">Submitted Transactions ({transactions.length})</p>
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between glass rounded-xl p-3">
              <div>
                <p className="text-sm font-mono text-foreground">{tx.transaction_id}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(tx.submitted_at).toLocaleDateString()}</p>
              </div>
              {tx.is_verified ? (
                <div className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">₦{tx.verified_amount?.toLocaleString("en-NG")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Pending</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Frequency: {verification.frequency} • {transactions.filter(t => t.is_verified).length}/{transactions.length} verified
      </p>
    </GlassCard>
  );
};

export default VerifySpendFlow;
