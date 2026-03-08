import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Link, Video, CreditCard, ChevronRight, Check, AlertCircle, Info, ExternalLink, ArrowRight, Wallet, History, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const NIGERIAN_BANKS = [
  "Access Bank", "Access Bank (Diamond)", "ALAT by WEMA", "ASO Savings and Loans", "Bowen Microfinance Bank",
  "Carbon", "CEMCS Microfinance Bank", "Citibank Nigeria", "Ecobank Nigeria", "Ekondo Microfinance Bank",
  "Eyowo", "Fidelity Bank", "First Bank of Nigeria", "First City Monument Bank", "Globus Bank",
  "GoMoney", "Guaranty Trust Bank", "Heritage Bank", "Jaiz Bank", "Keystone Bank", "Kuda Bank",
  "Lotus Bank", "Mainstreet Microfinance Bank", "Mayfair Microfinance Bank", "Mint Finex MFB", "OPay",
  "Paga", "PalmPay", "Parallex Bank", "Parkway - ReadyCash", "Paycom (OPay)", "Polaris Bank",
  "Providus Bank", "Rubies MFB", "Safe Haven MFB", "Sparkle Microfinance Bank", "Stanbic IBTC Bank",
  "Standard Chartered Bank", "Sterling Bank", "Suntrust Bank", "TAJ Bank", "TCF MFB", "Titan Bank",
  "Union Bank of Nigeria", "United Bank for Africa", "Unity Bank", "VFD Microfinance Bank", "Wema Bank",
  "Zenith Bank"
];

interface SocialAccount {
  id: string;
  platform: string;
  account_link: string;
  is_verified: boolean;
}

interface SocialChallenge {
  id: string;
  title: string;
  description: string;
  reward_naira: number;
}

interface SocialSubmission {
  id: string;
  challenge_id: string;
  video_link: string;
  status: 'pending' | 'approved' | 'rejected';
  reward_paid_naira: number | null;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount_naira: number;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
}

const SocialMediaFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [challenges, setChallenges] = useState<SocialChallenge[]>([]);
  const [submissions, setSubmissions] = useState<SocialSubmission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'challenges' | 'account' | 'wallet'>('account');

  // Form states
  const [platform, setPlatform] = useState("");
  const [accountLink, setAccountLink] = useState("");
  const [submittingAccount, setSubmittingAccount] = useState(false);

  const [submittingVideo, setSubmittingVideo] = useState<string | null>(null);
  const [videoLink, setVideoLink] = useState("");

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [updatingBank, setUpdatingBank] = useState(false);

  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setBankName(profile.bank_name || "");
      setAccountNumber(profile.account_number || "");
      setAccountName(profile.account_name || "");
    }
  }, [profile]);

  const fetchData = async () => {
    if (!user) return;

    const [accRes, chalRes, subRes, withRes] = await Promise.all([
      supabase.from("social_media_accounts").select("*").eq("user_id", user.id),
      supabase.from("social_media_challenges").select("*").eq("is_active", true),
      supabase.from("social_media_submissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("social_withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setAccounts((accRes.data || []) as SocialAccount[]);
    setChallenges((chalRes.data || []) as SocialChallenge[]);
    setSubmissions((subRes.data || []) as SocialSubmission[]);
    setWithdrawals((withRes.data || []) as Withdrawal[]);
  };

  const isVerified = accounts.some(acc => acc.is_verified);

  const handleLinkAccount = async () => {
    if (!user || !platform || !accountLink) return;
    setSubmittingAccount(true);
    const { error } = await supabase.from("social_media_accounts").insert({
      user_id: user.id,
      platform,
      account_link: accountLink,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account linked", description: "Admin will verify your account shortly." });
      setPlatform("");
      setAccountLink("");
      fetchData();
    }
    setSubmittingAccount(false);
  };

  const handleSubmitVideo = async (challengeId: string) => {
    if (!user || !videoLink) return;
    setSubmittingVideo(challengeId);
    const { error } = await supabase.from("social_media_submissions").insert({
      user_id: user.id,
      challenge_id: challengeId,
      video_link: videoLink,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Video submitted", description: "Your submission is pending review." });
      setVideoLink("");
      setSubmittingVideo(null);
      fetchData();
    }
  };

  const handleUpdateBank = async () => {
    if (!user || !bankName || !accountNumber || !accountName) {
      toast({ title: "Error", description: "Please fill all bank details." });
      return;
    }
    setUpdatingBank(true);
    const { error } = await supabase.from("profiles").update({
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
    }).eq("id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bank details updated" });
      refreshProfile();
    }
    setUpdatingBank(false);
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawalAmount);
    if (!user || !amount || amount < 30000) {
      toast({ title: "Error", description: "Minimum withdrawal is ₦30,000" });
      return;
    }
    if (amount > (profile?.social_bonus_balance || 0)) {
      toast({ title: "Error", description: "Insufficient balance" });
      return;
    }
    if (!profile?.bank_name || !profile?.account_number) {
      toast({ title: "Error", description: "Please update your bank details first" });
      return;
    }

    setProcessingWithdrawal(true);
    const { error } = await supabase.from("social_withdrawals").insert({
      user_id: user.id,
      amount_naira: amount,
      bank_name: profile.bank_name,
      account_number: profile.account_number,
      account_name: profile.account_name || "",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const newBalance = (profile.social_bonus_balance || 0) - amount;
      await supabase.from("profiles").update({ social_bonus_balance: newBalance }).eq("id", user.id);
      toast({ title: "Withdrawal requested", description: "Your request will be processed within 24 hours." });
      setWithdrawalAmount("");
      fetchData();
      refreshProfile();
    }
    setProcessingWithdrawal(false);
  };

  const handleConvertToPoints = async () => {
    if (!user || !(profile?.social_bonus_balance || 0)) return;
    const amount = profile.social_bonus_balance || 0;
    const points = amount * 2;

    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      social_bonus_balance: 0,
      points_balance: (profile.points_balance || 0) + points,
    }).eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Converted to Points", description: `Added ${points.toLocaleString()} points to your balance.` });
      refreshProfile();
    }
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl glass">
        {[
          { id: 'account', label: 'Verify', icon: Link },
          { id: 'challenges', label: 'Earn', icon: Video },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
              activeTab === tab.id ? "clay-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'account' && (
          <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <GlassCard variant="strong">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-[13px]">Verification Process</h3>
              </div>
              <p className="text-[12px] text-muted-foreground mb-4">
                To participate in challenges, you must link and verify your social media account.
                <br /><br />
                <strong className="text-foreground">Condition:</strong> Your account description/bio MUST contain the email you used to register on Reallo (<span className="text-primary font-mono">{user.email}</span>).
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Platform</label>
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-foreground text-[13px] bg-transparent"
                  >
                    <option value="" className="bg-background">Select Platform</option>
                    <option value="TikTok" className="bg-background">TikTok</option>
                    <option value="Instagram" className="bg-background">Instagram</option>
                    <option value="YouTube" className="bg-background">YouTube</option>
                    <option value="Twitter/X" className="bg-background">Twitter / X</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Profile Link</label>
                  <input
                    value={accountLink}
                    onChange={e => setAccountLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-foreground text-[13px]"
                  />
                </div>
                <GlassButton
                  variant="primary"
                  className="w-full text-[13px]"
                  onClick={handleLinkAccount}
                  disabled={submittingAccount || !platform || !accountLink}
                >
                  {submittingAccount ? "Linking..." : "Link Account"}
                </GlassButton>
              </div>
            </GlassCard>

            {accounts.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider">Linked Accounts</p>
                {accounts.map(acc => (
                  <GlassCard key={acc.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{acc.platform}</p>
                      <a href={acc.account_link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline truncate max-w-[200px] block">
                        {acc.account_link}
                      </a>
                    </div>
                    {acc.is_verified ? (
                      <div className="flex items-center gap-1 text-primary text-[11px]">
                        <Check className="w-3 h-3" /> Verified
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                        <AlertCircle className="w-3 h-3" /> Pending
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'challenges' && (
          <motion.div key="challenges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {!isVerified ? (
              <GlassCard className="py-8 text-center flex flex-col items-center">
                <Lock className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-[13px] text-muted-foreground">Verify your social media account to view challenges.</p>
                <GlassButton variant="outline" onClick={() => setActiveTab('account')} className="mt-4 text-[12px]">Go to Verification</GlassButton>
              </GlassCard>
            ) : (
              <>
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider">Ongoing Challenges</p>
                  {challenges.length === 0 && (
                    <GlassCard className="py-8 text-center text-muted-foreground text-[12px]">No active challenges at the moment.</GlassCard>
                  )}
                  {challenges.map(chal => (
                    <GlassCard key={chal.id} variant="strong" className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-foreground text-[14px]">{chal.title}</h4>
                        <span className="text-primary font-bold text-[14px]">₦{chal.reward_naira.toLocaleString()}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground whitespace-pre-wrap">{chal.description}</p>

                      {submittingVideo === chal.id ? (
                        <div className="space-y-2">
                          <input
                            value={videoLink}
                            onChange={e => setVideoLink(e.target.value)}
                            placeholder="Link to your video submission"
                            className="w-full glass-input rounded-xl px-3 py-2 text-foreground text-[12px]"
                          />
                          <div className="flex gap-2">
                            <GlassButton variant="primary" onClick={() => handleSubmitVideo(chal.id)} className="flex-1 text-[12px]">Submit</GlassButton>
                            <GlassButton variant="outline" onClick={() => setSubmittingVideo(null)} className="flex-1 text-[12px]">Cancel</GlassButton>
                          </div>
                        </div>
                      ) : (
                        <GlassButton
                          variant="primary"
                          className="w-full text-[12px]"
                          onClick={() => setSubmittingVideo(chal.id)}
                          disabled={submissions.some(s => s.challenge_id === chal.id && (s.status === 'pending' || s.status === 'approved'))}
                        >
                          {submissions.some(s => s.challenge_id === chal.id && s.status === 'pending') ? "Pending Approval" :
                           submissions.some(s => s.challenge_id === chal.id && s.status === 'approved') ? "Already Completed" : "Join Challenge"}
                        </GlassButton>
                      )}
                    </GlassCard>
                  ))}
                </div>

                {submissions.length > 0 && (
                  <div className="space-y-2 pt-4">
                    <p className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider">Your Submissions</p>
                    {submissions.map(sub => {
                      const chal = challenges.find(c => c.id === sub.challenge_id);
                      return (
                        <GlassCard key={sub.id} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">{chal?.title || "Unknown Challenge"}</p>
                            <a href={sub.video_link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                              View Video <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                          <div className="text-right">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                              sub.status === 'approved' ? 'bg-primary/20 text-primary' :
                              sub.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-muted/50 text-muted-foreground'
                            }`}>
                              {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                            </span>
                            {sub.reward_paid_naira && <p className="text-[11px] text-primary font-bold mt-1">+₦{sub.reward_paid_naira.toLocaleString()}</p>}
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'wallet' && (
          <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <GlassCard variant="glow" className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-1">Cash Balance</p>
              <h2 className="font-display text-3xl font-bold gradient-text">₦{(profile?.social_bonus_balance || 0).toLocaleString()}</h2>
              <div className="flex gap-2 mt-4">
                <GlassButton variant="primary" className="flex-1 text-[12px]" onClick={handleConvertToPoints} disabled={loading || !(profile?.social_bonus_balance || 0)}>
                  Add to Claimable Balance (1:2)
                </GlassButton>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <Info className="w-3 h-3" /> Converting ₦1 gives you 2 points towards your goal.
              </p>
            </GlassCard>

            <GlassCard variant="strong">
              <h3 className="font-semibold text-foreground text-[13px] mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Nigerian Bank Account
              </h3>
              <div className="space-y-3">
                <select
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-foreground text-[13px] bg-transparent"
                >
                  <option value="" className="bg-background">Select Bank</option>
                  {NIGERIAN_BANKS.map(bank => (
                    <option key={bank} value={bank} className="bg-background">{bank}</option>
                  ))}
                </select>
                <input
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Account Number"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-foreground text-[13px]"
                />
                <input
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="Account Name"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-foreground text-[13px]"
                />
                <GlassButton variant="outline" className="w-full text-[12px]" onClick={handleUpdateBank} disabled={updatingBank}>
                  {updatingBank ? "Updating..." : "Update Bank Details"}
                </GlassButton>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold text-foreground text-[13px] mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" /> Withdraw to Bank
              </h3>
              <p className="text-[11px] text-muted-foreground mb-3">Minimum withdrawal: ₦30,000</p>
              <div className="space-y-3">
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={e => setWithdrawalAmount(e.target.value)}
                  placeholder="Amount (₦)"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-foreground text-[13px]"
                />
                <GlassButton
                  variant="primary"
                  className="w-full text-[12px]"
                  onClick={handleWithdraw}
                  disabled={processingWithdrawal || Number(withdrawalAmount) < 30000 || Number(withdrawalAmount) > (profile?.social_bonus_balance || 0)}
                >
                  {processingWithdrawal ? "Processing..." : "Request Withdrawal"}
                </GlassButton>
              </div>
            </GlassCard>

            {withdrawals.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3 h-3" /> Withdrawal History
                </p>
                {withdrawals.map(w => (
                  <GlassCard key={w.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">₦{w.amount_naira.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      w.status === 'completed' ? 'bg-primary/20 text-primary' :
                      w.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-muted/50 text-muted-foreground'
                    }`}>
                      {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                    </span>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialMediaFlow;
