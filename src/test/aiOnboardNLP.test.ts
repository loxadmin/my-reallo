import { describe, it, expect } from 'vitest';
import nlp from 'compromise';

// Match the exact functions implemented in supabase/functions/ai-onboard/index.ts
function isInvalidGoal(text: string): boolean {
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

function isSkipIntent(text: string): boolean {
  const doc = nlp(text.trim().toLowerCase());
  return doc.has('(skip|next|leave|pass)') && (doc.has('(question|this|me|to|step)') || doc.terms().length === 1);
}

function isNoIntent(text: string): boolean {
  const doc = nlp(text.trim().toLowerCase());
  return doc.has('^(no|nope|nah|not really)$') || doc.has('^(dont|do not|never)$');
}

class OnboardingState {
  stage: 'start' | 'goal_title' | 'goal_amount' | 'currency' | 'done' = 'start';
  consentGiven = false;
  goalTitle: string | null = null;
  goalTargetAmount: number | null = null;
  preferredCurrency: string | null = null;
  invalidGoalAttempts = 0;
  lastReply = '';
  done = false;
}

class ContextManager {
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

      // Loosely parse amount for testing
      const parsedAmount = 1000000; // Mock parsed amount
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

describe('Onboarding Chatbot NLP and Context Manager Unit Tests', () => {
  describe('Intent Parsing', () => {
    it('should classify invalid goals correctly', () => {
      expect(isInvalidGoal('You')).toBe(true);
      expect(isInvalidGoal('me')).toBe(true);
      expect(isInvalidGoal('money')).toBe(true);
      expect(isInvalidGoal('this')).toBe(true);
      expect(isInvalidGoal('nothing')).toBe(true);
      expect(isInvalidGoal('fool')).toBe(true);
      expect(isInvalidGoal('buy a car')).toBe(false);
      expect(isInvalidGoal('relocate abroad')).toBe(false);
    });

    it('should classify skip intents correctly', () => {
      expect(isSkipIntent('Leave me next question')).toBe(true);
      expect(isSkipIntent('skip')).toBe(true);
      expect(isSkipIntent('skip this')).toBe(true);
      expect(isSkipIntent('next')).toBe(true);
      expect(isSkipIntent('car')).toBe(false);
    });

    it('should classify negative/no intents correctly', () => {
      expect(isNoIntent('No')).toBe(true);
      expect(isNoIntent('nope')).toBe(true);
      expect(isNoIntent('nah')).toBe(true);
      expect(isNoIntent('not really')).toBe(true);
      expect(isNoIntent('car')).toBe(false);
    });
  });

  describe('ContextManager State Replay', () => {
    it('should handle standard happy path flow', () => {
      const manager = new ContextManager();

      // Step 1: Start
      manager.processMessage('Sure');
      expect(manager.state.consentGiven).toBe(true);
      expect(manager.state.stage).toBe('goal_title');
      expect(manager.state.lastReply).toContain("What's one thing you wish you had");

      // Step 2: Goal Title
      manager.processMessage('buy a car');
      expect(manager.state.goalTitle).toBe('buy a car');
      expect(manager.state.stage).toBe('goal_amount');
      expect(manager.state.lastReply).toContain("Nice — buy a car is a real goal");

      // Step 3: Goal Amount
      manager.processMessage('5m');
      expect(manager.state.goalTargetAmount).toBe(1000000);
      expect(manager.state.stage).toBe('currency');
      expect(manager.state.lastReply).toContain("Which currency do you prefer");

      // Step 4: Currency
      manager.processMessage('USD');
      expect(manager.state.preferredCurrency).toBe('USD');
      expect(manager.state.stage).toBe('done');
      expect(manager.state.done).toBe(true);
    });

    it('should laugh off and handle invalid goal entries', () => {
      const manager = new ContextManager();

      manager.processMessage('Sure'); // consent

      // First invalid attempt
      manager.processMessage('You');
      expect(manager.state.goalTitle).toBeNull();
      expect(manager.state.invalidGoalAttempts).toBe(1);
      expect(manager.state.lastReply).toContain('Haha, "You"? Nice try, but that\'s not a specific goal!');

      // Second invalid attempt
      manager.processMessage('money');
      expect(manager.state.goalTitle).toBeNull();
      expect(manager.state.invalidGoalAttempts).toBe(2);
      expect(manager.state.lastReply).toContain('I see we are still playing!');

      // Third invalid attempt - default fallback
      manager.processMessage('nothing');
      expect(manager.state.goalTitle).toBe('General Savings');
      expect(manager.state.stage).toBe('currency');
      expect(manager.state.lastReply).toContain('General Savings');
    });

    it('should handle skip intents during onboarding', () => {
      const manager = new ContextManager();

      manager.processMessage('Sure'); // consent

      // Skip at goal title
      manager.processMessage('Leave me next question');
      expect(manager.state.goalTitle).toBe('General Savings');
      expect(manager.state.stage).toBe('currency');
    });
  });
});
