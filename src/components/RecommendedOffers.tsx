import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, RefreshCw } from "lucide-react";

export default function RecommendedOffers() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("campaign_recommendations")
      .select("*").eq("user_id", user.id).order("score", { ascending: false });
    setRecs(data ?? []);
  };
  const refresh = async () => {
    setLoading(true);
    try { await supabase.functions.invoke("ai-recommend-campaigns"); await load(); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user?.id]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Recommended for you</h3>
        </div>
        <button onClick={refresh} disabled={loading} className="text-xs inline-flex items-center gap-1 text-primary disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {recs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No personalized matches yet. Tap Refresh — we'll match campaigns to your profile.</p>
      ) : (
        <div className="space-y-2">
          {recs.slice(0, 8).map(r => (
            <div key={r.id} className="flex items-center justify-between border border-border/40 rounded-lg p-2 text-xs">
              <div>
                <div className="font-medium">{r.campaign_id}</div>
                <div className="text-muted-foreground">{r.campaign_type} · score {Math.round(Number(r.score))}</div>
              </div>
              {Array.isArray(r.reason?.matched_brands) && r.reason.matched_brands.length > 0 && (
                <div className="text-[10px] text-primary">matches: {r.reason.matched_brands.slice(0, 3).join(", ")}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}