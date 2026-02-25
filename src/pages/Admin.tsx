import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlassCard from "@/components/GlassCard";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { Users, Ghost, Activity, LogOut, RefreshCw, Shield, Settings, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  email: string;
  total_annual_spend: number;
  selected_goal: string | null;
  queue_position: number;
  referral_code: string | null;
  created_at: string;
}

interface ActivityRow {
  id: string;
  user_id: string;
  action_type: string;
  positions_moved: number;
  created_at: string;
}

interface GoalCategoryRow {
  id: string;
  goal_type: string;
  subcategory: string | null;
  label: string;
  max_price: number;
}

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

const Admin = () => {
  const { isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [ghostCount, setGhostCount] = useState(0);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [goalCategories, setGoalCategories] = useState<GoalCategoryRow[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"users" | "ghosts" | "activity" | "goals">("users");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [loading, isAdmin, navigate]);

  const fetchData = async () => {
    setRefreshing(true);
    const [profilesRes, ghostsRes, activityRes, goalsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("queue_position", { ascending: true }),
      supabase.from("ghost_users").select("id", { count: "exact", head: true }),
      supabase.from("waitlist_activity").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("goal_categories").select("*").order("goal_type"),
    ]);
    setProfiles((profilesRes.data as ProfileRow[]) || []);
    setGhostCount(ghostsRes.count || 0);
    setActivities((activityRes.data as ActivityRow[]) || []);
    setGoalCategories((goalsRes.data as GoalCategoryRow[]) || []);
    setEditedPrices({});
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const handlePriceChange = (id: string, value: string) => {
    setEditedPrices((prev) => ({ ...prev, [id]: value }));
  };

  const handleSavePrices = async () => {
    setSaving(true);
    const updates = Object.entries(editedPrices);
    for (const [id, priceStr] of updates) {
      const price = parseInt(priceStr, 10);
      if (!isNaN(price) && price >= 0) {
        await supabase.from("goal_categories").update({ max_price: price }).eq("id", id);
      }
    }
    toast({ title: "Prices updated", description: `${updates.length} goal(s) updated.` });
    await fetchData();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-display">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { id: "users" as const, label: "Users", icon: Users, count: profiles.length },
    { id: "ghosts" as const, label: "Ghosts", icon: Ghost, count: ghostCount },
    { id: "activity" as const, label: "Activity", icon: Activity, count: activities.length },
    { id: "goals" as const, label: "Goals", icon: Settings, count: goalCategories.length },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-[200px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3">
        <div className="max-w-4xl mx-auto glass rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-lg font-bold gradient-text">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <GlassButton variant="outline" onClick={fetchData} disabled={refreshing} className="px-3 py-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </GlassButton>
            <GlassButton variant="outline" onClick={() => navigate("/")} className="px-3 py-2 text-xs">
              Home
            </GlassButton>
            <GlassButton variant="outline" onClick={signOut} className="px-3 py-2">
              <LogOut className="w-4 h-4" />
            </GlassButton>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
                <GlassCard
                  animate={false}
                  variant={activeTab === tab.id ? "glow" : "default"}
                  className="text-center p-4 cursor-pointer"
                >
                  <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="font-display text-2xl font-bold text-foreground">{tab.count}</p>
                  <p className="text-xs text-muted-foreground">{tab.label}</p>
                </GlassCard>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === "users" && (
          <GlassCard animate={false}>
            <h3 className="font-display font-semibold text-foreground mb-4">Registered Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-display text-xs">Email</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-display text-xs">Spend</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-display text-xs">Goal</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-display text-xs">Queue #</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-display text-xs">Referral</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-foreground truncate max-w-[150px]">{p.email}</td>
                      <td className="py-2 px-2 text-right text-primary font-display">
                        {formatNaira(p.total_annual_spend)}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground capitalize">
                        {p.selected_goal || "—"}
                      </td>
                      <td className="py-2 px-2 text-right font-display font-bold text-foreground">
                        {p.queue_position}
                      </td>
                      <td className="py-2 px-2 text-right text-xs text-muted-foreground font-mono">
                        {p.referral_code || "—"}
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {activeTab === "ghosts" && (
          <GlassCard animate={false}>
            <h3 className="font-display font-semibold text-foreground mb-4">Ghost Users</h3>
            <div className="text-center py-8">
              <Ghost className="w-12 h-12 text-primary/30 mx-auto mb-3" />
              <p className="font-display text-4xl font-bold gradient-text">{ghostCount}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Ghost users seeded in the waitlist queue
              </p>
            </div>
          </GlassCard>
        )}

        {activeTab === "activity" && (
          <GlassCard animate={false}>
            <h3 className="font-display font-semibold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between glass rounded-xl p-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{a.user_id.slice(0, 8)}...</p>
                    <p className="text-sm font-display capitalize text-foreground">{a.action_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-display font-bold text-primary">+{a.positions_moved} skip</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No activity yet</p>
              )}
            </div>
          </GlassCard>
        )}

        {activeTab === "goals" && (
          <GlassCard animate={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground">Goal Pricing</h3>
              {Object.keys(editedPrices).length > 0 && (
                <GlassButton variant="primary" onClick={handleSavePrices} disabled={saving} className="px-4 py-2 text-xs">
                  <Save className="w-3 h-3 mr-1 inline" />
                  {saving ? "Saving..." : "Save Changes"}
                </GlassButton>
              )}
            </div>
            <div className="space-y-3">
              {goalCategories.map((cat) => {
                const currentPrice = editedPrices[cat.id] !== undefined
                  ? editedPrices[cat.id]
                  : String(cat.max_price);
                return (
                  <div key={cat.id} className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-display font-semibold text-foreground text-sm capitalize">
                          {cat.goal_type}
                          {cat.subcategory && (
                            <span className="text-muted-foreground font-normal"> → {cat.label}</span>
                          )}
                          {!cat.subcategory && (
                            <span className="text-muted-foreground font-normal"> — {cat.label}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-display">Max Price ₦</span>
                      <input
                        type="number"
                        value={currentPrice}
                        onChange={(e) => handlePriceChange(cat.id, e.target.value)}
                        className="flex-1 glass-input rounded-lg px-3 py-2 text-sm text-foreground font-display"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default Admin;
