import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Check } from "lucide-react";

const SCOPE_LABELS: Record<string, string> = {
  "profile.read": "Your profile information",
  "email.read": "Your email address",
  "username.read": "Your username",
  "points.read": "Your total Karbali points",
  "points.balance.read": "Your Karbali points balance",
  "points.matured.read": "Your matured (spendable) Karbali points",
};

export default function OAuthAuthorize() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const client_id = params.get("client_id");
  const redirect_uri = params.get("redirect_uri");
  const scope = params.get("scope") || "";
  const state = params.get("state") || "";
  const code_challenge = params.get("code_challenge");
  const code_challenge_method = params.get("code_challenge_method") || "S256";

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const ret = encodeURIComponent(window.location.pathname + window.location.search);
        navigate(`/auth?return=${ret}`);
        return;
      }
      try {
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-authorize`);
        url.searchParams.set("client_id", client_id ?? "");
        url.searchParams.set("redirect_uri", redirect_uri ?? "");
        url.searchParams.set("scope", scope);
        url.searchParams.set("code_challenge", code_challenge ?? "");
        url.searchParams.set("code_challenge_method", code_challenge_method);
        const r = await fetch(url.toString(), {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const j = await r.json();
        if (!r.ok) setError(j.error || "Request failed");
        else setInfo(j);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function decide(allow: boolean) {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("oauth-consent", {
      body: {
        client_id, redirect_uri, scope: info.scopes,
        code_challenge, code_challenge_method,
        allow, state,
      },
    });
    if (error || (data as any)?.error) {
      setError((data as any)?.error || error?.message || "Failed");
      setBusy(false);
      return;
    }
    window.location.href = (data as any).redirect;
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="p-6 max-w-md"><p className="text-destructive font-medium">{error}</p></Card></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          {info.app.logo_url ? (
            <img src={info.app.logo_url} alt={info.app.name} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div>
          )}
          <div>
            <h2 className="font-bold">{info.app.name}</h2>
            {info.app.company_name && <p className="text-xs text-muted-foreground">by {info.app.company_name}</p>}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2"><strong>{info.app.name}</strong> wants access to:</p>
          <ul className="space-y-2">
            {info.scopes.map((sc: string) => (
              <li key={sc} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{SCOPE_LABELS[sc] ?? sc}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>Cancel</Button>
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Allow</Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">By allowing, you grant {info.app.name} access to the data above through your Karbali account.</p>
      </Card>
    </div>
  );
}