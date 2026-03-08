import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import WaterBackground from "@/components/WaterBackground";
import { Shield, Clock, CheckCircle2, XCircle, Download, Bell, ExternalLink, Building } from "lucide-react";

const AdvertiserDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [userCount, setUserCount] = useState<string | null>(null);
  const [userCountLink, setUserCountLink] = useState<string | null>(null);

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
              <p className="text-muted-foreground text-xs">{submission.email}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mb-3">
            <StatusIcon className={`w-5 h-5 ${st.color}`} />
            <span className={`font-semibold text-sm ${st.color}`}>{st.label}</span>
          </div>

          {submission.status === "approved" && submission.loi_pdf_url && (
            <a
              href={submission.loi_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 clay-primary text-primary-foreground rounded-xl px-4 py-2.5 text-xs font-semibold w-fit"
            >
              <Download className="w-4 h-4" /> Download LOI PDF
            </a>
          )}

          {submission.status === "declined" && submission.admin_notes && (
            <div className="mt-3 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-destructive text-xs font-medium">Reason: {submission.admin_notes}</p>
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
              <p className="text-xs text-muted-foreground">
                {isReached ? "🎉 Milestone reached!" : `${((Number(userCount) / 100000) * 100).toFixed(1)}% of target`}
              </p>
              {isReached && userCountLink && (
                <a
                  href={userCountLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 clay-primary text-primary-foreground rounded-xl px-4 py-2.5 text-xs font-semibold w-fit"
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
