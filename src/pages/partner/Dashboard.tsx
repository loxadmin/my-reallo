import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Zap, Activity } from "lucide-react";

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: apps } = await supabase.from("oauth_apps").select("*").eq("owner_user_id", user.id);
      setApps(apps ?? []);
      const m: Record<string, any> = {};
      for (const app of apps ?? []) {
        const [{ count: consents }, { count: tokens }, { data: ledger }, { count: usage }] = await Promise.all([
          supabase.from("oauth_user_consents").select("id", { count: "exact", head: true }).eq("app_id", app.id),
          supabase.from("oauth_access_tokens").select("id", { count: "exact", head: true }).eq("app_id", app.id),
          supabase.from("oauth_points_ledger").select("amount").eq("app_id", app.id),
          supabase.from("oauth_api_usage").select("id", { count: "exact", head: true }).eq("app_id", app.id),
        ]);
        const spent = (ledger || []).reduce((sum: number, r: any) => sum + (r.amount < 0 ? -r.amount : 0), 0);
        m[app.id] = { consents: consents ?? 0, tokens: tokens ?? 0, spent, usage: usage ?? 0 };
      }
      setMetrics(m);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Partner Dashboard</h1>
      </div>
      {apps.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No OAuth apps assigned to your account.</Card>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const m = metrics[app.id] || {};
            return (
              <Card key={app.id} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{app.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{app.client_id}</p>
                  </div>
                  <Badge variant={app.status === "approved" ? "default" : "outline"}>{app.status}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric icon={Users} label="Users Connected" value={m.consents} />
                  <Metric icon={Zap} label="Active Tokens" value={m.tokens} />
                  <Metric icon={Activity} label="Points Redeemed" value={m.spent} />
                  <Metric icon={Activity} label="API Calls" value={m.usage} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="w-3 h-3" />{label}</div>
      <div className="text-xl font-bold mt-1">{value ?? 0}</div>
    </div>
  );
}