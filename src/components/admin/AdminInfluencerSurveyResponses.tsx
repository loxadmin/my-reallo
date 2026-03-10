import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import { formatNaira } from "@/lib/formatNaira";
import { approveInfluencerSurveyResponse, rejectInfluencerSurveyResponse } from "@/lib/influencerSurveyAdmin";

interface Props {
  adminUserId: string;
}

const getPublicUrl = (path?: string | null) => {
  if (!path) return "";
  const { data } = supabase.storage.from("influencer_survey_screenshots").getPublicUrl(path);
  return data.publicUrl;
};

export default function AdminInfluencerSurveyResponses({ adminUserId }: Props) {
  const [responses, setResponses] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const fetchData = async () => {
    const [rRes, sRes, pRes] = await Promise.all([
      supabase.from("influencer_survey_responses" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("influencer_surveys" as any).select("id,title"),
      supabase.from("profiles").select("id,email"),
    ]);

    if (rRes.error) console.error("influencer survey response fetch error", rRes.error);
    if (sRes.error) console.error("influencer survey list fetch error", sRes.error);
    if (pRes.error) console.error("profile fetch error", pRes.error);

    setResponses(rRes.data || []);
    setSurveys(sRes.data || []);
    setProfiles(pRes.data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-3">
      {responses.map((response) => {
        const survey = surveys.find((s) => s.id === response.survey_id);
        const profile = profiles.find((p) => p.id === response.user_id);
        const screenshotUrl = getPublicUrl(response.screenshot_url);
        const isActionable = response.status === "pending" || response.status === "rejected";

        return (
          <GlassCard key={response.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{survey?.title || "Unknown survey"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{profile?.email || response.user_id}</p>
                <p className="text-xs text-primary font-medium mt-1">Reward: {formatNaira(Number(response.reward_amount || 0))}</p>
              </div>
              <span className="text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border border-border bg-muted/20 text-muted-foreground">{response.status}</span>
            </div>

            {screenshotUrl ? (
              <a href={screenshotUrl} target="_blank" rel="noreferrer" className="text-xs font-medium underline text-primary hover:text-primary/80 transition-colors">View screenshot</a>
            ) : (
              <p className="text-xs text-muted-foreground italic">No screenshot uploaded yet.</p>
            )}

            <textarea
              className="w-full glass-input rounded-xl px-3 py-2 text-sm"
              rows={2}
              placeholder="Review notes (optional)"
              value={reviewNotes[response.id] || ""}
              onChange={(e) => setReviewNotes((p) => ({ ...p, [response.id]: e.target.value }))}
            />

            {isActionable && (
              <div className="flex gap-2">
                <GlassButton onClick={async () => {
                  try {
                    await approveInfluencerSurveyResponse(response, adminUserId, reviewNotes[response.id]);
                    toast({ title: "Approved", description: "Response approved and payout recorded." });
                    await fetchData();
                  } catch (error: any) {
                    console.error("approve influencer response error", error);
                    toast({ title: "Error", description: error.message || "Failed to approve", variant: "destructive" });
                  }
                }}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </GlassButton>
                <GlassButton variant="outline" className="text-xs" onClick={async () => {
                  try {
                    await rejectInfluencerSurveyResponse(response.id, adminUserId, reviewNotes[response.id]);
                    toast({ title: "Rejected", description: "Response marked as rejected." });
                    await fetchData();
                  } catch (error: any) {
                    console.error("reject influencer response error", error);
                    toast({ title: "Error", description: error.message || "Failed to reject", variant: "destructive" });
                  }
                }}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </GlassButton>
              </div>
            )}

            {response.review_notes && <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/20">Last note: {response.review_notes}</p>}
          </GlassCard>
        );
      })}
      {responses.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No influencer survey responses yet.</p>}
    </div>
  );
}
