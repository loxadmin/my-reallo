import { X, ExternalLink, Shield, AlertTriangle, Ban, CheckCircle2, Users, Wallet, Calendar, Mail, Hash, Zap, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileData {
  id: string;
  email: string;
  total_annual_spend: number;
  selected_goal: string | null;
  queue_position: number;
  referral_code: string | null;
  points_balance: number;
  created_at: string;
  is_banned: boolean;
  ban_reason: string | null;
}

interface UserProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  profile: ProfileData | null;
  referralCount?: number;
  // Optional extra sections
  infApp?: any;
  infWallet?: any;
  bankAccount?: any;
  withdrawals?: any[];
  challengeSubmissions?: any[];
  verificationTxs?: any[];
  decisionResponses?: any[];
  formatNaira?: (n: number) => string;
}

const Field = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/15 last:border-0">
    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
    <span className={`text-sm text-foreground font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
  </div>
);

const StatusPill = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: "bg-primary/15 text-primary",
    approved: "bg-primary/15 text-primary",
    verified: "bg-primary/15 text-primary",
    pending: "bg-accent/10 text-accent-foreground",
    pending_review: "bg-accent/10 text-accent-foreground",
    pending_activation: "bg-accent/10 text-accent-foreground",
    rejected: "bg-destructive/10 text-destructive",
    closed: "bg-destructive/10 text-destructive",
    appeal_rejected: "bg-destructive/10 text-destructive",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || "bg-muted text-muted-foreground"}`}>{status.replace(/_/g, " ")}</span>;
};

const UserProfileDrawer = ({
  open, onClose, profile, referralCount = 0,
  infApp, infWallet, bankAccount, withdrawals, challengeSubmissions, verificationTxs, decisionResponses,
  formatNaira = (n) => `₦${n.toLocaleString("en-NG")}`,
}: UserProfileDrawerProps) => {
  if (!profile) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border/50 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border/30 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[14px] font-bold text-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{profile.id.slice(0, 16)}…</p>
              </div>
              <div className="flex items-center gap-2">
                {profile.is_banned && <span className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full font-medium flex items-center gap-1"><Ban className="w-3 h-3" /> Banned</span>}
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ scrollbarWidth: "thin" }}>
              {/* Core Info */}
              <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Account Details</p>
                <Field label="Email" value={profile.email} />
                <Field label="Queue Position" value={`#${profile.queue_position}`} />
                <Field label="Points Balance" value={profile.points_balance.toLocaleString()} />
                <Field label="Annual Spend" value={formatNaira(profile.total_annual_spend || 0)} />
                <Field label="Selected Goal" value={profile.selected_goal} />
                <Field label="Referral Code" value={profile.referral_code} mono />
                <Field label="Referrals Made" value={referralCount} />
                <Field label="Joined" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"} />
                {profile.is_banned && <Field label="Ban Reason" value={<span className="text-destructive">{profile.ban_reason}</span>} />}
              </div>

              {/* Influencer Application */}
              {infApp && (
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Influencer Application</p>
                  <Field label="Status" value={<StatusPill status={infApp.status} />} />
                  <Field label="Social Link" value={
                    <a href={infApp.social_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                      <ExternalLink className="w-2.5 h-2.5" /> View
                    </a>
                  } />
                  <Field label="Applied" value={new Date(infApp.created_at).toLocaleDateString()} />
                </div>
              )}

              {/* Wallet & Bank */}
              {infWallet && (
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-primary" /> Influencer Wallet</p>
                  <Field label="Status" value={<StatusPill status={infWallet.status} />} />
                  <Field label="Balance" value={formatNaira(infWallet.balance || 0)} />
                  {bankAccount && (
                    <>
                      <Field label="Bank" value={bankAccount.bank_name} />
                      <Field label="Account" value={`${bankAccount.account_name} · ${bankAccount.account_number}`} />
                      <Field label="Bank Verified" value={<StatusPill status={bankAccount.verification_status} />} />
                    </>
                  )}
                </div>
              )}

              {/* Withdrawals */}
              {withdrawals && withdrawals.length > 0 && (
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-primary" /> Withdrawals ({withdrawals.length})</p>
                  {withdrawals.slice(0, 5).map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                      <span className="text-sm font-medium text-foreground">{formatNaira(w.amount)}</span>
                      <div className="flex items-center gap-2">
                        <StatusPill status={w.status} />
                        <span className="text-sm text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Challenge Submissions */}
              {challengeSubmissions && challengeSubmissions.length > 0 && (
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Challenge Submissions ({challengeSubmissions.length})</p>
                  {challengeSubmissions.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                      <span className="text-sm text-foreground">Video #{s.video_number}</span>
                      <div className="flex items-center gap-2">
                        <StatusPill status={s.status} />
                        <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="text-primary"><ExternalLink className="w-3 h-3" /></a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Verification Transactions */}
              {verificationTxs && verificationTxs.length > 0 && (
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-primary" /> Verification TXs ({verificationTxs.length})</p>
                  {verificationTxs.slice(0, 5).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                      <span className="text-sm font-mono text-foreground truncate max-w-[180px]">{tx.transaction_id}</span>
                      <div className="flex items-center gap-2">
                        {tx.is_duplicate ? <span className="text-xs text-destructive">Dup</span> :
                          tx.is_verified ? <span className="text-xs text-primary">✓ {formatNaira(tx.verified_amount || 0)}</span> :
                          <span className="text-xs text-muted-foreground">Pending</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Decision Responses */}
              {decisionResponses && decisionResponses.length > 0 && (
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> Decision Responses ({decisionResponses.length})</p>
                  {decisionResponses.slice(0, 5).map((dr: any) => (
                    <div key={dr.id} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                      <span className="text-sm text-foreground">{dr.has_app ? "Has app" : "No app"}{dr.would_switch ? " · Would switch" : ""}</span>
                      <span className="text-xs text-muted-foreground">{dr.points_awarded}pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserProfileDrawer;
