import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "./GlassCard";
import GlassButton from "./GlassButton";
import { Users, Wallet, ArrowDownToLine, Star, Upload, CheckCircle2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Bank { name: string; code: string; }
interface InfluencerApp { id: string; status: string; social_link: string; }
interface InfluencerWallet { id: string; balance: number; status: string; }
interface BankAccount { id: string; bank_name: string; bank_code: string; account_number: string; account_name: string; verification_status: string; id_document_url: string | null; }
interface InfluencerReferral { id: string; referred_user_id: string; reward_amount: number; created_at: string; }
interface Withdrawal { id: string; amount: number; status: string; created_at: string; }

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const InfluencerPanel = () => {
  const { user, profile } = useAuth();
  const [application, setApplication] = useState<InfluencerApp | null>(null);
  const [wallet, setWallet] = useState<InfluencerWallet | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [referrals, setReferrals] = useState<InfluencerReferral[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  // Application form
  const [socialPlatform, setSocialPlatform] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [applying, setApplying] = useState(false);

  // Bank verification
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);

  // ID upload
  const idInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);

  // Activation
  const [activating, setActivating] = useState(false);

  // Withdrawal
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // Tab
  const [tab, setTab] = useState<"overview" | "withdraw">("overview");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [appRes, walletRes, bankRes, refRes, wdRes] = await Promise.all([
      supabase.from("influencer_applications" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("influencer_wallets" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("influencer_bank_accounts" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("influencer_referrals" as any).select("*").eq("influencer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("influencer_withdrawals" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setApplication((appRes.data as any) || null);
    setWallet((walletRes.data as any) || null);
    const ba = (bankRes.data as any) || null;
    setBankAccount(ba);
    setIdDocUrl(ba?.id_document_url || null);
    setReferrals(((refRes.data as any) || []) as InfluencerReferral[]);
    setWithdrawals(((wdRes.data as any) || []) as Withdrawal[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleApply = async () => {
    if (!user || !socialLink.trim()) return;
    setApplying(true);
    const { error } = await supabase.from("influencer_applications" as any).insert({
      user_id: user.id,
      social_link: socialLink.trim(),
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      toast({ title: "Application Submitted", description: "We'll review your application soon." });
    }
    setApplying(false);
    await fetchData();
  };

  const loadBanks = async () => {
    setBanksLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/paystack-bank?action=list-banks`,
        {
          headers: {
            "Authorization": `Bearer ${anonKey}`,
            "apikey": anonKey,
          },
        }
      );
      const result = await res.json();
      if (result.data) {
        setBanks(result.data.map((b: any) => ({ name: b.name, code: b.code })));
      } else {
        console.error("Bank load response:", result);
        toast({ title: "Error", description: result.error || "Failed to load banks" });
      }
    } catch (err) {
      console.error("Bank load error:", err);
      toast({ title: "Error", description: "Failed to load banks" });
    }
    setBanksLoading(false);
  };

  useEffect(() => {
    if (application?.status === "approved" && !bankAccount && banks.length === 0) {
      loadBanks();
    }
  }, [application, bankAccount]);

  const handleVerifyAccount = async () => {
    if (!accountNumber || !selectedBank) return;
    setVerifying(true);
    try {
      const bankCode = banks.find(b => b.name === selectedBank)?.code;
      if (!bankCode) { setVerifying(false); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/paystack-bank?action=resolve-account&account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      const data = await res.json();
      if (data.data?.account_name) {
        setAccountName(data.data.account_name);
        toast({ title: "Account Verified", description: data.data.account_name });
      } else {
        toast({ title: "Verification Failed", description: data.message || "Could not verify account" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to verify account" });
    }
    setVerifying(false);
  };

  const handleUploadId = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("id-documents").upload(path, file);
    if (error) {
      toast({ title: "Upload Failed", description: error.message });
    } else {
      setIdDocUrl(path);
      toast({ title: "ID Uploaded" });
    }
    setUploading(false);
  };

  const handleActivateWallet = async () => {
    if (!user || !accountName || !selectedBank || !accountNumber || !idDocUrl) return;
    setActivating(true);
    const bankCode = banks.find(b => b.name === selectedBank)?.code || "";

    // Save bank account
    const { error: bankErr } = await supabase.from("influencer_bank_accounts" as any).insert({
      user_id: user.id,
      bank_name: selectedBank,
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
      id_document_url: idDocUrl,
    } as any);

    if (bankErr) {
      toast({ title: "Error", description: bankErr.message });
      setActivating(false);
      return;
    }

    // Create wallet
    const { error: walletErr } = await supabase.from("influencer_wallets" as any).insert({
      user_id: user.id,
      status: "pending_activation",
    } as any);

    if (walletErr) {
      toast({ title: "Error", description: walletErr.message });
    } else {
      toast({ title: "Wallet Activation Requested", description: "Admin will review your details." });
    }
    setActivating(false);
    await fetchData();
  };

  const handleWithdraw = async () => {
    if (!user || !wallet || !bankAccount) return;
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 30000) {
      toast({ title: "Minimum ₦30,000", description: "You need at least ₦30,000 to withdraw." });
      return;
    }
    if (amount > wallet.balance) {
      toast({ title: "Insufficient Balance", description: `Your balance is ${formatNaira(wallet.balance)}` });
      return;
    }
    setWithdrawing(true);
    const { error } = await supabase.from("influencer_withdrawals" as any).insert({
      user_id: user.id,
      amount,
      bank_account_id: bankAccount.id,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message });
    } else {
      toast({ title: "Withdrawal Requested", description: "Admin will process your withdrawal." });
      setWithdrawAmount("");
    }
    setWithdrawing(false);
    await fetchData();
  };

  if (loading) return <GlassCard className="p-6 text-center"><p className="text-muted-foreground text-[13px]">Loading...</p></GlassCard>;

  // Step 1: No application yet
  if (!application) {
    return (
      <GlassCard variant="glow" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-[15px]">Become an Influencer</h3>
        </div>
        <p className="text-muted-foreground text-[12px] mb-4">
          Share your social media profile to apply. Your account must be public and include your registered email ({user?.email}) in your bio/description.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Select Platform</label>
            <select
              value={socialPlatform}
              onChange={e => { setSocialPlatform(e.target.value); setSocialLink(""); }}
              className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] bg-transparent"
            >
              <option value="" className="bg-background">Choose a platform...</option>
              <option value="instagram" className="bg-background">Instagram</option>
              <option value="tiktok" className="bg-background">TikTok</option>
              <option value="facebook" className="bg-background">Facebook</option>
              <option value="linkedin" className="bg-background">LinkedIn</option>
            </select>
          </div>
          {socialPlatform && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">{socialPlatform.charAt(0).toUpperCase() + socialPlatform.slice(1)} Profile Link</label>
              <input
                value={socialLink}
                onChange={e => setSocialLink(e.target.value)}
                placeholder={
                  socialPlatform === "instagram" ? "https://instagram.com/yourprofile" :
                  socialPlatform === "tiktok" ? "https://tiktok.com/@yourprofile" :
                  socialPlatform === "facebook" ? "https://facebook.com/yourprofile" :
                  "https://linkedin.com/in/yourprofile"
                }
                className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]"
              />
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            ✓ Profile must be public &nbsp;•&nbsp; ✓ Email must be visible in bio &nbsp;•&nbsp; ✓ Email must match: {user?.email}
          </p>
          <GlassButton variant="primary" onClick={handleApply} disabled={applying || !socialLink.trim() || !socialPlatform} className="w-full text-[13px]">
            {applying ? "Submitting..." : "Apply as Influencer"}
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  // Step 2: Pending review
  if (application.status === "pending_review") {
    return (
      <GlassCard className="p-5 text-center">
        <Clock className="w-10 h-10 text-primary/40 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground text-[15px] mb-2">Application Under Review</h3>
        <p className="text-muted-foreground text-[12px]">We're reviewing your social media profile. You'll be notified when approved.</p>
        <p className="text-[10px] text-primary mt-3">Submitted: {new Date(application.social_link ? application.social_link : "").toLocaleDateString() || "Recently"}</p>
      </GlassCard>
    );
  }

  // Step 2b: Rejected
  if (application.status === "rejected" || application.status === "appeal_rejected") {
    const reviewedAt = (application as any).reviewed_at ? new Date((application as any).reviewed_at) : null;
    const canAppealAfter = reviewedAt ? new Date(reviewedAt.getTime() + 24 * 60 * 60 * 1000) : null;
    const canAppealNow = canAppealAfter ? new Date() >= canAppealAfter : false;
    const hasAppealed = application.status === "appeal_rejected";

    return (
      <GlassCard className="p-5 text-center">
        <AlertCircle className="w-10 h-10 text-destructive/40 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground text-[15px] mb-2">
          {hasAppealed ? "Appeal Rejected" : "Application Rejected"}
        </h3>
        <p className="text-muted-foreground text-[12px]">
          {hasAppealed
            ? "Your appeal has been reviewed and was not approved. No further appeals are allowed."
            : "Your influencer application was not approved. Please ensure your social media profile is public and contains your registered email."}
        </p>
        {!hasAppealed && canAppealNow && (
          <div className="mt-4 space-y-3">
            <p className="text-[11px] text-primary">You can submit one appeal with an updated profile link.</p>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Select Platform</label>
              <select value={socialPlatform} onChange={e => { setSocialPlatform(e.target.value); setSocialLink(""); }} className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] bg-transparent">
                <option value="" className="bg-background">Choose a platform...</option>
                <option value="instagram" className="bg-background">Instagram</option>
                <option value="tiktok" className="bg-background">TikTok</option>
                <option value="facebook" className="bg-background">Facebook</option>
                <option value="linkedin" className="bg-background">LinkedIn</option>
              </select>
            </div>
            {socialPlatform && (
              <input value={socialLink} onChange={e => setSocialLink(e.target.value)} placeholder={
                socialPlatform === "instagram" ? "https://instagram.com/yourprofile" :
                socialPlatform === "tiktok" ? "https://tiktok.com/@yourprofile" :
                socialPlatform === "facebook" ? "https://facebook.com/yourprofile" :
                "https://linkedin.com/in/yourprofile"
              } className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]" />
            )}
            <GlassButton variant="primary" onClick={async () => {
              if (!socialLink.trim() || !socialPlatform) return;
              setApplying(true);
              await supabase.from("influencer_applications" as any).update({
                social_link: socialLink.trim(),
                status: "pending_appeal",
                reviewed_at: null,
              } as any).eq("id", application.id);
              toast({ title: "Appeal Submitted", description: "Your appeal is under review." });
              setApplying(false);
              await fetchData();
            }} disabled={applying || !socialLink.trim() || !socialPlatform} className="w-full text-[13px]">
              {applying ? "Submitting..." : "Submit Appeal"}
            </GlassButton>
          </div>
        )}
        {!hasAppealed && !canAppealNow && canAppealAfter && (
          <p className="text-[10px] text-muted-foreground mt-3">You can appeal after {canAppealAfter.toLocaleString()}</p>
        )}
      </GlassCard>
    );
  }

  // Step 2c: Appeal pending
  if (application.status === "pending_appeal") {
    return (
      <GlassCard className="p-5 text-center">
        <Clock className="w-10 h-10 text-primary/40 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground text-[15px] mb-2">Appeal Under Review</h3>
        <p className="text-muted-foreground text-[12px]">Your appeal is being reviewed. You'll be notified when a decision is made.</p>
      </GlassCard>
    );
  }

  // Step 3: Approved but no wallet yet — needs bank verification & ID
  if (application.status === "approved" && (!wallet || wallet.status === "pending_activation")) {
    if (!bankAccount) {
      return (
        <GlassCard variant="glow" className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-[15px]">Application Approved!</h3>
          </div>
          <p className="text-muted-foreground text-[12px] mb-4">
            Activate your influencer wallet by verifying your bank account and uploading identification.
          </p>

          <div className="space-y-3">
            {/* Bank Selection */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Select Bank</label>
              <select
                value={selectedBank}
                onChange={e => { setSelectedBank(e.target.value); setAccountName(""); }}
                className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px] bg-transparent"
              >
                <option value="" className="bg-background">Select a bank...</option>
                {banksLoading && <option className="bg-background">Loading banks...</option>}
                {banks.map(b => (
                  <option key={b.code} value={b.name} className="bg-background">{b.name}</option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Account Number</label>
              <div className="flex gap-2">
                <input
                  value={accountNumber}
                  onChange={e => { setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10)); setAccountName(""); }}
                  placeholder="0123456789"
                  maxLength={10}
                  className="flex-1 glass-input rounded-xl px-4 py-3 text-foreground text-[13px]"
                />
                <GlassButton
                  variant="outline"
                  onClick={handleVerifyAccount}
                  disabled={verifying || accountNumber.length !== 10 || !selectedBank}
                  className="px-4 text-[11px]"
                >
                  {verifying ? "..." : "Verify"}
                </GlassButton>
              </div>
            </div>

            {/* Account Name (auto-filled) */}
            {accountName && (
              <div className="glass rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground">Account Name</p>
                <p className="text-foreground font-semibold text-[13px]">{accountName}</p>
              </div>
            )}

            {/* ID Upload */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">Government ID (NIN, Passport, etc.)</label>
              <input ref={idInputRef} type="file" accept="image/*,.pdf" onChange={handleUploadId} className="hidden" />
              <GlassButton variant="outline" onClick={() => idInputRef.current?.click()} disabled={uploading} className="w-full text-[12px]">
                <Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? "Uploading..." : idDocUrl ? "ID Uploaded ✓" : "Upload ID Document"}
              </GlassButton>
            </div>

            {/* Activate */}
            <GlassButton
              variant="primary"
              onClick={handleActivateWallet}
              disabled={activating || !accountName || !idDocUrl}
              className="w-full text-[13px]"
            >
              {activating ? "Submitting..." : "Activate Influencer Wallet"}
            </GlassButton>
          </div>
        </GlassCard>
      );
    }

    // Bank submitted, waiting for admin
    return (
      <GlassCard className="p-5 text-center">
        <Clock className="w-10 h-10 text-primary/40 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground text-[15px] mb-2">Wallet Activation Pending</h3>
        <p className="text-muted-foreground text-[12px]">Admin is reviewing your bank details and ID. You'll be notified when your wallet is activated.</p>
      </GlassCard>
    );
  }

  // Step 4: Active influencer
  if (wallet?.status === "active") {
    const influencerLink = profile?.referral_code
      ? `${window.location.origin}/auth?ref=${profile.referral_code}`
      : "";
    const totalEarned = referrals.reduce((s, r) => s + r.reward_amount, 0);

    return (
      <div className="space-y-4">
        {/* Wallet Card */}
        <GlassCard variant="glow" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground text-[15px]">Influencer Wallet</h3>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab("overview")} className={`flex-1 py-2 rounded-xl text-[12px] font-medium transition-all ${tab === "overview" ? "clay-primary text-primary-foreground" : "glass-button text-muted-foreground"}`}>
              Overview
            </button>
            <button onClick={() => setTab("withdraw")} className={`flex-1 py-2 rounded-xl text-[12px] font-medium transition-all ${tab === "withdraw" ? "clay-primary text-primary-foreground" : "glass-button text-muted-foreground"}`}>
              Withdraw
            </button>
          </div>

          {tab === "overview" && (
            <div className="space-y-4">
              <div className="text-center py-3">
                <p className="text-muted-foreground uppercase tracking-[0.2em] text-[10px]">Balance</p>
                <h2 className="font-display text-2xl font-bold gradient-text">{formatNaira(wallet.balance)}</h2>
                <p className="text-muted-foreground text-[11px] mt-1">Total earned: {formatNaira(totalEarned)}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-[15px] font-bold text-primary">{referrals.length}</p>
                  <p className="text-[9px] text-muted-foreground">Referrals</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-[15px] font-bold text-foreground">{formatNaira(totalEarned)}</p>
                  <p className="text-[9px] text-muted-foreground">Earned</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-[15px] font-bold text-foreground">{withdrawals.filter(w => w.status === "approved").length}</p>
                  <p className="text-[9px] text-muted-foreground">Withdrawals</p>
                </div>
              </div>

              {/* Referral link */}
              {influencerLink && (
                <div className="glass rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Your Referral Link</p>
                  <p className="text-[10px] text-foreground font-mono truncate">{influencerLink}</p>
                  <GlassButton variant="outline" onClick={() => { navigator.clipboard.writeText(influencerLink); toast({ title: "Copied!" }); }} className="w-full mt-2 text-[11px]">
                    Copy Referral Link
                  </GlassButton>
                </div>
              )}

              {/* Bank info */}
              {bankAccount && (
                <div className="glass rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Bank Account</p>
                  <p className="text-foreground text-[12px] font-semibold">{bankAccount.account_name}</p>
                  <p className="text-muted-foreground text-[11px]">{bankAccount.bank_name} • {bankAccount.account_number}</p>
                </div>
              )}

              {/* Recent referrals */}
              {referrals.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-2">Recent Referrals</p>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {referrals.slice(0, 10).map(r => (
                      <div key={r.id} className="flex items-center justify-between glass rounded-lg p-2">
                        <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                        <p className="text-[11px] text-primary font-semibold">+{formatNaira(r.reward_amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "withdraw" && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="text-muted-foreground text-[10px]">Available Balance</p>
                <h3 className="text-xl font-bold gradient-text">{formatNaira(wallet.balance)}</h3>
                <p className="text-[10px] text-muted-foreground">Min withdrawal: ₦30,000</p>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Amount (₦)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="30000"
                  min={30000}
                  className="w-full glass-input rounded-xl px-4 py-3 text-foreground text-[13px]"
                />
              </div>

              {bankAccount && (
                <div className="glass rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground">Withdraw to</p>
                  <p className="text-foreground text-[12px] font-semibold">{bankAccount.account_name}</p>
                  <p className="text-muted-foreground text-[11px]">{bankAccount.bank_name} • {bankAccount.account_number}</p>
                </div>
              )}

              <GlassButton variant="primary" onClick={handleWithdraw} disabled={withdrawing} className="w-full text-[13px]">
                <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> {withdrawing ? "Processing..." : "Request Withdrawal"}
              </GlassButton>

              {/* Withdrawal history */}
              {withdrawals.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-2">Withdrawal History</p>
                  <div className="space-y-1">
                    {withdrawals.map(w => (
                      <div key={w.id} className="flex items-center justify-between glass rounded-lg p-2">
                        <div>
                          <p className="text-[11px] text-foreground font-semibold">{formatNaira(w.amount)}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${w.status === "approved" ? "bg-primary/10 text-primary" : w.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  return null;
};

export default InfluencerPanel;
