import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import WaterBackground from "@/components/WaterBackground";
import { Upload, CheckCircle2, Send, Shield, Globe, Mail, Phone, User, Building } from "lucide-react";

const SUPABASE_URL = "https://mrcypdyivfprvvirnwtq.supabase.co";

const AdvertiserOnboard = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState<File | null>(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState("");

  // Verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [brandedEmailRequired, setBrandedEmailRequired] = useState(true);

  // Validate token
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    (async () => {
      const [tokenRes, settingRes] = await Promise.all([
        supabase
          .from("advertiser_tokens" as any)
          .select("id, status")
          .eq("token", token)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("admin_settings")
          .select("value")
          .eq("key", "advertiser_branded_email_required")
          .maybeSingle(),
      ]);
      if (tokenRes.data) {
        setTokenValid(true);
        setTokenId((tokenRes.data as any).id);
      } else {
        setTokenValid(false);
      }
      if (settingRes.data) {
        setBrandedEmailRequired((settingRes.data as any).value !== "false");
      }
    })();
  }, [token]);

  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
    } catch { return ""; }
  };

  const emailMatchesWebsite = () => {
    if (!brandedEmailRequired) return true;
    if (!email || !websiteUrl) return false;
    const domain = getDomain(websiteUrl);
    const emailDomain = email.split("@")[1]?.toLowerCase();
    return domain && emailDomain && emailDomain === domain;
  };

  const handleSendVerification = async () => {
    if (brandedEmailRequired && !emailMatchesWebsite()) {
      toast({ title: "Email must match website domain", description: `Use an email @${getDomain(websiteUrl)}` });
      return;
    }
    if (!email) {
      toast({ title: "Please enter an email address" });
      return;
    }
    setVerifying(true);
    try {
      const res = await supabase.functions.invoke("advertiser-verify-email", {
        body: { email, token_id: tokenId },
      });
      if (res.error) throw res.error;
      setVerificationSent(true);
      toast({ title: "Verification code sent", description: "Check your email inbox" });
    } catch (err: any) {
      toast({ title: "Failed to send code", description: err.message });
    }
    setVerifying(false);
  };

  const handleVerifyCode = async () => {
    setVerifying(true);
    const { data } = await supabase
      .from("advertiser_email_verifications" as any)
      .select("*")
      .eq("email", email)
      .eq("token_id", tokenId)
      .eq("code", verificationCode)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      toast({ title: "Invalid or expired code" });
      setVerifying(false);
      return;
    }

    // Check expiry
    if (new Date((data as any).expires_at) < new Date()) {
      toast({ title: "Code expired", description: "Please request a new code" });
      setVerifying(false);
      return;
    }

    await supabase
      .from("advertiser_email_verifications" as any)
      .update({ verified: true } as any)
      .eq("id", (data as any).id);

    setEmailVerified(true);
    toast({ title: "Email verified!" });
    setVerifying(false);
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("advertiser-uploads").upload(path, file);
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supabase.storage.from("advertiser-uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!brandName || !websiteUrl || !email || !contactNumber || !ceoName || !signatureFile || !emailVerified || !tokenId) {
      toast({ title: "Please fill all required fields and verify your email" });
      return;
    }
    setSubmitting(true);
    try {
      let logoUrl: string | null = null;
      if (brandLogo) logoUrl = await uploadFile(brandLogo, "logos");
      const sigUrl = await uploadFile(signatureFile, "signatures");

      const { error } = await supabase.from("advertiser_submissions" as any).insert({
        token_id: tokenId,
        brand_name: brandName,
        brand_logo_url: logoUrl,
        website_url: websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`,
        email,
        contact_number: contactNumber,
        ceo_name: ceoName,
        signature_url: sigUrl,
      } as any);

      if (error) throw error;

      // Mark token as used
      await supabase.from("advertiser_tokens" as any).update({ status: "used" } as any).eq("id", tokenId);

      setSubmitted(true);
      toast({ title: "Application submitted!", description: "You'll hear from us soon." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message });
    }
    setSubmitting(false);
  };

  const inputCls = "w-full rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all";

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <WaterBackground />
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <WaterBackground />
        <div className="glass-card rounded-2xl p-8 max-w-md text-center relative z-10">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Invalid or Expired Link</h2>
          <p className="text-muted-foreground text-sm">This onboarding link is no longer valid. Please contact REALLO for a new link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <WaterBackground />
        <div className="glass-card rounded-2xl p-8 max-w-md text-center relative z-10">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Application Submitted!</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Your Letter of Intent application has been submitted for review. We'll notify you at <strong>{email}</strong> once it's processed.
          </p>
          <p className="text-[11px] text-muted-foreground">
            You can check your status at your advertiser dashboard anytime.
          </p>
          <button
            onClick={() => navigate(`/advertiser/dashboard/${token}`)}
            className="mt-4 clay-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-12">
      <WaterBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontSize: "28px" }}>REALLO</h1>
          <h2 className="text-lg font-semibold text-foreground" style={{ fontSize: "16px" }}>Advertiser Partnership — Letter of Intent</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Complete this form to express your intent to partner with REALLO. Minimum commitment: <strong>$50,000</strong>.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-5">
          {/* Brand Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Building className="w-4 h-4 text-primary" /> Brand Name *
            </label>
            <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your company or brand name" className={inputCls} />
          </div>

          {/* Brand Logo */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Upload className="w-4 h-4 text-primary" /> Brand Logo
            </label>
            <div className="flex items-center gap-4">
              {brandLogoPreview && (
                <img src={brandLogoPreview} alt="Logo preview" className="w-14 h-14 rounded-xl object-contain border border-border/50 bg-card" />
              )}
              <label className="flex-1 rounded-xl border-2 border-dashed border-border/50 p-4 text-center cursor-pointer hover:border-primary/30 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setBrandLogo(f); setBrandLogoPreview(URL.createObjectURL(f)); }
                }} />
                <span className="text-sm text-muted-foreground">{brandLogo ? brandLogo.name : "Click to upload logo"}</span>
              </label>
            </div>
          </div>

          {/* Website URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Globe className="w-4 h-4 text-primary" /> Website URL *
            </label>
            <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yourbrand.com" className={inputCls} />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Mail className="w-4 h-4 text-primary" /> Official Email * <span className="text-[10px] text-muted-foreground">(must match website domain)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={websiteUrl ? `you@${getDomain(websiteUrl)}` : "you@yourbrand.com"}
                className={`${inputCls} flex-1`}
                disabled={emailVerified}
              />
              {!emailVerified && (
                <button
                  onClick={verificationSent ? handleVerifyCode : handleSendVerification}
                  disabled={verifying || (!verificationSent && !emailMatchesWebsite())}
                  className="clay-primary text-primary-foreground rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                >
                  {verifying ? "..." : verificationSent ? "Verify" : "Send Code"}
                </button>
              )}
              {emailVerified && (
                <div className="flex items-center gap-1 text-primary text-xs font-semibold px-3">
                  <CheckCircle2 className="w-4 h-4" /> Verified
                </div>
              )}
            </div>
            {verificationSent && !emailVerified && (
              <input
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className={`${inputCls} mt-2`}
              />
            )}
            {email && websiteUrl && !emailMatchesWebsite() && !emailVerified && (
              <p className="text-destructive text-xs mt-1">Email domain must match website: @{getDomain(websiteUrl)}</p>
            )}
          </div>

          {/* Contact Number */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Phone className="w-4 h-4 text-primary" /> Contact Number *
            </label>
            <input value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="+234..." className={inputCls} />
          </div>

          {/* CEO / Manager Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <User className="w-4 h-4 text-primary" /> CEO / Manager Full Name *
            </label>
            <input value={ceoName} onChange={e => setCeoName(e.target.value)} placeholder="Full name of signatory" className={inputCls} />
          </div>

          {/* Signature Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
              <Upload className="w-4 h-4 text-primary" /> Signature * <span className="text-[10px] text-muted-foreground">(signed on white paper, photographed)</span>
            </label>
            <div className="flex items-center gap-4">
              {signaturePreview && (
                <img src={signaturePreview} alt="Signature preview" className="w-24 h-14 rounded-xl object-contain border border-border/50 bg-white" />
              )}
              <label className="flex-1 rounded-xl border-2 border-dashed border-border/50 p-4 text-center cursor-pointer hover:border-primary/30 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setSignatureFile(f); setSignaturePreview(URL.createObjectURL(f)); }
                }} />
                <span className="text-sm text-muted-foreground">{signatureFile ? signatureFile.name : "Upload signature photo"}</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !brandName || !websiteUrl || !email || !emailVerified || !contactNumber || !ceoName || !signatureFile}
              className="w-full clay-primary text-primary-foreground rounded-xl px-6 py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Letter of Intent"}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            By submitting, you agree that this is a non-binding Letter of Intent for a minimum $50,000 advertising commitment once REALLO reaches 100,000 users.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdvertiserOnboard;
