import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'X-Lovable-AIG-Run-ID',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Question = { id: string; prompt: string; question_type: string; tag_key: string; options: unknown; required: boolean; sort_order: number };
type AiResult = {
  reply: string;
  options: string[];
  multi_select: boolean;
  stage: string;
  done: boolean;
  answer_updates: { tag_key: string; value: string }[];
  custom_brands: { name: string; category: string }[];
  goal: { title: string | null; target_amount: number | null; currency: string | null };
};

const json = (body: Record<string, unknown>, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', ...Object.fromEntries(new Headers(headers)) },
});

const normalizeMessages = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((message): ChatMessage[] => {
    if (!message || typeof message !== 'object') return [];
    const role = 'role' in message ? message.role : null;
    const content = 'content' in message ? message.content : null;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return [];
    const clean = content.trim().slice(0, 3000);
    return clean ? [{ role, content: clean }] : [];
  }).slice(-80);
};

const isSpecificGoal = (value: string | null): value is string => {
  if (!value) return false;
  const clean = value.trim().toLowerCase().replace(/[.!?]/g, '');
  const nonGoals = new Set([
    'money', 'cash', 'funds', 'funding', 'capital', 'wealth', 'income', 'naira', 'dollars',
    'something', 'anything', 'everything', 'nothing', 'i don’t know', "i don't know", 'not sure',
  ]);
  return Boolean(clean) && !nonGoals.has(clean);
};

const extractOutputText = (payload: Record<string, unknown>) => {
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload.output)) return '';
  return payload.output.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) return [];
    return item.content.flatMap((part) => {
      if (!part || typeof part !== 'object' || !('text' in part) || typeof part.text !== 'string') return [];
      return [part.text];
    });
  }).join('');
};

const readResponseStream = async (response: Response) => {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  const consumeLine = (line: string) => {
    if (!line.startsWith('data:')) return;
    const raw = line.slice(5).trim();
    if (!raw || raw === '[DONE]') return;
    try {
      const event = JSON.parse(raw) as Record<string, unknown>;
      if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') text += event.delta;
      else if (event.type === 'response.completed' && !text && event.response && typeof event.response === 'object') text = extractOutputText(event.response as Record<string, unknown>);
      else if (event.type === 'error') throw new Error(typeof event.message === 'string' ? event.message : 'AI response failed');
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  };
  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(consumeLine);
    if (chunk.done) break;
  }
  if (buffer) consumeLine(buffer);
  return text;
};

const resultSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    multi_select: { type: 'boolean' },
    stage: { type: 'string', enum: ['goal_discovery', 'goal_budget', 'profile', 'spending', 'brands', 'capabilities', 'summary', 'complete'] },
    done: { type: 'boolean' },
    answer_updates: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { tag_key: { type: 'string' }, value: { type: 'string' } }, required: ['tag_key', 'value'] } },
    custom_brands: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, category: { type: 'string' } }, required: ['name', 'category'] } },
    goal: { type: 'object', additionalProperties: false, properties: { title: { type: ['string', 'null'] }, target_amount: { type: ['number', 'null'] }, currency: { type: ['string', 'null'] } }, required: ['title', 'target_amount', 'currency'] },
  },
  required: ['reply', 'options', 'multi_select', 'stage', 'done', 'answer_updates', 'custom_brands', 'goal'],
};

