import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import GlassInput from "./GlassInput";
import { Award, CheckCircle2, Clock, Upload, Link as LinkIcon, ExternalLink, Wallet, Landmark, AlertCircle, Copy, Check, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank", "First Bank of Nigeria",
  "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank (GTBank)", "Heritage Bank",
  "Keystone Bank", "Lotus Bank", "Optimis Bank", "Parallex Bank", "Polaris Bank", "Providus Bank",
  "PremiumTrust Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank", "SunTrust Bank",
  "Titan Trust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)", "Unity Bank", "Wema Bank", "Zenith Bank"
].sort();

const InfluencerFlow = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [socialLink, setSocialLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isVerifyingName, setIsVerifyingName] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id)
        .then(({ count }) => setReferralCount(count || 0));
    }
  }, [user]);

  const handleApplyLink = async () => {
    if (!socialLink.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("profiles").update({
      influencer_status: "link_pending",
      influencer_social_link: socialLink
    }).eq("id", user!.id);

    if (error) toast({ title: "Error", description: error.message });
    else {
      toast({ title: "Application Submitted", description: "Admin will review your social media link." });
      await refreshProfile();
    }
    setSubmitting(false);
  };

  const handleIdUpload = async (file: File) => {
    if (!user) return;
    setUploadingId(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/id-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("influencer_ids")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message });
      setUploadingId(false);
      return;
    }

    const { error: updateError } = await supabase.from("profiles").update({
      influencer_id_url: filePath
    }).eq("id", user.id);

    if (updateError) toast({ title: "Error", description: updateError.message });
    else toast({ title: "ID Uploaded", description: "Your identification has been submitted." });

    await refreshProfile();
    setUploadingId(false);
  };

  const verifyAccountName = async () => {
    if (accountNumber.length === 10 && bankName) {
      setIsVerifyingName(true);
      // Simulate bank name verification API
      setTimeout(() => {
        setAccountName("NAME VERIFIED: " + (user?.email?.split('@')[0].toUpperCase() || "USER"));
        setIsVerifyingName(false);
      }, 1500);
    }
  };

  const handleFinalSubmit = async () => {
    if (!bankName || !accountNumber || !accountName || !profile?.influencer_id_url) {
      toast({ title: "Missing Information", description: "Please complete all fields and upload your ID." });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("profiles").update({
      influencer_status: "verification_pending",
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName
    }).eq("id", user!.id);

    if (error) toast({ title: "Error", description: error.message });
    else {
      toast({ title: "Verification Pending", description: "Admin will review your details." });
      await refreshProfile();
    }
    setSubmitting(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawalAmount);
    const balance = Number(profile?.influencer_wallet_balance || 0);
    if (isNaN(amount) || amount < 30000) {
      toast({ title: "Invalid Amount", description: "Minimum withdrawal is ₦30,000." });
      return;
    }
    if (amount > balance) {
      toast({ title: "Insufficient Funds", description: "You don't have enough balance." });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("influencer_withdrawals").insert({
      user_id: user!.id,
      amount: amount,
      status: "pending"
    });

    if (error) toast({ title: "Error", description: error.message });
    else {
      // Deduct from balance
      await supabase.from("profiles").update({
        influencer_wallet_balance: balance - amount
      }).eq("id", user!.id);

      toast({ title: "Withdrawal Requested", description: "Admin will process your payment." });
      setWithdrawalAmount("");
      await refreshProfile();
    }
    setSubmitting(false);
  };

  const handleCopy = () => {
    const referralLink = `${window.location.origin}/auth?ref=${profile?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = profile?.influencer_status || "none";

  if (status === "none") {
    return (
      <GlassCard variant="glow" className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-[14px]">Become an Influencer</h3>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Request to become an influencer to earn ₦500 per referral to your withdrawal wallet.
          Your social media account must be public and have your registration email ({user?.email}) in the bio.
        </p>
        <div className="space-y-3">
          <GlassInput
            placeholder="Link to your social media (Instagram, TikTok, etc.)"
            value={socialLink}
            onChange={(e) => setSocialLink(e.target.value)}
            className="text-[13px]"
          />
          <GlassButton variant="primary" onClick={handleApplyLink} disabled={submitting} className="w-full text-[13px]">
            {submitting ? "Submitting..." : "Submit for Approval"}
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  if (status === "link_pending") {
    return (
      <GlassCard className="text-center py-8 space-y-3">
        <Clock className="w-10 h-10 text-primary/40 mx-auto animate-pulse" />
        <h3 className="font-semibold text-foreground text-[15px]">Link Review Pending</h3>
        <p className="text-[12px] text-muted-foreground px-4">
          Admin is reviewing your social media link: <br/>
          <span className="text-primary font-mono text-[11px] break-all">{profile?.influencer_social_link}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">This usually takes 24-48 hours.</p>
      </GlassCard>
    );
  }

  if (status === "link_approved") {
    return (
      <GlassCard variant="glow" className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-[14px]">Link Approved!</h3>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Your social media was approved. Now, provide your ID and bank details to activate your Influencer Wallet.
        </p>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground ml-1">Means of Identification</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/20 rounded-xl p-4 text-center cursor-pointer hover:bg-primary/5 transition-colors"
            >
              {profile?.influencer_id_url ? (
                <div className="flex items-center justify-center gap-2 text-primary text-[12px] font-medium">
                  <CheckCircle2 className="w-4 h-4" /> ID Uploaded
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-primary/60" />
                  <p className="text-[11px] text-muted-foreground">{uploadingId ? "Uploading..." : "Click to upload ID (Passport, NIN, etc.)"}</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleIdUpload(e.target.files[0])} className="hidden" accept="image/*" />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground ml-1">Bank Name</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] bg-transparent appearance-none"
            >
              <option value="" className="bg-background">Select Bank</option>
              {NIGERIAN_BANKS.map(bank => <option key={bank} value={bank} className="bg-background">{bank}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground ml-1">Account Number</label>
            <GlassInput
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
              onBlur={verifyAccountName}
              className="text-[13px]"
            />
          </div>

          {isVerifyingName && <p className="text-[10px] text-primary animate-pulse ml-1">Verifying account name...</p>}
          {accountName && <p className="text-[11px] text-primary font-semibold ml-1">{accountName}</p>}

          <GlassButton
            variant="primary"
            onClick={handleFinalSubmit}
            disabled={submitting || !accountName || !profile?.influencer_id_url}
            className="w-full text-[13px] mt-2"
          >
            {submitting ? "Submitting..." : "Activate Wallet"}
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  if (status === "verification_pending") {
    return (
      <GlassCard className="text-center py-8 space-y-3">
        <Clock className="w-10 h-10 text-primary/40 mx-auto animate-pulse" />
        <h3 className="font-semibold text-foreground text-[15px]">Verification Pending</h3>
        <p className="text-[12px] text-muted-foreground px-4">
          Admin is reviewing your identification and bank details to activate your influencer wallet.
        </p>
        <div className="glass rounded-xl p-3 text-left max-w-xs mx-auto space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase">Bank Account</p>
          <p className="text-[12px] text-foreground font-medium">{profile?.bank_name}</p>
          <p className="text-[13px] font-mono text-primary">{profile?.account_number}</p>
          <p className="text-[11px] text-foreground">{profile?.account_name}</p>
        </div>
      </GlassCard>
    );
  }

  if (status === "approved") {
    const balance = Number(profile?.influencer_wallet_balance || 0);
    return (
      <div className="space-y-4">
        {/* Wallet Balance Card */}
        <GlassCard variant="glow" className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-medium">Influencer Wallet</p>
              <h2 className="font-display text-2xl font-bold gradient-text tabular-nums">₦{balance.toLocaleString()}</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="glass rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Total Referrals</p>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-[14px] font-bold text-foreground">{referralCount}</span>
              </div>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Reward per Ref</p>
              <p className="text-[14px] font-bold text-primary">₦500</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground ml-1">Your Referral Link</p>
            <div className="flex gap-2">
              <div className="flex-1 glass rounded-xl px-3 py-2 text-[11px] font-mono text-foreground truncate border border-primary/10">
                {window.location.origin}/auth?ref={profile?.referral_code}
              </div>
              <GlassButton variant="outline" onClick={handleCopy} className="px-3 h-9 rounded-xl">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        {/* Withdrawal Card */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-[14px]">Withdraw Funds</h3>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Withdraw your earnings directly to your bank: <span className="text-foreground font-medium">{profile?.bank_name} ({profile?.account_number})</span>.
            Minimum withdrawal: <span className="text-primary font-semibold">₦30,000</span>.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-medium">₦</span>
              <input
                type="number"
                placeholder="0.00"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="w-full glass-input rounded-xl pl-8 pr-4 py-3 text-foreground text-[14px] focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <GlassButton
              variant="primary"
              onClick={handleWithdraw}
              disabled={submitting || !withdrawalAmount || Number(withdrawalAmount) < 30000 || Number(withdrawalAmount) > balance}
              className="w-full text-[13px]"
            >
              {submitting ? "Processing..." : "Request Withdrawal"}
            </GlassButton>
            {balance < 30000 && (
              <div className="flex items-center gap-1.5 justify-center text-amber-500/80">
                <AlertCircle className="w-3.5 h-3.5" />
                <p className="text-[10px]">Earn ₦{ (30000 - balance).toLocaleString() } more to withdraw</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    );
  }

  return null;
};

export default InfluencerFlow;
