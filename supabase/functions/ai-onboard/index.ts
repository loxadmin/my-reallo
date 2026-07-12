import { createClient } from 'npm:@supabase/supabase-js@2';
import nlp from 'npm:compromise@14.14.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Body {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const parseMoney = (value: string) => {
  const text = value.toLowerCase().replace(/₦|ngn|naira|,/g, '').trim();
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  if (/\b(m|mil|million)\b/.test(text) || /\d\s*m\b/.test(text)) return Math.round(n * 1_000_000);
  if (/\b(k|thousand)\b/.test(text) || /\d\s*k\b/.test(text)) return Math.round(n * 1_000);
  return Math.round(n);
};

export function isInvalidGoal(text: string): boolean {
  const clean = text.trim().toLowerCase();

  const invalidWords = new Set([
    'you', 'me', 'this', 'that', 'nothing', 'anything', 'something', 'everything',
    'money', 'cash', 'capital', 'wealth', 'funds', 'naira', 'dollars', 'none', 'nah', 'nope', 'no', 'fool'
  ]);
  if (invalidWords.has(clean)) {
    return true;
  }

  const doc = nlp(clean);
  if (doc.terms().length === 1) {
    if (doc.has('#Pronoun') || doc.has('#Preposition') || doc.has('#Conjunction')) {
      return true;
    }
    if (doc.has('(money|cash|capital|wealth|funds|naira|dollar|you|me|this|that|nothing|something|everything|anything|none|what|who|why|how|fool)')) {
      return true;
    }
  }

  return false;
}

export function isSkipIntent(text: string): boolean {
  const doc = nlp(text.trim().toLowerCase());
  return doc.has('(skip|next|leave|pass)') && (doc.has('(question|this|me|to|step)') || doc.terms().length === 1);
}

export function isNoIntent(text: string): boolean {
  const doc = nlp(text.trim().toLowerCase());
  return doc.has('^(no|nope|nah|not really)$') || doc.has('^(dont|do not|never)$');
}

export class OnboardingState {
  stage: 'start' | 'goal_title' | 'goal_amount' | 'currency' | 'done' = 'start';
  consentGiven = false;
  goalTitle: string | null = null;
  goalTargetAmount: number | null = null;
  preferredCurrency: string | null = null;
  invalidGoalAttempts = 0;
  lastReply = '';
  done = false;
}

export class ContextManager {
  state: OnboardingState;

  constructor() {
    this.state = new OnboardingState();
  }

  processMessage(userText: string) {
    const cleanText = userText.trim();
    if (!cleanText) return;

    const isSkip = isSkipIntent(cleanText);
    const isNo = isNoIntent(cleanText);

    if (this.state.stage === 'start') {
      if (isNo) {
        this.state.lastReply = "Aw, why not? Karbali can help you get up to 30 to 60% of your spend back. Whenever you're ready, let me know!";
        return;
      }
      this.state.consentGiven = true;
      this.state.stage = 'goal_title';
      this.state.lastReply = "What's one thing you wish you had in your life right now?";
      return;
    }

    if (this.state.stage === 'goal_title') {
      if (isSkip) {
        this.state.goalTitle = "General Savings";
        this.state.stage = 'currency';
        this.state.lastReply = "No problem! Let's skip the goal for now and set it to General Savings. Which currency do you prefer?";
        return;
      }

      if (isInvalidGoal(cleanText)) {
        this.state.invalidGoalAttempts++;
        if (this.state.invalidGoalAttempts === 1) {
          this.state.lastReply = `Haha, "${cleanText}"? Nice try, but that's not a specific goal! 😂 To help you build a proper roadmap and pay you back, I need a real, specific goal—like buying a car, starting a business, or school fees. So, tell me: what's one thing you wish you had in your life right now?`;
        } else if (this.state.invalidGoalAttempts === 2) {
          this.state.lastReply = `I see we are still playing! 😉 Seriously though, having a real goal is why we need to answer correctly so I can personalize your roadmap. Let's try again: what's that one thing you wish you had in your life right now?`;
        } else {
          this.state.goalTitle = "General Savings";
          this.state.stage = 'currency';
          this.state.lastReply = "No worries, let's just set your goal to General Savings for now and move on. Which currency do you prefer?";
        }
        return;
      }

      this.state.goalTitle = cleanText;
      this.state.stage = 'goal_amount';
      this.state.lastReply = `Nice — ${cleanText} is a real goal. How much money do you think would help you achieve it?`;
      return;
    }

    if (this.state.stage === 'goal_amount') {
      if (isSkip) {
        this.state.goalTargetAmount = null;
        this.state.stage = 'currency';
        this.state.lastReply = "No problem, let's skip the budget for now! Which currency do you prefer?";
        return;
      }

      if (isNo) {
        this.state.lastReply = "No problem — even a rough estimate is okay. About how much would help you achieve it?";
        return;
      }

      const parsedAmount = parseMoney(cleanText);
      if (parsedAmount === null) {
        this.state.lastReply = "No problem — even a rough estimate is okay. About how much would help you achieve it?";
        return;
      }

      this.state.goalTargetAmount = parsedAmount;
      this.state.stage = 'currency';
      this.state.lastReply = "Great — I really believe we can help you get there. Before I build the best roadmap for you, I need to understand your lifestyle a bit so I can recommend the right brands, milestones, and opportunities. Which currency do you prefer?";
      return;
    }

    if (this.state.stage === 'currency') {
      if (isSkip) {
        this.state.preferredCurrency = "NGN";
        this.state.stage = 'done';
        this.state.done = true;
        this.state.lastReply = "Perfect. I now understand your goal, and I'll use this to personalize your milestones and recommend the best offers to help you reach your goal.";
        return;
      }

      const currencies = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD', 'Other'];
      const matched = currencies.find(c => cleanText.toUpperCase().includes(c));
      this.state.preferredCurrency = matched || "NGN";
      this.state.stage = 'done';
      this.state.done = true;
      this.state.lastReply = "Perfect. I now understand your goal, and I'll use this to personalize your milestones and recommend the best offers to help you reach your goal.";
      return;
    }
  }
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
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = (await req.json()) as Body;

