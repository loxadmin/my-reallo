import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Send, CheckCircle2, AlertCircle, Video, CreditCard, Wallet, ArrowLeft, ExternalLink, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SocialAccount {
  id: string;
  account_link: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface SocialChallenge {
  id: string;
  title: string;
  description: string;
  hashtag: string | null;
  action_required: string | null;
  words_to_say: string | null;
  reward_naira: number;
}

interface SocialSubmission {
  id: string;
  challenge_id: string;
  video_link: string;
  status: 'pending' | 'approved' | 'rejected';
  reward_naira: number;
}

const NIGERIAN_BANKS = [
  "Access Bank", "Access Bank (Diamond)", "ALAT by WEMA", "ASO Savings and Loans", "Bowen Microfinance Bank",
  "Carbon", "CEMCS Microfinance Bank", "Citibank Nigeria", "Ecobank Nigeria", "Ekondo Microfinance Bank",
  "Eyowo", "Fidelity Bank", "First Bank of Nigeria", "First City Monument Bank", "Globus Bank",
  "Guaranty Trust Bank", "Hasal Microfinance Bank", "Heritage Bank", "Jaiz Bank", "Keystone Bank",
  "Kuda Bank", "Lotus Bank", "Mint MFB", "Paga", "PalmPay", "Parallex Bank", "Parkway - ReadyCash",
  "Paycom (OPay)", "Polaris Bank", "Providus Bank", "Rubies MFB", "Sparkle Microfinance Bank",
  "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank", "Suntrust Bank", "TAJ Bank",
  "TCF MFB", "Titan Bank", "Union Bank of Nigeria", "United Bank For Africa", "Unity Bank",
  "VFD Microfinance Bank", "Wema Bank", "Zenith Bank"
].sort();

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const SocialMediaFlow = ({ onBack }: { onBack: () => void }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [account, setAccount] = useState<SocialAccount | null>(null);
  const [challenges, setChallenges] = useState<SocialChallenge[]>([]);
  const [submissions, setSubmissions] = useState<SocialSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [accountLink, setAccountLink] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    bank_name: profile?.bank_name || "",
    account_number: profile?.account_number || "",
    account_name: profile?.account_name || "",
  });
  const [activeTab, setActiveTab] = useState<'challenges' | 'bank' | 'history'>('challenges');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [accRes, challRes, subRes] = await Promise.all([
      supabase.from("social_media_accounts").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("social_media_challenges").select("*").eq("is_active", true),
      supabase.from("social_media_submissions").select("*").eq("user_id", user.id),
    ]);

    setAccount(accRes.data as SocialAccount | null);
    setChallenges(challRes.data as SocialChallenge[] || []);
    setSubmissions(subRes.data as SocialSubmission[] || []);
    setLoading(false);
  };

  const handleSubmitAccount = async () => {
    if (!user || !accountLink) return;
    const { error } = await supabase.from("social_media_accounts").insert({
      user_id: user.id,
      account_link: accountLink,
    });
    if (error) {
      toast({ title: "Submission failed", description: error.message });
    } else {
      toast({ title: "Account submitted", description: "Admin will verify your account. Please ensure your email is in your account description." });
      fetchData();
    }
  };

  const handleSubmitVideo = async () => {
    if (!user || !videoLink || !selectedChallengeId) return;
    const chall = challenges.find(c => c.id === selectedChallengeId);
    if (!chall) return;

    const { error } = await supabase.from("social_media_submissions").insert({
      user_id: user.id,
      challenge_id: selectedChallengeId,
      video_link: videoLink,
      reward_naira: chall.reward_naira,
    });

    if (error) {
      toast({ title: "Submission failed", description: error.message });
    } else {
      toast({ title: "Video submitted", description: "Admin will review your video." });
      setVideoLink("");
      setSelectedChallengeId(null);
      fetchData();
    }
  };

  const handleUpdateBank = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      bank_name: bankForm.bank_name,
      account_number: bankForm.account_number,
      account_name: bankForm.account_name,
    }).eq("id", user.id);

    if (error) {
      toast({ title: "Update failed", description: error.message });
    } else {
      toast({ title: "Bank details updated" });
      refreshProfile();
    }
  };

  const handleWithdraw = async () => {
    const bonus = Number((profile as any)?.social_bonus_balance || 0);
    if (bonus < 30000) {
      toast({ title: "Threshold not reached", description: "You need at least ₦30,000 to withdraw." });
      return;
    }
    if (!profile?.bank_name || !profile?.account_number || !profile?.account_name) {
      toast({ title: "Bank details missing", description: "Please add your bank details first." });
      setActiveTab('bank');
      return;
    }

    const { error: withdrawError } = await supabase.from("social_withdrawals").insert({
      user_id: user!.id,
      amount_naira: bonus,
      bank_name: profile.bank_name,
      account_number: profile.account_number,
      account_name: profile.account_name,
    });

    if (withdrawError) {
      toast({ title: "Withdrawal failed", description: withdrawError.message });
      return;
    }

    const { error: updateError } = await supabase.from("profiles").update({
      social_bonus_balance: 0
    }).eq("id", user!.id);

    if (updateError) {
      toast({ title: "Balance update failed", description: updateError.message });
    } else {
      toast({ title: "Withdrawal requested", description: "Admin will process your payment to your bank account." });
      refreshProfile();
    }
  };

  const handleConvertToPoints = async () => {
    const bonus = Number((profile as any)?.social_bonus_balance || 0);
    if (bonus <= 0) return;

    const pointsToAdd = Math.floor(bonus * 2);
    const { error } = await supabase.from("profiles").update({
      social_bonus_balance: 0,
      points_balance: (profile?.points_balance || 0) + pointsToAdd,
    }).eq("id", user!.id);

    if (error) {
      toast({ title: "Conversion failed", description: error.message });
    } else {
      toast({ title: "Bonus converted!", description: `${formatNaira(bonus)} converted to ${pointsToAdd.toLocaleString()} points.` });
      refreshProfile();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground text-[13px]">Loading Social Rewards...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <GlassButton variant="outline" onClick={onBack} className="h-9 px-3 text-[12px] gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Earn
      </GlassButton>

      {/* Account Verification Section */}
      {!account ? (
        <GlassCard variant="strong" className="space-y-4">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-[14px]">Social Media Verification</h3>
          </div>
          <p className="text-[12px] text-muted-foreground">
            To start earning social bonuses, provide your social media account link.
            <span className="font-semibold text-primary"> Your email ({user?.email}) must be in your account description/bio</span> for verification.
          </p>
          <input
            value={accountLink}
            onChange={(e) => setAccountLink(e.target.value)}
            placeholder="TikTok/Instagram/Twitter link..."
            className="w-full glass-input rounded-xl px-4 py-3 text-[13px] text-foreground"
          />
          <GlassButton variant="primary" onClick={handleSubmitAccount} className="w-full h-11" disabled={!accountLink}>
            Submit for Verification
          </GlassButton>
        </GlassCard>
      ) : account.status === 'pending' ? (
        <GlassCard className="text-center py-8 space-y-3">
          <AlertCircle className="w-10 h-10 text-primary/50 mx-auto" />
          <h3 className="font-semibold text-foreground text-[14px]">Account Verification Pending</h3>
          <p className="text-[12px] text-muted-foreground">
            Our admin team is verifying your account: <span className="font-mono">{account.account_link}</span>.
            Check back soon!
          </p>
        </GlassCard>
      ) : account.status === 'rejected' ? (
        <GlassCard variant="strong" className="text-center py-8 space-y-3 border-destructive/20">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h3 className="font-semibold text-foreground text-[14px]">Verification Failed</h3>
          <p className="text-[12px] text-muted-foreground">
            Your account was not verified. Please ensure your email is in your bio and resubmit.
          </p>
          <GlassButton variant="outline" onClick={() => {
            supabase.from("social_media_accounts").delete().eq("id", account.id).then(() => fetchData());
          }} className="mx-auto">Resubmit Account</GlassButton>
        </GlassCard>
      ) : (
        /* Verified Flow */
        <div className="space-y-4">
          {/* Dashboard Header */}
          <GlassCard variant="glow" className="flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Social Bonus</p>
              <p className="text-xl font-bold text-primary">{formatNaira(Number((profile as any)?.social_bonus_balance || 0))}</p>
            </div>
            <div className="flex gap-2">
              <GlassButton variant="outline" onClick={handleConvertToPoints} className="h-9 text-[11px] px-3">
                Convert to Points
              </GlassButton>
              <GlassButton variant="primary" onClick={handleWithdraw} className="h-9 text-[11px] px-3" disabled={Number((profile as any)?.social_bonus_balance || 0) < 30000}>
                Withdraw
              </GlassButton>
            </div>
          </GlassCard>

          {/* Navigation Tabs */}
          <div className="flex gap-1 p-1 rounded-xl glass">
            {(['challenges', 'bank', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all capitalize ${
                  activeTab === tab ? "clay-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'challenges' && (
              <motion.div key="chall" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {challenges.length === 0 && (
                  <GlassCard className="text-center py-8">
                    <p className="text-muted-foreground text-[12px]">No active challenges at the moment.</p>
                  </GlassCard>
                )}
                {challenges.map(chall => {
                  const sub = submissions.find(s => s.challenge_id === chall.id);
                  return (
                    <GlassCard key={chall.id} className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground text-[14px]">{chall.title}</h4>
                          <p className="text-[11px] text-primary font-bold">Reward: {formatNaira(chall.reward_naira)}</p>
                        </div>
                        {sub && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            sub.status === 'approved' ? 'bg-primary/20 text-primary' :
                            sub.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {sub.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground">{chall.description}</p>

                      <div className="grid grid-cols-1 gap-2 bg-muted/20 p-2 rounded-lg text-[11px]">
                        {chall.hashtag && <p><span className="text-primary font-medium">Hashtag:</span> {chall.hashtag}</p>}
                        {chall.action_required && <p><span className="text-primary font-medium">Action:</span> {chall.action_required}</p>}
                        {chall.words_to_say && <p><span className="text-primary font-medium">Words:</span> "{chall.words_to_say}"</p>}
                      </div>

                      {!sub && selectedChallengeId !== chall.id && (
                        <GlassButton variant="primary" onClick={() => setSelectedChallengeId(chall.id)} className="w-full h-9 text-[12px]">
                          Join Challenge
                        </GlassButton>
                      )}

                      {selectedChallengeId === chall.id && (
                        <div className="space-y-2 pt-2 border-t border-border/30">
                          <input
                            value={videoLink}
                            onChange={(e) => setVideoLink(e.target.value)}
                            placeholder="Link to your video..."
                            className="w-full glass-input rounded-xl px-3 py-2 text-[12px] text-foreground"
                          />
                          <div className="flex gap-2">
                            <GlassButton variant="primary" onClick={handleSubmitVideo} className="flex-1 h-9 text-[12px]" disabled={!videoLink}>
                              Submit Video
                            </GlassButton>
                            <GlassButton variant="outline" onClick={() => setSelectedChallengeId(null)} className="h-9 text-[12px]">
                              Cancel
                            </GlassButton>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'bank' && (
              <motion.div key="bank" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <GlassCard variant="strong" className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-[14px]">Nigerian Bank Account</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Add your bank details to withdraw your social bonuses.</p>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 ml-1">Bank Name</p>
                      <select
                        value={bankForm.bank_name}
                        onChange={(e) => setBankForm(prev => ({ ...prev, bank_name: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-3 text-[13px] text-foreground bg-transparent"
                      >
                        <option value="" className="bg-background">Select Bank</option>
                        {NIGERIAN_BANKS.map(bank => <option key={bank} value={bank} className="bg-background">{bank}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 ml-1">Account Number</p>
                      <input
                        value={bankForm.account_number}
                        onChange={(e) => setBankForm(prev => ({ ...prev, account_number: e.target.value }))}
                        placeholder="10-digit account number"
                        maxLength={10}
                        className="w-full glass-input rounded-xl px-4 py-3 text-[13px] text-foreground"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 ml-1">Account Name</p>
                      <input
                        value={bankForm.account_name}
                        onChange={(e) => setBankForm(prev => ({ ...prev, account_name: e.target.value }))}
                        placeholder="Name on account"
                        className="w-full glass-input rounded-xl px-4 py-3 text-[13px] text-foreground"
                      />
                    </div>
                  </div>

                  <GlassButton variant="primary" onClick={handleUpdateBank} className="w-full h-11">
                    Save Bank Details
                  </GlassButton>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {submissions.length === 0 && (
                  <GlassCard className="text-center py-8">
                    <p className="text-muted-foreground text-[12px]">No submission history.</p>
                  </GlassCard>
                )}
                {submissions.map(sub => {
                  const chall = challenges.find(c => c.id === sub.challenge_id);
                  return (
                    <div key={sub.id} className="glass rounded-xl p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-[13px] font-semibold text-foreground truncate">{chall?.title || "Unknown Challenge"}</p>
                        <a href={sub.video_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          View Video <ExternalLink className="w-2 h-2" />
                        </a>
                      </div>
                      <div className="text-right">
                        <p className={`text-[12px] font-bold ${sub.status === 'approved' ? 'text-primary' : sub.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {sub.status === 'approved' ? `+${formatNaira(sub.reward_naira)}` : sub.status.toUpperCase()}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default SocialMediaFlow;
