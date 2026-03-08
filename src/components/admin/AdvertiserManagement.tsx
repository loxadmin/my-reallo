import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Copy, Save, Upload, CheckCircle2, XCircle, Eye, Download,
  Link, Users, Building, Clock, Trash2, ExternalLink, RefreshCw
} from "lucide-react";

const SUPABASE_URL = "https://mrcypdyivfprvvirnwtq.supabase.co";

interface Props {
  onRefresh?: () => void;
}

const AdvertiserManagement = ({ onRefresh }: Props) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [founderName, setFounderName] = useState("");
  const [founderSigUrl, setFounderSigUrl] = useState("");
  const [founderSigFile, setFounderSigFile] = useState<File | null>(null);
  const [advUserCount, setAdvUserCount] = useState("");
  const [advUserCountLink, setAdvUserCountLink] = useState("");
  const [brandedEmailRequired, setBrandedEmailRequired] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [declineNotes, setDeclineNotes] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"setup" | "tokens" | "submissions">("setup");
  const sigInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [tokensRes, subsRes, settingsRes] = await Promise.all([
      supabase.from("advertiser_tokens" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("advertiser_submissions" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("admin_settings").select("*").in("key", [
        "founder_full_name", "founder_signature_url", "advertiser_user_count", "advertiser_user_count_link", "advertiser_branded_email_required",
      ]),
    ]);

    setTokens((tokensRes.data || []) as any[]);
    setSubmissions((subsRes.data || []) as any[]);

    const settings = (settingsRes.data || []) as { key: string; value: string }[];
    setFounderName(settings.find(s => s.key === "founder_full_name")?.value || "");
    setFounderSigUrl(settings.find(s => s.key === "founder_signature_url")?.value || "");
    setAdvUserCount(settings.find(s => s.key === "advertiser_user_count")?.value || "");
    setAdvUserCountLink(settings.find(s => s.key === "advertiser_user_count_link")?.value || "");
    setBrandedEmailRequired(settings.find(s => s.key === "advertiser_branded_email_required")?.value !== "false");
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    let sigUrl = founderSigUrl;

    if (founderSigFile) {
      const ext = founderSigFile.name.split(".").pop();
      const path = `founder/signature_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("advertiser-uploads").upload(path, founderSigFile, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("advertiser-uploads").getPublicUrl(path);
        sigUrl = data.publicUrl;
        setFounderSigUrl(sigUrl);
      }
    }

    await Promise.all([
      supabase.from("admin_settings").upsert({ key: "founder_full_name", value: founderName, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "founder_signature_url", value: sigUrl, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "advertiser_user_count", value: advUserCount, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "advertiser_user_count_link", value: advUserCountLink, updated_at: new Date().toISOString() }),
      supabase.from("admin_settings").upsert({ key: "advertiser_branded_email_required", value: brandedEmailRequired ? "true" : "false", updated_at: new Date().toISOString() }),
    ]);

    toast({ title: "Advertiser settings saved" });
    setSaving(false);
  };

  const handleGenerateToken = async () => {
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGenerating(false); return; }

    const { error } = await supabase.from("advertiser_tokens" as any).insert({
      created_by: user.id,
    } as any);

    if (error) {
      toast({ title: "Failed to generate link", description: error.message });
    } else {
      toast({ title: "Onboarding link generated" });
      await fetchData();
    }
    setGenerating(false);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/advertiser/onboard/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  const handleApprove = async (submissionId: string) => {
    setProcessingId(submissionId);
    try {
      const res = await supabase.functions.invoke("generate-loi-pdf", {
        body: { submission_id: submissionId },
      });
      if (res.error) throw res.error;
      toast({ title: "LOI approved & PDF sent to advertiser" });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Approval failed", description: err.message });
    }
    setProcessingId(null);
  };

  const handleDecline = async (submissionId: string) => {
    setProcessingId(submissionId);
    await supabase.from("advertiser_submissions" as any).update({
      status: "declined",
      admin_notes: declineNotes[submissionId] || "Application declined",
      reviewed_at: new Date().toISOString(),
    } as any).eq("id", submissionId);

    toast({ title: "Submission declined" });
    await fetchData();
    setProcessingId(null);
  };

  const handleDeleteToken = async (id: string) => {
    await supabase.from("advertiser_tokens" as any).delete().eq("id", id);
    toast({ title: "Token deleted" });
    await fetchData();
  };

  const inputCls = "w-full rounded-xl border border-border/40 bg-card/60 px-3 py-2.5 text-foreground text-[12px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";
  const cardCls = "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4";
  const tabCls = (active: boolean) => `px-4 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${active ? "clay-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`;

  const pendingCount = submissions.filter((s: any) => s.status === "pending_review").length;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("setup")} className={tabCls(tab === "setup")}>
          <span className="flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Setup</span>
        </button>
        <button onClick={() => setTab("tokens")} className={tabCls(tab === "tokens")}>
          <span className="flex items-center gap-1.5"><Link className="w-3.5 h-3.5" /> Links ({tokens.length})</span>
        </button>
        <button onClick={() => setTab("submissions")} className={tabCls(tab === "submissions")}>
          <span className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" /> Submissions
            {pendingCount > 0 && <span className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
          </span>
        </button>
      </div>

      {/* Setup Tab */}
      {tab === "setup" && (
        <div className={cardCls}>
          <h3 className="text-[14px] font-bold text-foreground">Founder & Platform Settings</h3>
          <p className="text-[11px] text-muted-foreground -mt-2">Configure founder credentials for the Letter of Intent.</p>

          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Founder Full Name</label>
            <input value={founderName} onChange={e => setFounderName(e.target.value)} placeholder="Full legal name" className={`${inputCls} mt-1`} />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground font-medium">Founder Signature</label>
            <div className="flex items-center gap-3 mt-1">
              {founderSigUrl && (
                <img src={founderSigUrl} alt="Founder sig" className="w-24 h-12 rounded-lg object-contain border border-border/40 bg-white" />
              )}
              <label className="flex items-center gap-2 rounded-xl border border-dashed border-border/50 px-4 py-2.5 cursor-pointer hover:border-primary/30 transition-colors">
                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{founderSigFile ? founderSigFile.name : "Upload signature"}</span>
                <input ref={sigInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setFounderSigFile(f);
                }} />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Branded Email Required</label>
              <p className="text-[10px] text-muted-foreground">When enabled, advertiser email must match their website domain.</p>
            </div>
            <button
              onClick={() => setBrandedEmailRequired(!brandedEmailRequired)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${brandedEmailRequired ? "bg-primary" : "bg-input"}`}
            >
              <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${brandedEmailRequired ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <hr className="border-border/30" />
          <h4 className="text-[13px] font-semibold text-foreground">User Milestone Notification</h4>
          <p className="text-[11px] text-muted-foreground -mt-2">When updated, advertisers will see the count on their dashboard.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Current User Count</label>
              <input type="number" value={advUserCount} onChange={e => setAdvUserCount(e.target.value)} placeholder="e.g. 50000" className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Proceed Link (when 100k reached)</label>
              <input value={advUserCountLink} onChange={e => setAdvUserCountLink(e.target.value)} placeholder="https://..." className={`${inputCls} mt-1`} />
            </div>
          </div>

          <button onClick={handleSaveSettings} disabled={saving} className="clay-primary text-primary-foreground rounded-xl px-5 py-2.5 text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}

      {/* Tokens Tab */}
      {tab === "tokens" && (
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-foreground">Onboarding Links</h3>
              <p className="text-[11px] text-muted-foreground">Generate unique links for advertisers to fill the LOI form.</p>
            </div>
            <button onClick={handleGenerateToken} disabled={generating} className="clay-primary text-primary-foreground rounded-xl px-4 py-2.5 text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> {generating ? "..." : "Generate Link"}
            </button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {tokens.length === 0 && <p className="text-muted-foreground text-xs text-center py-4">No links generated yet.</p>}
            {tokens.map((tk: any) => (
              <div key={tk.id} className="flex items-center gap-3 rounded-xl border border-border/30 p-3 hover:bg-muted/10 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-foreground truncate">{tk.token.slice(0, 16)}...</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tk.created_at).toLocaleDateString()} · {tk.status}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tk.status === "active" ? "bg-primary/15 text-primary" : tk.status === "used" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
                  {tk.status}
                </span>
                {tk.status === "active" && (
                  <button onClick={() => copyLink(tk.token)} className="text-primary hover:text-primary/80 transition-colors" title="Copy link">
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDeleteToken(tk.id)} className="text-destructive/60 hover:text-destructive transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions Tab */}
      {tab === "submissions" && (
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-foreground">Advertiser Submissions</h3>
              <p className="text-[11px] text-muted-foreground">Review and approve advertiser LOI applications.</p>
            </div>
            <button onClick={fetchData} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {submissions.length === 0 && <p className="text-muted-foreground text-xs text-center py-4">No submissions yet.</p>}
            {submissions.map((sub: any) => (
              <div key={sub.id} className="rounded-xl border border-border/30 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {sub.brand_logo_url && (
                      <img src={sub.brand_logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-contain border border-border/40 bg-white" />
                    )}
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{sub.brand_name}</p>
                      <p className="text-[10px] text-muted-foreground">{sub.email}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${
                    sub.status === "approved" ? "bg-primary/15 text-primary border-primary/20" :
                    sub.status === "declined" ? "bg-destructive/10 text-destructive border-destructive/20" :
                    "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }`}>
                    {sub.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Website:</span> <a href={sub.website_url} target="_blank" rel="noopener" className="text-primary hover:underline">{sub.website_url}</a></div>
                  <div><span className="text-muted-foreground">CEO/Manager:</span> <span className="text-foreground font-medium">{sub.ceo_name}</span></div>
                  <div><span className="text-muted-foreground">Contact:</span> <span className="text-foreground">{sub.contact_number}</span></div>
                  <div><span className="text-muted-foreground">Submitted:</span> <span className="text-foreground">{new Date(sub.created_at).toLocaleDateString()}</span></div>
                </div>

                {sub.signature_url && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Signature:</p>
                    <img src={sub.signature_url} alt="Signature" className="w-32 h-16 rounded-lg object-contain border border-border/40 bg-white" />
                  </div>
                )}

                {sub.status === "pending_review" && (
                  <div className="space-y-2 pt-2 border-t border-border/20">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(sub.id)}
                        disabled={!!processingId}
                        className="clay-primary text-primary-foreground rounded-xl px-4 py-2 text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {processingId === sub.id ? "Processing..." : "Approve & Generate LOI"}
                      </button>
                      <button
                        onClick={() => handleDecline(sub.id)}
                        disabled={!!processingId}
                        className="rounded-xl px-4 py-2 text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                    <input
                      value={declineNotes[sub.id] || ""}
                      onChange={e => setDeclineNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      placeholder="Decline reason (optional)"
                      className={inputCls}
                    />
                  </div>
                )}

                {sub.status === "approved" && sub.loi_pdf_url && (
                  <a
                    href={sub.loi_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary text-[11px] font-semibold hover:underline w-fit"
                  >
                    <Download className="w-3.5 h-3.5" /> Download LOI PDF
                  </a>
                )}

                {sub.status === "declined" && sub.admin_notes && (
                  <p className="text-destructive text-[11px]">Notes: {sub.admin_notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertiserManagement;
