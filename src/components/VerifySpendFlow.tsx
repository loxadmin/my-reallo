import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { ShieldCheck, Clock, ExternalLink, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

    const { error } = await supabase.from("spend_verifications").insert({
      user_id: user.id,
      frequency,
      verification_link: verifySettings.link,
      verification_description: verifySettings.description,
      ends_at: endsAt.toISOString(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification journey started!");
      await fetchData();
    }
    setStarting(false);
  };

  const handleSubmitTx = async () => {
    if (!newTxId.trim() || !verification || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("verification_transactions").insert({
      verification_id: verification.id,
      user_id: user.id,
      transaction_id: newTxId.trim(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Transaction ID submitted");
      setNewTxId("");
      await fetchData();
    }
    setSubmitting(false);
  };

  const isOffQueue = (profile?.queue_position ?? 999) <= 0;
  if (!isOffQueue || !user) return null;

  const now = new Date();
  const daysLeft = verification ? Math.max(0, Math.ceil((new Date(verification.ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 30;
  const isComplete = verification?.status === "completed" || verification?.status === "verified";
  const allVerified = transactions.length > 0 && transactions.every(t => t.is_verified);

  const canSubmitToday = () => {
    if (!verification || transactions.length === 0) return true;
    const lastSubmission = new Date(transactions[0].submitted_at);
    const diffDays = Math.floor((now.getTime() - lastSubmission.getTime()) / (1000 * 60 * 60 * 24));
    if (verification.frequency === "daily") return diffDays >= 1;
    if (verification.frequency === "weekly") return diffDays >= 7;
    if (verification.frequency === "monthly") return diffDays >= 30;
    return true;
  };

  if (!verification) {
    return (
      <GlassCard className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-display font-bold text-foreground">Initial Setup</h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Before claiming your amount, verify your yearly spend over 30 days. Choose a frequency that works for you.
        </p>

        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Frequency</p>
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`flex-1 py-3 rounded-2xl text-xs font-bold capitalize transition-all border ${
                  frequency === f
                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(24ACC4,0.1)]"
                    : "bg-muted/30 border-white/10 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-primary/70 font-medium ml-1">
            {frequency === "daily" && "• Submit IDs daily for 30 days"}
            {frequency === "weekly" && "• Submit IDs every 7 days for 30 days"}
            {frequency === "monthly" && "• Submit ID once in 30 days"}
          </p>
        </div>

        <GlassButton variant="primary" className="w-full py-4" onClick={handleStartVerification} loading={starting}>
          Begin Verification
        </GlassButton>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-bold text-foreground">Active Journey</h3>
          </div>
          {!isComplete && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              <span>{daysLeft}d left</span>
            </div>
          )}
        </div>

        {allVerified && (
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-primary/5 rounded-2xl p-6 text-center border border-primary/20 shadow-xl">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="font-display font-bold text-foreground">Verification Successful</p>
            {verification.recalculated_amount !== null && (
              <p className="text-xl font-bold text-primary mt-2">
                ₦{verification.recalculated_amount?.toLocaleString("en-NG")}
              </p>
            )}
          </motion.div>
        )}

        {!isComplete && daysLeft > 0 && (
          <div className="space-y-4">
            {canSubmitToday() ? (
              <div className="flex flex-col gap-3">
                <GlassInput
                  value={newTxId}
                  onChange={e => setNewTxId(e.target.value)}
                  placeholder="Enter Transaction ID"
                  label="Submit Transaction"
                />
                <GlassButton variant="primary" onClick={handleSubmitTx} loading={submitting} disabled={!newTxId.trim()} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Submit ID
                </GlassButton>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-2xl p-6 text-center border border-white/5">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cooldown Active</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Next submission available {verification.frequency === "daily" ? "tomorrow" : verification.frequency === "weekly" ? "in 7 days" : "next month"}.
                </p>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {transactions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
            Submitted History ({transactions.length})
          </p>
          {transactions.map(tx => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between glass-card p-4"
            >
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-foreground">{tx.transaction_id}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{new Date(tx.submitted_at).toLocaleDateString()}</p>
              </div>
              {tx.is_verified ? (
                <div className="flex items-center gap-1.5 text-primary font-bold">
                  <CheckCircle2 size={14} />
                  <span className="text-xs">₦{tx.verified_amount?.toLocaleString("en-NG")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground font-bold">
                  <AlertCircle size={14} />
                  <span className="text-xs">Pending</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerifySpendFlow;
