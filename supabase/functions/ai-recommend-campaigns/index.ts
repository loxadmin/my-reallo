import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!u?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const goalAccountId: string | undefined = body?.goal_account_id;

    const [{ data: profile }, { data: goalAccounts }, { data: campaigns }, { data: brandCatalog }] = await Promise.all([
      supabase.from('user_behavior_profile').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('goal_accounts').select('id, title, category').eq('user_id', userId).eq('status', 'active'),
      supabase.from('campaign_eligibility').select('*').eq('active', true),
      supabase.from('brand_catalog').select('name, category').eq('active', true),
    ]);

    const brands = new Set((profile?.brands_used ?? []).map((s: string) => s.toLowerCase()));
    // Build "brand migration" targets: for each user brand, find partner brands in same category
    const migrations = new Map<string, string[]>();
    const cat = new Map<string, string>();
    (brandCatalog ?? []).forEach((b: any) => cat.set(b.name.toLowerCase(), b.category));
    (profile?.brands_used ?? []).forEach((ub: string) => {
      const c = cat.get(String(ub).toLowerCase());
      if (!c) return;
      const alts = (brandCatalog ?? [])
        .filter((b: any) => b.category === c && b.name.toLowerCase() !== String(ub).toLowerCase())
        .map((b: any) => b.name.toLowerCase());
      if (alts.length) migrations.set(String(ub).toLowerCase(), alts);
    });
    const migrationTargets = new Set<string>([...migrations.values()].flat());
    const segs = new Set((profile?.segments ?? []).map((s: string) => s.toLowerCase()));
    const goalTitles = new Set((goalAccounts ?? []).map((g: any) => (g.title || g.category || '').toLowerCase()));
    const loc = [profile?.city, profile?.state, profile?.country].filter(Boolean).map(s => (s as string).toLowerCase());

    const now = Date.now();
    const scored = (campaigns ?? []).map((c: any) => {
      if (c.expires_at && new Date(c.expires_at).getTime() < now) return null;
      let score = c.priority ?? 0;
      const overlap = (a: string[], set: Set<string>) => (a ?? []).filter(x => set.has(String(x).toLowerCase())).length;
      score += overlap(c.eligible_brands, brands) * 3;
      // Brand migration boost
      const migMatched = (c.eligible_brands ?? []).filter((b: string) => migrationTargets.has(String(b).toLowerCase()));
      score += migMatched.length * 5;
      score += overlap(c.eligible_segments, segs) * 3;
      score += overlap(c.eligible_goals, goalTitles) * 4;
      score += (c.eligible_locations ?? []).filter((l: string) => loc.includes(String(l).toLowerCase())).length * 2;
      score += Number(c.ai_weight ?? c.weight ?? 1);
      return {
        campaign_id: c.campaign_id,
        campaign_type: c.campaign_type,
        score,
        reason: {
          matched_brands: (c.eligible_brands ?? []).filter((b: string) => brands.has(String(b).toLowerCase())),
          migration_targets: migMatched,
        },
      };
    }).filter(Boolean) as any[];

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 20);

    let del = supabase.from('campaign_recommendations').delete().eq('user_id', userId);
    if (goalAccountId) del = del.eq('goal_account_id', goalAccountId);
    await del;
    if (top.length) {
      await supabase.from('campaign_recommendations').insert(top.map(t => ({
        user_id: userId, goal_account_id: goalAccountId ?? null, ...t, generated_at: new Date().toISOString(),
      })));
    }
    return new Response(JSON.stringify({ count: top.length, recommendations: top }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});