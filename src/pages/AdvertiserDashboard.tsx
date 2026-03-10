import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import WaterBackground from "@/components/WaterBackground";
import { Shield, Clock, CheckCircle2, XCircle, Download, Bell, ExternalLink, Mail, LogIn } from "lucide-react";

const AdvertiserDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [userCount, setUserCount] = useState<string | null>(null);
  const [userCountLink, setUserCountLink] = useState<string | null>(null);

  // Auth gate state
  const [authenticated, setAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Check sessionStorage for existing auth
  useEffect(() => {
    if (!token) return;
    const stored = sessionStorage.getItem(`adv_auth_${token}`);
    if (stored) {
      setAuthenticated(true);
      setAuthEmail(stored);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      // Find token (check both active and used)
      const { data: tk } = await supabase
        .from("advertiser_tokens" as any)
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (!tk) { setLoading(false); return; }
      setTokenData(tk);

      // Find submission for this token
      const { data: sub } = await supabase
        .from("advertiser_submissions" as any)
        .select("*")
        .eq("token_id", (tk as any).id)
        .maybeSingle();

      setSubmission(sub);

      // Get user count settings
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("*")
        .in("key", ["advertiser_user_count", "advertiser_user_count_link"]);

      const count = settings?.find((s: any) => s.key === "advertiser_user_count")?.value;
      const link = settings?.find((s: any) => s.key === "advertiser_user_count_link")?.value;
      setUserCount(count || null);
      setUserCountLink(link || null);

      setLoading(false);
    })();
  }, [token]);

  const handleSendOtp = async () => {
    if (!authEmail || !tokenData) return;
    setAuthLoading(true);
    try {
      // Verify that this email matches the submission for this token
      const { data: sub } = await supabase
        .from("advertiser_submissions" as any)
        .select("email")
        .eq("token_id", (tokenData as any).id)
        .maybeSingle();

      if (!sub || (sub as any).email?.toLowerCase() !== authEmail.toLowerCase()) {
        toast({ title: "Access Denied", description: "This email is not associated with this advertiser link." });
        setAuthLoading(false);
        return;
      }

      const res = await supabase.functions.invoke("advertiser-verify-email", {
        body: { email: authEmail, token_id: (tokenData as any).id },
      });
      if (res.error) throw res.error;
      setOtpSent(true);
      toast({ title: "Verification code sent", description: "Check your email inbox" });
    } catch (err: any) {
      toast({ title: "Failed to send code", description: err.message });
    }
    setAuthLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || !tokenData) return;
    setAuthLoading(true);

    const { data } = await supabase
      .from("advertiser_email_verifications" as any)
      .select("*")
      .eq("email", authEmail.toLowerCase())
      .eq("token_id", (tokenData as any).id)
      .eq("code", otpCode)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      toast({ title: "Invalid or expired code" });
      setAuthLoading(false);
      return;
    }

    if (new Date((data as any).expires_at) < new Date()) {
      toast({ title: "Code expired", description: "Please request a new code" });
      setAuthLoading(false);
      return;
    }

    await supabase
      .from("advertiser_email_verifications" as any)
      .update({ verified: true } as any)
      .eq("id", (data as any).id);

    sessionStorage.setItem(`adv_auth_${token}`, authEmail.toLowerCase());
    setAuthenticated(true);
    toast({ title: "Signed in successfully!" });
    setAuthLoading(false);
  };

  const handleDownloadLoi = async () => {
    if (!submission?.loi_pdf_url || !token) return;
    setDownloading(true);
    
    // Open the PDF
    window.open(submission.loi_pdf_url, "_blank");

    // Send notification email
    try {
      await supabase.functions.invoke("advertiser-loi-downloaded", {
        body: {
          email: submission.email,
          brand_name: submission.brand_name,
          dashboard_url: `${window.location.origin}/advertiser/dashboard/${token}`,
        },
      });
    } catch (err) {
      console.error("Failed to send download notification:", err);
    }
    setDownloading(false);
  };

  const inputCls = "w-full rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <WaterBackground />
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <WaterBackground />
        <div className="glass-card rounded-2xl p-8 max-w-md text-center relative z-10">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Invalid Link</h2>
          <p className="text-muted-foreground text-sm">This dashboard link is not valid.</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <WaterBackground />
        <div className="glass-card rounded-2xl p-8 max-w-md text-center relative z-10">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Submission Yet</h2>
          <p className="text-muted-foreground text-sm">No application has been submitted with this link yet.</p>
        </div>
      </div>
    );
  }

  // Auth gate — require email + OTP before showing dashboard
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <WaterBackground />
        <div className="glass-card rounded-2xl p-8 max-w-sm w-full relative z-10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold gradient-text mb-1">REALLO</h1>
            <h2 className="text-sm font-semibold text-foreground mb-1">Advertiser Dashboard</h2>
            <p className="text-muted-foreground text-[13px]">Sign in with your verified email to access your dashboard.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                <Mail className="w-4 h-4 text-primary" /> Email Address
              </label>
              <input
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="you@yourbrand.com"
                className={inputCls}
                disabled={otpSent}
              />
            </div>

            {otpSent && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Verification Code</label>
                <input
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className={inputCls}
                />
              </div>
            )}

            <button
              onClick={otpSent ? handleVerifyOtp : handleSendOtp}
              disabled={authLoading || !authEmail || (otpSent && otpCode.length < 6)}
              className="w-full clay-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {authLoading ? "..." : otpSent ? "Verify & Sign In" : "Send Verification Code"}
            </button>

            {otpSent && (
              <button
                onClick={() => { setOtpSent(false); setOtpCode(""); }}
                className="w-full text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending_review: { icon: Clock, color: "text-amber-500", label: "Pending Review" },
    approved: { icon: CheckCircle2, color: "text-primary", label: "Approved" },
    declined: { icon: XCircle, color: "text-destructive", label: "Declined" },
  };

  const st = statusConfig[submission.status] || statusConfig.pending_review;
  const StatusIcon = st.icon;
  const isReached = userCount && Number(userCount) >= 100000;

  return (
    <div className="min-h-screen relative pb-12">
      <WaterBackground />
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-1" style={{ fontSize: "28px" }}>REALLO</h1>
          <h2 className="text-base font-semibold text-foreground" style={{ fontSize: "14px" }}>Advertiser Dashboard</h2>
        </div>

        {/* Brand Info */}
        <div className="glass-card rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            {submission.brand_logo_url && (
              <img src={submission.brand_logo_url} alt="Logo" className="w-14 h-14 rounded-xl object-contain border border-border/50 bg-card" />
            )}
            <div>
              <h3 className="font-bold text-foreground" style={{ fontSize: "16px" }}>{submission.brand_name}</h3>
              <p className="text-muted-foreground text-[13px]">{submission.email}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mb-3">
            <StatusIcon className={`w-5 h-5 ${st.color}`} />
            <span className={`font-semibold text-sm ${st.color}`}>{st.label}</span>
          </div>

          {submission.status === "approved" && submission.loi_pdf_url && (
            <button
              onClick={handleDownloadLoi}
              disabled={downloading}
              className="flex items-center gap-2 clay-primary text-primary-foreground rounded-xl px-4 py-2.5 text-[13px] font-semibold w-fit"
            >
              <Download className="w-4 h-4" /> {downloading ? "Downloading..." : "Download LOI PDF"}
            </button>
          )}

          {submission.status === "declined" && submission.admin_notes && (
            <div className="mt-3 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-destructive text-[13px] font-medium">Reason: {submission.admin_notes}</p>
            </div>
          )}
        </div>

        {/* 100k Milestone */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground" style={{ fontSize: "14px" }}>100,000 User Milestone</h3>
          </div>

          {userCount ? (
            <div>
              <p className="text-muted-foreground text-sm mb-2">
                Current verified user count: <strong className="text-foreground">{Number(userCount).toLocaleString()}</strong>
              </p>
              <div className="w-full bg-muted rounded-full h-3 mb-3">
                <div
                  className="bg-primary rounded-full h-3 transition-all duration-500"
                  style={{ width: `${Math.min(100, (Number(userCount) / 100000) * 100)}%` }}
                />
              </div>
              <p className="text-[13px] text-muted-foreground">
                {isReached ? "🎉 Milestone reached!" : `${((Number(userCount) / 100000) * 100).toFixed(1)}% of target`}
              </p>
              {isReached && userCountLink && (
                <a
                  href={userCountLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 clay-primary text-primary-foreground rounded-xl px-4 py-2.5 text-[13px] font-semibold w-fit"
                >
                  <ExternalLink className="w-4 h-4" /> Proceed to Next Steps
                </a>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">User count not yet published. Check back later.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvertiserDashboard;
