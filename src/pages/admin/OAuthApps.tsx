import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Shield, Copy, Check, RefreshCw } from "lucide-react";

const ALL_SCOPES = [
  "profile.read","email.read","username.read",
  "points.read","points.balance.read","points.matured.read",
];

type App = any;

export default function OAuthApps() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<App | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // form
  const [form, setForm] = useState({
    name: "", description: "", company_name: "", website_url: "",
    logo_url: "", contact_email: "", environment: "sandbox",
    redirect_uris: "", domains: "", scopes: [] as string[],
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!role);
      if (!role) { navigate("/dashboard"); return; }
      await load();
    })();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("oauth_apps")
      .select("*, oauth_app_redirect_uris(*), oauth_app_domains(*), oauth_app_scopes(*)")
      .order("created_at", { ascending: false });
    setApps(data ?? []);
    setLoading(false);
  }

  async function createApp() {
    const redirect_uris = form.redirect_uris.split(/\n|,/).map(s => s.trim()).filter(Boolean);
    const domains = form.domains.split(/\n|,/).map(s => s.trim()).filter(Boolean);
    if (!form.name || redirect_uris.length === 0) {
      toast.error("Name and at least one redirect URI required");
      return;
    }
    const { data, error } = await supabase.functions.invoke("oauth-app-create", {
      body: { ...form, redirect_uris, domains },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    setRevealedSecret((data as any).client_secret);
    setCreating(false);
    setForm({ name: "", description: "", company_name: "", website_url: "", logo_url: "", contact_email: "", environment: "sandbox", redirect_uris: "", domains: "", scopes: [] });
    await load();
  }

  async function updateStatus(app: App, status: string) {
    await supabase.from("oauth_apps").update({ status: status as any }).eq("id", app.id);
    await load();
    toast.success(`App ${status}`);
  }

  async function toggleScope(app: App, scope: string, approved: boolean) {
    const existing = (app.oauth_app_scopes || []).find((s: any) => s.scope === scope);
    if (existing) {
      await supabase.from("oauth_app_scopes").update({ approved }).eq("id", existing.id);
    } else {
      await supabase.from("oauth_app_scopes").insert([{ app_id: app.id, scope: scope as any, approved }]);
    }
    await load();
  }

  async function verifyDomain(domain_id: string) {
    const { data, error } = await supabase.functions.invoke("oauth-verify-domain", { body: { domain_id } });
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.verified) toast.success("Domain verified");
    else toast.error("DNS TXT not found yet");
    await load();
  }

  if (isAdmin === null) return null;

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="w-4 h-4 mr-1" />Admin</Button>
          <Shield className="w-5 h-5" />
          <h1 className="text-2xl font-bold">OAuth Applications</h1>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" />New App</Button>
      </div>

      {loading ? <p>Loading…</p> : (
        <div className="space-y-4">
          {apps.length === 0 && <Card className="p-8 text-center text-muted-foreground">No OAuth apps yet.</Card>}
          {apps.map((app) => (
            <Card key={app.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{app.name}</h3>
                    <Badge variant={app.status === "approved" ? "default" : "outline"}>{app.status}</Badge>
                    <Badge variant="secondary">{app.environment}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{app.company_name} · {app.website_url}</p>
                  <p className="text-xs font-mono mt-2 break-all">client_id: {app.client_id}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {app.status !== "approved" && <Button size="sm" onClick={() => updateStatus(app, "approved")}>Approve</Button>}
                  {app.status !== "suspended" && <Button size="sm" variant="outline" onClick={() => updateStatus(app, "suspended")}>Suspend</Button>}
                  {app.status !== "revoked" && <Button size="sm" variant="destructive" onClick={() => updateStatus(app, "revoked")}>Revoke</Button>}
                  <Button size="sm" variant="secondary" onClick={() => setSelected(app)}>Manage</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New OAuth App</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>App Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company</Label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
            </div>
            <div>
              <Label>Environment</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3" value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value })}>
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div><Label>Redirect URIs (one per line) *</Label><Textarea rows={3} value={form.redirect_uris} onChange={e => setForm({ ...form, redirect_uris: e.target.value })} placeholder="https://partner.com/oauth/callback" /></div>
            <div><Label>Allowed Domains (one per line)</Label><Textarea rows={2} value={form.domains} onChange={e => setForm({ ...form, domains: e.target.value })} placeholder="partner.com" /></div>
            <div>
              <Label>Requested Scopes</Label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {ALL_SCOPES.map((sc) => (
                  <label key={sc} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.scopes.includes(sc)} onChange={(e) => setForm({ ...form, scopes: e.target.checked ? [...form.scopes, sc] : form.scopes.filter((s) => s !== sc) })} />
                    <code className="text-xs">{sc}</code>
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={createApp}>Create App</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Secret reveal */}
      <Dialog open={!!revealedSecret} onOpenChange={() => setRevealedSecret(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save your Client Secret</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This is the only time it will be shown. Store it securely.</p>
          <div className="bg-muted p-3 rounded font-mono text-sm break-all">{revealedSecret}</div>
          <Button onClick={() => { navigator.clipboard.writeText(revealedSecret!); toast.success("Copied"); }}>
            <Copy className="w-4 h-4 mr-2" />Copy
          </Button>
        </DialogContent>
      </Dialog>

      {/* Manage dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div>
                <Label>Scopes</Label>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {ALL_SCOPES.map((sc) => {
                    const ex = (selected.oauth_app_scopes || []).find((x: any) => x.scope === sc);
                    return (
                      <label key={sc} className="flex items-center justify-between gap-2 text-sm p-2 rounded border">
                        <code className="text-xs">{sc}</code>
                        <input type="checkbox" checked={!!ex?.approved} onChange={(e) => toggleScope(selected, sc, e.target.checked)} />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Redirect URIs</Label>
                <ul className="text-sm space-y-1 mt-1">
                  {(selected.oauth_app_redirect_uris || []).map((r: any) => (<li key={r.id} className="font-mono break-all">{r.uri}</li>))}
                </ul>
              </div>
              <div>
                <Label>Domain Verification</Label>
                <div className="space-y-2 mt-2">
                  {(selected.oauth_app_domains || []).map((d: any) => (
                    <div key={d.id} className="border rounded p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{d.domain}</span>
                        {d.verified_at ? <Badge><Check className="w-3 h-3 mr-1" />Verified</Badge> : <Button size="sm" onClick={() => verifyDomain(d.id)}><RefreshCw className="w-3 h-3 mr-1" />Verify</Button>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Add a DNS TXT record:</p>
                      <code className="text-xs block mt-1 break-all">karbali-verification={d.verification_token}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}