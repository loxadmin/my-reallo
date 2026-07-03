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

    const [{ data: profile }, { data: goals }, { data: campaigns }] = await Promise.all([
      supabase.from('user_behavior_profile').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_goals').select('title, category').eq('user_id', userId).eq('status', 'active'),
      supabase.from('campaign_eligibility').select('*').eq('active', true),
    ]);

    const brands = new Set((profile?.brands_used ?? []).map((s: string) => s.toLowerCase()));
    const segs = new Set((profile?.segments ?? []).map((s: string) => s.toLowerCase()));
    const goalTitles = new Set((goals ?? []).map((g: any) => (g.title || g.category || '').toLowerCase()));
    const loc = [profile?.city, profile?.state, profile?.country].filter(Boolean).map(s => (s as string).toLowerCase());

    const now = Date.now();
    const scored = (campaigns ?? []).map((c: any) => {
      if (c.expires_at && new Date(c.expires_at).getTime() < now) return null;
      let score = c.priority ?? 0;
      const overlap = (a: string[], set: Set<string>) => (a ?? []).filter(x => set.has(String(x).toLowerCase())).length;
      score += overlap(c.eligible_brands, brands) * 3;
      score += overlap(c.eligible_segments, segs) * 3;
      score += overlap(c.eligible_goals, goalTitles) * 4;
      score += (c.eligible_locations ?? []).filter((l: string) => loc.includes(String(l).toLowerCase())).length * 2;
      score += (c.weight ?? 1);
      return { campaign_id: c.campaign_id, campaign_type: c.campaign_type, score, reason: { matched_brands: (c.eligible_brands ?? []).filter((b: string) => brands.has(b.toLowerCase())) } };
    }).filter(Boolean) as any[];

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 20);

    await supabase.from('campaign_recommendations').delete().eq('user_id', userId);
    if (top.length) {
      await supabase.from('campaign_recommendations').insert(top.map(t => ({ user_id: userId, ...t, generated_at: new Date().toISOString() })));
    }
    return new Response(JSON.stringify({ count: top.length, recommendations: top }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});