import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, RefreshCw } from "lucide-react";
import OfferEnrollmentCard from "./OfferEnrollmentCard";

export default function RecommendedOffers() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<any[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: recData } = await supabase.from("campaign_recommendations")
      .select("*").eq("user_id", user.id).order("score", { ascending: false });
    setRecs(recData ?? []);
    const { data: all } = await supabase.from("campaign_eligibility")
      .select("id, campaign_id, campaign_type, duration_days, exclusive_to_switchers, competes_with_brands")
      .eq("active", true);
    setAllCampaigns(all ?? []);
  };
  const refresh = async () => {
    setLoading(true);
    try { await supabase.functions.invoke("ai-recommend-campaigns"); await load(); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user?.id]);

  const recIds = new Set(recs.map(r => r.campaign_id));
  const visible = showAll
    ? allCampaigns
    : allCampaigns.filter(c => recIds.has(c.campaign_id));

  const meta = (campaignId: string) => allCampaigns.find(c => c.campaign_id === campaignId);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Recommended for you</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            All offers
          </label>
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-1 text-primary disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">No personalized matches yet. Tap Refresh — we'll match campaigns to your profile.</p>
      ) : (
        <div className="space-y-2">
          {visible.slice(0, 12).map(c => (
            <OfferEnrollmentCard
              key={c.id ?? c.campaign_id}
              campaignId={c.campaign_id}
              campaignTitle={c.campaign_id}
              durationDays={c.duration_days ?? 1}
              eligibilityId={c.id ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}