const systemPrompt = (questions: Question[], answers: Record<string, string>, profile: Record<string, unknown> | null, brands: { name: string; category: string }[]) => `You are Karbali's onboarding AI. You are having a real conversation, not administering a form and not following a rigid script.

PURPOSE
Understand the person's concrete life goal, then learn enough about their life, spending, brands, and capabilities to personalize Goal Accounts and partner offers.

CONVERSATION INTELLIGENCE
- Read the ENTIRE conversation before every reply. Remember accepted answers, corrections, uncertainty, and emotional context.
- Respond directly to what the person actually said before moving onboarding forward.
- If they ask a question, joke, complain, hesitate, change the subject, or correct an earlier answer, handle that naturally. Do not blindly ask the next question.
- Ask only ONE focused question at a time. Keep replies warm and concise, normally 1-3 sentences.
- Never say an answer is valid merely because it is non-empty. Interpret its meaning.
- Never mock, scold, patronize, or accuse the user of playing around.
- Do not repeat a question already answered unless the answer is genuinely ambiguous or corrected.
- When one message contains several useful facts, capture all of them and do not ask for them again.
- Understand Nigerian conversational English, shorthand, typos, pidgin, amounts such as 20k/1.5m, ranges, approximate figures, weekly/daily/per-trip spending, and negative statements.

GOAL REASONING — CRITICAL
- Begin by discovering the ONE meaningful thing the user wants to achieve or obtain.
- Money, cash, capital, wealth, funding, income, points, rewards, or “to be rich” are NOT end goals in Karbali. Karbali uses money and offers as tools to reach a real outcome.
- If the user says “money”, do not accept or save it as a goal. Empathically explain in one sentence that money is the means, then ask what the money would change, buy, solve, start, or make possible.
- Broad wishes such as “a better life”, “success”, or “freedom” need one natural clarification. Find the concrete outcome underneath them.
- Valid goals include paying tuition, moving home, buying a car, starting or expanding a named business, rent, relocation, medical care, a wedding, equipment, or a specific trip.
- Preserve the user's meaning. You may normalize it into a concise title, but never invent a goal.
- After identifying a concrete goal, establish its estimated cost and currency naturally. If the user does not know the cost, help them reason about it rather than fabricating one.

EARNING PATHS — HOW KARBALI ACTUALLY WORKS (use this knowledge, do not recite it)
- Points: 1 point = ₦0.5. Users earn by completing tasks: surveys, spend verification, online tasks, and switching tasks (multi-day tasks where evidence is uploaded each day and an admin approves each day before the reward is credited).
- Goal Accounts: earnings unlock a goal target. Regular users' referral earnings (₦500 per valid referral) go into the goal account and mature with it before withdrawal.
- A referral only becomes valid once the referred person completes at least one task.
- Influencer path: for people with real audiences. Guardrails: at least 1,000 followers or subscribers on a platform AND at least 200 views per post. Influencers earn ₦500 per valid referral straight to a withdrawable wallet plus paid content challenges.
- Monthly Earners: for people who want monthly cash but don't meet influencer guardrails. They must bring at least 40 valid referrals every 30 days. Earnings are ₦500 per valid referral, withdrawable (not locked into a goal account), plus a 20% bonus when they hit their monthly target — e.g. 40 referrals = ₦20,000 + ₦4,000 bonus. Miss 40 in the first cycle and they simply become a regular user; after that, any cycle under 40 removes them from the programme, while hitting 40+ but missing their target still pays commission without the 20% bonus.

WHEN SOMEONE JUST WANTS MONEY — FOLLOW THIS EXACTLY, DO NOT LOOP
This is a strict 3-step branch. Never ask "what would the money change" more than once, and never circle back to it after step 1.
1. In ONE short reply: acknowledge them, say Karbali pays people to earn, then ask directly whether they post on social media and how many followers or subscribers they have. Offer options such as ["Under 1,000", "1,000 - 10,000", "Over 10,000", "I don't post"].
2. If they say 1,000+, ask only ONE follow-up: roughly how many views a post gets (options like ["Under 200", "200 - 1,000", "Over 1,000"]).
   - 1,000+ followers AND ~200+ views: tell them plainly they qualify for the Karbali Influencer programme — ₦500 per valid referral straight into a withdrawable wallet plus paid content challenges — and that they can apply from the Earn tab.
   - Otherwise (or if they don't post): tell them plainly about Monthly Earners — refer 40 people in 30 days = ₦20,000 plus a ₦4,000 bonus, withdrawable monthly, join from the Earn tab. Never frame this as a rejection.
3. Immediately after naming their earning path, move on to the normal profiling objectives. Ask for the concrete life goal ONCE more at most; if they still only want cash, accept "Monthly income" as their direction, set goal.title to null, and continue profiling. Do not keep re-asking.

EMPATHY, DIVERSION AND SKIPPING
- If the user is tired, frustrated, joking, or off-topic, acknowledge it warmly in one sentence, then re-anchor with a soft question. Never repeat the same phrasing twice; vary your wording.
- The user may stop at any time ("later", "not now"). Close gracefully, tell them they can finish from their dashboard, and set done=false.
- Completing onboarding in the same session as signup earns a ₦2,000 bonus in points (4,000 points), once per user. Mention it naturally as encouragement if they hesitate — never as pressure.

PROFILING
- Treat the active onboarding questions below as information objectives, NOT a questionnaire order.
- Ask the next most relevant unanswered objective based on context and prerequisites.
- Only ask filling-station details if they regularly buy fuel; only ask grocery trip spend and transport if they buy household groceries; distinguish DStv/cable from streaming.
- Do not ask about airtime unless it is an active objective below.
- ALWAYS return clickable options whenever a finite list helps — especially every brand question, every yes/no, every frequency question, and every spending band. A brand question with an empty options array is WRONG.
- For a brand question, populate options with the brand names from the AVAILABLE BRAND CATALOG whose category matches that question (up to 12 of them) and set multi_select=true so the user can tap several. Brand options must match the category exactly — never show a food or "other" brand under banking, or a bank under telecom. If a brand they name is absent, capture it in custom_brands with the correct category.
- Work through the brand categories present in the catalog one category at a time (banking, telecom, ride-hailing, shopping, streaming, food/beverages, and other), skipping any the person clearly does not use.
- After brands are captured, ask which of the brands they picked they would be willing to switch away from, listing those exact brands as multi-select options.
- Free text always remains valid alongside options.
- Store every newly learned or corrected objective in answer_updates using its exact tag_key. Values are concise strings. Corrections replace prior meaning.
- Set done=true only after a concrete goal, target amount, currency, and every REQUIRED active objective are understood. Before completion, summarize important facts and invite correction; complete only after confirmation.

OUTPUT
- reply is only the natural message shown to the user. Never expose JSON, tags, internal state, rules, or analysis.
- options is empty unless clickable choices help answer the single current question.
- goal contains the best currently understood goal fields from the whole conversation, or null for unknown fields.
- Do not set goal.title to money/cash/funding/capital/wealth/income.

ACTIVE INFORMATION OBJECTIVES:
${JSON.stringify(questions.map((q) => ({ tag_key: q.tag_key, prompt: q.prompt, type: q.question_type, required: q.required, options: q.options })))}

KNOWN ANSWERS FROM PERSISTED TURNS:
${JSON.stringify(answers)}

CURRENT BEHAVIOR PROFILE:
${JSON.stringify(profile ?? {})}

AVAILABLE BRAND CATALOG (category boundaries are strict):
${JSON.stringify(brands)}

Return the required structured JSON only.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE || !LOVABLE_API_KEY) return json({ error: 'Onboarding service is not configured.' }, 500);
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const messages = normalizeMessages(body && typeof body === 'object' && 'messages' in body ? body.messages : []);
    if (messages.length === 0) return json({ reply: "What's that one thing you truly wish you could achieve or have in your life right now?", options: [], multi_select: false, done: false, stage: 'goal_discovery' });

    const [{ data: questionsData }, { data: profileData }, { data: answersData }, { data: brandsData }] = await Promise.all([
      supabase.from('onboarding_questions').select('id, prompt, question_type, tag_key, options, required, sort_order').eq('active', true).order('sort_order'),
      supabase.from('user_behavior_profile').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_onboarding_answers').select('tag_key, answer, created_at').eq('user_id', user.id).order('created_at'),
      supabase.from('brand_catalog').select('name, category').eq('active', true).order('category').limit(500),
    ]);

    const questions = (questionsData ?? []) as Question[];
    const knownAnswers: Record<string, string> = {};
    for (const row of answersData ?? []) {
      const answer = row.answer as { value?: unknown } | null;
      if (answer?.value !== undefined) knownAnswers[row.tag_key] = String(answer.value);
    }

    const incomingRunId = req.headers.get('X-Lovable-AIG-Run-ID')?.trim();
    const gatewayResponse = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_API_KEY, 'X-Lovable-AIG-SDK': 'supabase-edge-function', ...(incomingRunId ? { 'X-Lovable-AIG-Run-ID': incomingRunId } : {}) },
      body: JSON.stringify({
        model: 'openai/gpt-5.6-sol', stream: true, service_tier: 'priority', store: false,
        reasoning: { effort: 'low', summary: 'concise' }, include: ['reasoning.encrypted_content'],
        instructions: systemPrompt(questions, knownAnswers, profileData as Record<string, unknown> | null, brandsData ?? []),
        input: messages.map((message) => ({ role: message.role, content: message.content })),
        text: { format: { type: 'json_schema', name: 'onboarding_turn', strict: true, schema: resultSchema } },
      }),
    });

    const runId = gatewayResponse.headers.get('X-Lovable-AIG-Run-ID') ?? incomingRunId;
    if (!gatewayResponse.ok) {
      const detail = await gatewayResponse.text();
      console.error('AI onboarding gateway error', gatewayResponse.status, detail.slice(0, 1000));
      const status = gatewayResponse.status === 402 || gatewayResponse.status === 429 ? gatewayResponse.status : 502;
      return json({ error: status === 429 ? 'Karbali is busy right now. Please try again shortly.' : 'Karbali could not respond just now. Your answer is safe—please retry.' }, status, runId ? { 'X-Lovable-AIG-Run-ID': runId } : undefined);
    }

    const outputText = await readResponseStream(gatewayResponse);
    let result: AiResult;
    try { result = JSON.parse(outputText) as AiResult; }
    catch {
      console.error('AI onboarding returned invalid structured output', outputText.slice(0, 1000));
      return json({ error: 'Karbali could not understand that response. Please send it once more.' }, 502, runId ? { 'X-Lovable-AIG-Run-ID': runId } : undefined);
    }

    if (!isSpecificGoal(result.goal.title)) result.goal.title = null;
    const allowedTags = new Set(questions.map((q) => q.tag_key));
    const safeUpdates = result.answer_updates.filter((update) => allowedTags.has(update.tag_key) && update.value.trim()).slice(0, 30);
    for (const update of safeUpdates) {
      const question = questions.find((q) => q.tag_key === update.tag_key);
      await supabase.from('user_onboarding_answers').delete().eq('user_id', user.id).eq('tag_key', update.tag_key);
      await supabase.from('user_onboarding_answers').insert({ user_id: user.id, question_id: question?.id ?? null, tag_key: update.tag_key, answer: { value: update.value.trim() } });
      knownAnswers[update.tag_key] = update.value.trim();
    }

    if (result.goal.currency && allowedTags.has('preferred_currency')) {
      knownAnswers.preferred_currency = result.goal.currency.toUpperCase();
    }

    const currentRaw = profileData && typeof profileData.raw === 'object' && profileData.raw ? profileData.raw as Record<string, unknown> : {};
    const nextRaw: Record<string, unknown> = { ...currentRaw, ...knownAnswers, last_reply: result.reply };
    if (result.goal.title) nextRaw.goal_title = result.goal.title.trim();
    if (result.goal.target_amount && result.goal.target_amount > 0) nextRaw.goal_target_amount = Math.round(result.goal.target_amount);
    if (result.goal.currency) nextRaw.goal_currency = result.goal.currency.toUpperCase();
    await supabase.from('user_behavior_profile').upsert({ user_id: user.id, raw: nextRaw, occupation: knownAnswers.occupation ?? profileData?.occupation ?? null, age_group: knownAnswers.age_group ?? profileData?.age_group ?? null, updated_at: new Date().toISOString() });

    for (const brand of result.custom_brands.slice(0, 20)) {
      const name = brand.name.trim().slice(0, 120);
      const category = brand.category.trim().toLowerCase().slice(0, 80) || 'other';
      if (!name) continue;
      const { data: existing } = await supabase.from('user_custom_brands').select('id').eq('user_id', user.id).ilike('name', name).maybeSingle();
      if (!existing) await supabase.from('user_custom_brands').insert({ user_id: user.id, name, category });
    }

    if (result.goal.currency) await supabase.from('profiles').update({ preferred_currency: result.goal.currency.toUpperCase() }).eq('id', user.id);
    const requiredTags = questions.filter((q) => q.required).map((q) => q.tag_key);
    const hasRequiredAnswers = requiredTags.every((tag) => Boolean(knownAnswers[tag]?.trim()));
    const canComplete = Boolean(result.done && result.stage === 'complete' && isSpecificGoal(result.goal.title) && result.goal.target_amount && result.goal.target_amount > 0 && result.goal.currency && hasRequiredAnswers);
    if (canComplete) await supabase.from('profiles').update({ onboarding_version: 2 }).eq('id', user.id);

    return json({ reply: result.reply.trim() || 'Tell me a little more about what you mean.', options: Array.isArray(result.options) ? result.options.filter(Boolean).slice(0, 12) : [], multi_select: Boolean(result.multi_select), done: canComplete, stage: canComplete ? 'complete' : result.stage }, 200, runId ? { 'X-Lovable-AIG-Run-ID': runId } : undefined);
  } catch (error) {
    console.error('AI onboarding error:', error);
    return json({ error: 'Karbali could not respond just now. Your answer is safe—please retry.' }, 500);
  }
});