import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const sys = `You are Karbali's onboarding assistant — warm, patient, human, and genuinely conversational. You are NOT a form. You are a friend collecting info in a chat.

CONVERSATION RULES (most important):
- ALWAYS acknowledge what the user just said before moving on ("Got it — 20k on transport, noted." / "Cool, thanks."). Never ignore their message.
- If the user asks YOU a question (e.g. "did you get the transport?", "what did I say for food?", "can you repeat?", "wait what?"), ANSWER it directly using the conversation history and the extracted profile so far. Only after answering, gently continue where you left off.
- If the user seems confused, apologize, re-explain, and offer an example. Never repeat the same question verbatim twice in a row — rephrase it.
- Vary your wording. Use light, natural filler ("nice", "okay", "gotcha", "makes sense"). Be brief — 1–2 sentences per reply.
- Track what you've already asked (visible in the message history) — do NOT re-ask questions the user already answered. If an answer is ambiguous, ask a short clarifier instead of restarting.
- The user can go back: "actually change my food to 15k" — update your understanding and confirm the change.
- Never output raw JSON, braces, brackets, code fences, or field names in the "reply". The reply is plain chat text ONLY.

PARSING (be generous with imprecise human answers):
- Numeric answers may include filler words, currency, or suffixes: "like 20k", "around 20,000", "about ₦20k", "20k naira", "twenty thousand", "20 thousand" → 20000. "1.5m", "1.5 million" → 1500000. "a few hundred" → 500. "nothing"/"none"/"n/a"/"skip"/"don't spend" → 0.
- If a user answers "same as before", "similar", "same" — use the last numeric value they gave for that kind of question.
- If a user gives a range ("10-15k"), take the midpoint.
- Yes-ish: yes, yeah, yep, sure, ok, y, correct, of course, definitely → true. No-ish: no, nope, nah, not really, n → false.
- For brand lists, split by commas/"and"/newlines; match loosely against the catalog (case-insensitive, ignore punctuation). Items that don't match any catalog brand in the CURRENT category are custom brands for THAT category (not "other"). Items that clearly aren't brands (e.g. food items when asking banks) should be politely ignored, not saved.
- If you can't parse the user's answer at all, ask a gentle clarifying question — don't repeat the same prompt verbatim.
Understand natural language — a user can belong to multiple segments (e.g. student + business owner + entrepreneur).
Available brand catalog to reference: ${(brands ?? []).map(b => `${b.name}(${b.category})`).join(', ')}.
Questions to cover: ${JSON.stringify(questions ?? [])}.
Existing profile so far: ${JSON.stringify(profile ?? {})}.

You MUST cover, in this order:
1. Preferred currency (NGN, USD, GBP, EUR, GHS, KES, ZAR, CAD, AUD, or Other — accept typed value).
2. Location (country, state, city), age group, occupation.
3. Segments (student, parent, entrepreneur, employee, business owner, other — multi).
4. Brands they use, category by category. Cover these categories in order, ONE at a time, skipping any category where the brand catalog has no matching brands AND the user has nothing to add:
   - bank (banks & fintech apps)
   - telecom (mobile networks / SIM)
   - ride (ride-hailing & transport apps)
   - food (restaurants, food delivery, quick-service)
   - beverages (soft drinks, juices, water, energy drinks, malt, alcohol — e.g. Coca-Cola, Pepsi, Chivita, Hollandia, Eva, Predator, Guinness)
   - groceries (supermarkets & provisions — e.g. Shoprite, Ebeano, Spar, Addide, market vendors)
   - household (staples & home goods — rice, oil, detergent, tissue — e.g. Mama Gold, Kings Oil, Ariel, Rex, Cussons)
   - personal_care (toiletries, skincare, cosmetics — e.g. Dettol, Nivea, Colgate, Zaron)
   - fashion (clothing, shoes, accessories — offline stores & online e.g. Jumia Fashion, Ruff n Tumble)
   - pharmacy (pharmacies & medicine — e.g. HealthPlus, MedPlus, Alpha Pharmacy)
   - fuel (petrol stations — e.g. NNPC, TotalEnergies, Mobil, Ardova, Conoil)
   - shopping (general e-commerce & marketplaces — e.g. Jumia, Konga, Jiji)
   - utilities (electricity discos, water, waste — e.g. IKEDC, EKEDC, AEDC)
   - internet (ISPs & data — e.g. Spectranet, Smile, Tizeti/Wifi.com.ng)
   - streaming (Netflix, DStv, Showmax, YouTube Premium, Spotify, Boomplay)
   - education (schools, tutoring, edtech — e.g. uLesson, Prepclass)
   - entertainment (cinemas, events, gaming — e.g. Filmhouse, Genesis, BetKing)
   Ask ONE category at a time. When asking about a category, the "options" array MUST contain ONLY brands from the brand catalog whose category exactly matches the category being asked. NEVER mix categories. Brands in the catalog with category 'other' are miscellaneous — do NOT surface them inside any specific category's options list. After presenting the category chips, ALWAYS append the message "Any OTHER brand not on my list? Type it in." — capture typed brands into extract.custom_brands with the CURRENT category (not 'other'). If the catalog has no brands for a category, still ask the user which brands/products they use in that category and save every typed item into extract.custom_brands with that category. If the user's typed answer contains items that clearly don't belong to the current category, politely ignore those and only record the ones that fit; do NOT save mismatched items as brands of that category. If the user says "none", "I don't use any", or similar, acknowledge and move to the next category.
5. Monthly spend on: data, airtime, electricity, transport, food, rent, streaming — all numeric (in the user's preferred currency; still store the raw number in financial with keys monthly_<x>_spend).
6. Other required questions from the list.
7. Brand switching — once you have their brands, present a summary like:
   "Which of these are you willing to switch from to a Karbali partner that offers the same service? Answer yes or no for each: OPay, Uber, Peak Milk..."
   Capture answers into extract.switch_intent as [{ brand: string, category: string, willing: boolean }].

After EACH user reply, respond with a STRICT JSON object (no code fences):
{
  "reply": "your next message",
  "options": ["optional", "clickable", "choices"],
  "multi_select": false,
  "extract": {
    "preferred_currency": "",
    "segments": [], "brands_used": [], "custom_brands": [{"name":"","category":""}],
    "spending_habits": [], "task_capabilities": [],
    "financial": { "monthly_data_spend": 0, "monthly_airtime_spend": 0, "monthly_electricity_spend": 0, "monthly_transport_spend": 0, "monthly_food_spend": 0, "monthly_rent_spend": 0, "monthly_streaming_spend": 0 },
    "location": {"country":"","state":"","city":""}, "age_group": "", "occupation": "",
    "answers": [{"tag_key":"","value":null}],
    "switch_intent": [{"brand":"","category":"","willing":false}]
  },
  "stage": "currency|profile|brands|spend|switch|done",
  "done": false
}
Only mark "done": true after the switch_intent step is complete for every brand the user selected. When done, confirm and ask "What goal are you working toward?".

IMPORTANT — whenever your question has a fixed set of choices, ALWAYS include them in the "options" array so the UI can render them as clickable chips. Set "multi_select": true when the user can pick multiple (e.g. segments, brands per category, spending habits). Examples of when to include options:
- Currency picker: ["NGN","USD","GBP","EUR","GHS","KES","ZAR","CAD","AUD","Other"]
- Age group, occupation categories, income ranges
- Segments (multi): ["Student","Parent","Entrepreneur","Employee","Business owner","Other"]
- Brand catalog per category (multi) — include ONLY the catalog brands whose category matches the one being asked; never mix categories. Do not include catalog entries with category 'other' in any specific category's chip list.
- Yes/No for switch intent per brand: ["Yes","No"]
Do NOT include options for free-text numeric questions (monthly spend amounts) or open-ended city/name inputs.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [{ role: 'system', content: sys }, ...body.messages],
        temperature: 0.8,
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

    // Sanitize reply: strip any stray JSON/code fences so users never see raw braces
    {
      let r = typeof parsed.reply === 'string' ? parsed.reply : '';
      r = r.replace(/```[\s\S]*?```/g, '');
      // Strip lines that are pure JSON syntax like "{", "}", "[", "]"
      r = r.split('\n').filter(l => !/^\s*[\{\}\[\]]+\s*,?\s*$/.test(l)).join('\n');
      // Remove obvious field-name leakage
      r = r.replace(/"(reply|options|extract|stage|done|multi_select)"\s*:/gi, '');
      r = r.trim();
      if (!r || r.startsWith('{') || r.startsWith('[') || r.length < 2) {
        r = "Sorry, I got tangled up — could you say that once more?";
      }
      parsed.reply = r;
    }

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

    // Save preferred currency to profile
    if (typeof ex.preferred_currency === 'string' && ex.preferred_currency.trim()) {
      await supabase.from('profiles').update({ preferred_currency: ex.preferred_currency.trim().toUpperCase() }).eq('id', user.id);
    }

    // Persist user-typed custom brands
    if (Array.isArray(ex.custom_brands)) {
      for (const cb of ex.custom_brands) {
        if (!cb?.name) continue;
        await supabase.from('user_custom_brands').insert({
          user_id: user.id, name: String(cb.name).trim(), category: cb.category ?? null,
        });
      }
    }

    // Persist switch intent answers
    if (Array.isArray(ex.switch_intent)) {
      for (const s of ex.switch_intent) {
        if (!s?.brand) continue;
        await supabase.from('user_brand_switch_intent').upsert({
          user_id: user.id,
          brand_name: String(s.brand).trim(),
          brand_category: s.category ?? null,
          willing_to_switch: !!s.willing,
          captured_at: new Date().toISOString(),
        });
      }
    }

    if (Array.isArray(ex.answers)) {
      for (const a of ex.answers) {
        if (!a?.tag_key) continue;
        const q = (questions ?? []).find((x: any) => x.tag_key === a.tag_key);
        await supabase.from('user_onboarding_answers').insert({
          user_id: user.id, question_id: q?.id ?? null, tag_key: a.tag_key, answer: { value: a.value },
        });
      }
    }

    // Bump onboarding_version when the flow is complete
    if (parsed.done) {
      await supabase.from('profiles').update({ onboarding_version: 2 }).eq('id', user.id);
    }

    return new Response(JSON.stringify({
      reply: parsed.reply ?? '',
      options: Array.isArray(parsed.options) ? parsed.options.map((o: any) => String(o)).filter(Boolean) : [],
      multi_select: !!parsed.multi_select,
      done: !!parsed.done,
      stage: parsed.stage ?? null,
      extract: ex,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});