    const userMessages = (body.messages ?? [])
      .filter((m) => m.role === 'user')
      .map((m) => m.content.trim())
      .filter(Boolean);

    if (userMessages.length === 0) {
      return json({
        reply: "Before we begin, can I ask you one question?",
        options: ['Sure', 'Okay', 'Go ahead'],
        multi_select: false,
        done: false,
        stage: 'start',
      });
    }

    // Replay history to get before and after state
    const beforeManager = new ContextManager();
    const userMessagesBefore = userMessages.slice(0, -1);
    for (const msg of userMessagesBefore) {
      beforeManager.processMessage(msg);
    }

    const afterManager = new ContextManager();
    for (const msg of userMessages) {
      afterManager.processMessage(msg);
    }

    const stateBefore = beforeManager.state;
    const stateAfter = afterManager.state;

    // Fetch questions and profile
    const [{ data: questions }, { data: profile }] = await Promise.all([
      supabase.from('onboarding_questions').select('id, prompt, question_type, tag_key, options, required, sort_order').eq('active', true).order('sort_order'),
      supabase.from('user_behavior_profile').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    // Handle DB inserts based on transitions
    if (stateAfter.goalTitle !== stateBefore.goalTitle && stateAfter.goalTitle !== null) {
      await supabase.from('user_behavior_profile').upsert({
        user_id: user.id,
        raw: { ...(profile?.raw ?? {}), goal_title: stateAfter.goalTitle, last_reply: stateAfter.lastReply },
        updated_at: new Date().toISOString(),
      });
      const q = (questions ?? []).find((x: any) => x.tag_key === 'goal_title');
      await supabase.from('user_onboarding_answers').insert({
        user_id: user.id,
        question_id: q?.id ?? null,
        tag_key: 'goal_title',
        answer: { value: stateAfter.goalTitle },
      });
    }

    if (stateAfter.goalTargetAmount !== stateBefore.goalTargetAmount && stateAfter.goalTargetAmount !== null) {
      await supabase.from('user_behavior_profile').upsert({
        user_id: user.id,
        raw: { ...(profile?.raw ?? {}), goal_target_amount: stateAfter.goalTargetAmount, last_reply: stateAfter.lastReply },
        updated_at: new Date().toISOString(),
      });
      const q = (questions ?? []).find((x: any) => x.tag_key === 'goal_target_amount');
      await supabase.from('user_onboarding_answers').insert({
        user_id: user.id,
        question_id: q?.id ?? null,
        tag_key: 'goal_target_amount',
        answer: { value: stateAfter.goalTargetAmount },
      });
    }

    if (stateAfter.preferredCurrency !== stateBefore.preferredCurrency && stateAfter.preferredCurrency !== null) {
      await supabase.from('profiles').update({ preferred_currency: stateAfter.preferredCurrency.toUpperCase() }).eq('id', user.id);
    }

    if (stateAfter.done && !stateBefore.done) {
      await supabase.from('profiles').update({ onboarding_version: 2 }).eq('id', user.id);
    }

    return json({
      reply: stateAfter.lastReply,
      options: stateAfter.stage === 'start' ? ['Sure', 'Okay', 'Go ahead'] :
               stateAfter.stage === 'currency' ? ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD', 'Other'] : [],
      multi_select: false,
      done: stateAfter.done,
      stage: stateAfter.stage === 'goal_title' || stateAfter.stage === 'goal_amount' ? 'goals' : stateAfter.stage,
    });
  } catch (e) {
    console.error('AI onboarding error:', e);
    return json({ reply: "Sorry, something got stuck. Please try that answer once more and I'll continue.", options: [], multi_select: false, done: false, stage: 'profile' });
  }
});
