import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Body {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = (await req.json()) as Body;

    const [{ data: questions }, { data: brands }, { data: profile }] = await Promise.all([
      supabase.from('onboarding_questions').select('id, prompt, question_type, tag_key, options, required, sort_order').eq('active', true).order('sort_order'),
      supabase.from('brand_catalog').select('name, category').eq('active', true),
      supabase.from('user_behavior_profile').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    const sys = `You are Karbali's onboarding assistant. Ask the user the following questions ONE AT A TIME, in natural conversational tone.
Understand natural language — a user can belong to multiple segments (e.g. student + business owner + entrepreneur).
Available brand catalog to reference: ${(brands ?? []).map(b => `${b.name}(${b.category})`).join(', ')}.
Questions to cover: ${JSON.stringify(questions ?? [])}.
Existing profile so far: ${JSON.stringify(profile ?? {})}.

After EACH user reply, respond with a strict JSON object:
{ "reply": "your next message to user", "extract": { "segments": [], "brands_used": [], "spending_habits": [], "task_capabilities": [], "financial": {}, "location": {"country":"","state":"","city":""}, "age_group": "", "occupation": "", "answers": [{"tag_key":"","value":<any>}] }, "done": false }
Set "done": true and ask "What are you trying to achieve?" when all required questions are covered.
Only return valid JSON — no code fences.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: sys }, ...body.messages],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: 'AI error', detail: t }), { status: aiResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const aiJson = await aiResp.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? '{}'); } catch { parsed = { reply: aiJson.choices?.[0]?.message?.content ?? '' }; }

    const ex = parsed.extract ?? {};
    const merge = (a: string[] = [], b: string[] = []) => Array.from(new Set([...(a || []), ...((b || []).map(String))]));
    const updated = {
      user_id: user.id,
      segments: merge(profile?.segments, ex.segments),
      brands_used: merge(profile?.brands_used, ex.brands_used),
      spending_habits: merge(profile?.spending_habits, ex.spending_habits),
      task_capabilities: merge(profile?.task_capabilities, ex.task_capabilities),
      financial: { ...(profile?.financial ?? {}), ...(ex.financial ?? {}) },
      country: ex.location?.country || profile?.country,
      state: ex.location?.state || profile?.state,
      city: ex.location?.city || profile?.city,
      age_group: ex.age_group || profile?.age_group,
      occupation: ex.occupation || profile?.occupation,
      raw: { ...(profile?.raw ?? {}), last_reply: parsed.reply },
      updated_at: new Date().toISOString(),
    };
    await supabase.from('user_behavior_profile').upsert(updated);

    if (Array.isArray(ex.answers)) {
      for (const a of ex.answers) {
        if (!a?.tag_key) continue;
        const q = (questions ?? []).find((x: any) => x.tag_key === a.tag_key);
        await supabase.from('user_onboarding_answers').insert({
          user_id: user.id, question_id: q?.id ?? null, tag_key: a.tag_key, answer: { value: a.value },
        });
      }
    }

    return new Response(JSON.stringify({ reply: parsed.reply ?? '', done: !!parsed.done, extract: ex }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});