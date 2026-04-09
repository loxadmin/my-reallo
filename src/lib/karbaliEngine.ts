// Karbali Conversation Engine — state machine + NLP

export type ConversationState =
  | "WELCOME"
  | "DATA_SPEND"
  | "ELECTRICITY_SPEND"
  | "FOOD_SPEND"
  | "TRANSPORT_SPEND"
  | "SUMMARY"
  | "GOAL_SELECTION"
  | "ONBOARDING_COMPLETE"
  | "DASHBOARD";

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  quickReplies?: string[];
  timestamp: number;
}

export interface ConversationData {
  dataWeekly?: number;
  electricityMonthly?: number;
  foodWeekly?: number;
  transportWeekly?: number;
  goal?: string;
  goalTarget?: number;
}

interface Profile {
  annual_data_spend: number;
  annual_electricity_spend: number;
  annual_food_spend: number;
  annual_transport_spend: number;
  total_annual_spend: number;
  selected_goal: string | null;
  target_amount: number;
  queue_position: number;
  email: string;
  points_balance: number;
  referral_code: string | null;
  off_queue_at: string | null;
}

// Derive conversation state from user profile
export function getConversationState(profile: Profile | null): ConversationState {
  if (!profile) return "WELCOME";
  if (!profile.annual_data_spend || profile.annual_data_spend === 0) return "DATA_SPEND";
  if (!profile.annual_electricity_spend || profile.annual_electricity_spend === 0) return "ELECTRICITY_SPEND";
  if (profile.annual_food_spend === null || profile.annual_food_spend === undefined) return "FOOD_SPEND";
  if (profile.annual_transport_spend === null || profile.annual_transport_spend === undefined) return "TRANSPORT_SPEND";
  if (!profile.selected_goal) return "GOAL_SELECTION";
  return "DASHBOARD";
}

// Extract amount from natural language
export function extractAmount(input: string): number | null {
  const cleaned = input
    .replace(/,/g, "")
    .replace(/₦/g, "")
    .replace(/naira/gi, "")
    .replace(/per\s*(week|month|day)/gi, "")
    .trim();

  // Handle "5k", "5K"
  const kMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*k/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  // Handle "5m", "5M"
  const mMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*m/i);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000000);

  // Handle regular numbers
  const numMatch = cleaned.match(/\d+(?:\.\d+)?/);
  if (numMatch) return Math.round(parseFloat(numMatch[0]));

  // Handle word numbers
  const wordMap: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    thousand: 1000, hundred: 100,
  };
  const lower = input.toLowerCase();
  for (const [word, val] of Object.entries(wordMap)) {
    if (lower.includes(word)) return val;
  }

  return null;
}

// Detect goal from natural language
export function detectGoal(input: string): { goal: string; label: string } | null {
  const text = input.toLowerCase();
  if (text.includes("education") || text.includes("school") || text.includes("study") || text.includes("learn")) {
    return { goal: "education", label: "Education" };
  }
  if (text.includes("vacation") || text.includes("travel") || text.includes("japa") || text.includes("trip") || text.includes("holiday")) {
    return { goal: "vacation", label: "Vacation" };
  }
  if (text.includes("business") || text.includes("startup") || text.includes("invest") || text.includes("fund")) {
    return { goal: "business", label: "Business Funding" };
  }
  if (text.includes("rent") || text.includes("house") || text.includes("apartment") || text.includes("home")) {
    return { goal: "rent", label: "Rent Support" };
  }
  return null;
}

// Format currency
function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG");
}

// Get username from email
export function getUserName(email: string): string {
  return email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
}

// Generate welcome messages for new users
export function getWelcomeMessages(email: string): ChatMessage[] {
  const name = getUserName(email);
  return [
    {
      id: "welcome-1",
      role: "assistant",
      content: `Hey ${name} 👋`,
      timestamp: Date.now(),
    },
    {
      id: "welcome-2",
      role: "assistant",
      content: "I'm your Karbali assistant. I'll help you track your spending and turn it into real savings.",
      timestamp: Date.now() + 100,
    },
    {
      id: "welcome-3",
      role: "assistant",
      content: "Let's start with your data spend — how much do you spend on mobile data every week? 📱",
      timestamp: Date.now() + 200,
    },
  ];
}

// Process a user message and return response + updates
export interface ProcessResult {
  response: string;
  nextState: ConversationState;
  quickReplies?: string[];
  profileUpdate?: Record<string, number | string | null>;
  spendData?: {
    annualData?: number;
    annualElectricity?: number;
    annualFood?: number;
    annualTransport?: number;
    totalAnnual?: number;
  };
}

export function processMessage(
  state: ConversationState,
  message: string,
  data: ConversationData,
  profile: Profile | null
): ProcessResult {
  switch (state) {
    case "WELCOME":
    case "DATA_SPEND": {
      const amount = extractAmount(message);
      if (!amount || amount <= 0) {
        return {
          response: "I didn't quite catch that. Could you tell me how much you spend on data per week? Just the number is fine, like \"2000\" or \"5k\" 😊",
          nextState: "DATA_SPEND",
        };
      }
      data.dataWeekly = amount;
      const annual = amount * 52;
      return {
        response: `${formatNaira(amount)} weekly on data — that's about ${formatNaira(annual)} per year! 📊\n\nNow, how much do you spend on electricity per month? ⚡`,
        nextState: "ELECTRICITY_SPEND",
        spendData: { annualData: annual },
      };
    }

    case "ELECTRICITY_SPEND": {
      const amount = extractAmount(message);
      if (!amount || amount <= 0) {
        return {
          response: "Could you tell me your monthly electricity spend? For example \"8000\" or \"15k\" ⚡",
          nextState: "ELECTRICITY_SPEND",
        };
      }
      data.electricityMonthly = amount;
      const annual = amount * 12;
      return {
        response: `${formatNaira(amount)} monthly on electricity. That's ${formatNaira(annual)} a year! 💡\n\nWhat about food — how much do you spend weekly on food? 🍛`,
        nextState: "FOOD_SPEND",
        spendData: { annualElectricity: annual },
      };
    }

    case "FOOD_SPEND": {
      const amount = extractAmount(message);
      if (!amount && amount !== 0) {
        return {
          response: "How much do you spend on food per week? Even an estimate like \"10k\" or \"7000\" works! 🍛",
          nextState: "FOOD_SPEND",
        };
      }
      data.foodWeekly = amount;
      const annual = amount * 52;
      return {
        response: `Got it — ${formatNaira(amount)} weekly on food (${formatNaira(annual)}/year).\n\nLast one! How much do you spend on transport weekly? 🚗`,
        nextState: "TRANSPORT_SPEND",
        spendData: { annualFood: annual },
      };
    }

    case "TRANSPORT_SPEND": {
      const amount = extractAmount(message);
      if (!amount && amount !== 0) {
        return {
          response: "How much do you spend on transport per week? Just the number is fine 🚗",
          nextState: "TRANSPORT_SPEND",
        };
      }
      data.transportWeekly = amount;
      const annualTransport = amount * 52;
      const annualData = (data.dataWeekly || 0) * 52;
      const annualElectricity = (data.electricityMonthly || 0) * 12;
      const annualFood = (data.foodWeekly || 0) * 52;
      const total = annualData + annualElectricity + annualFood + annualTransport;

      return {
        response: `Here's your annual spend breakdown 👀\n\n📱 Data: ${formatNaira(annualData)}\n⚡ Electricity: ${formatNaira(annualElectricity)}\n🍛 Food: ${formatNaira(annualFood)}\n🚗 Transport: ${formatNaira(annualTransport)}\n\n💰 **Total: ${formatNaira(total)}/year**\n\nThat's a lot of money leaving your account! Let's put it to work.\n\nWhat's your savings goal? 🎯`,
        nextState: "GOAL_SELECTION",
        quickReplies: ["Education 📚", "Vacation ✈️", "Business 💼", "Rent Support 🏠"],
        spendData: {
          annualData,
          annualElectricity,
          annualFood,
          annualTransport,
          totalAnnual: total,
        },
        profileUpdate: {
          annual_data_spend: annualData,
          annual_electricity_spend: annualElectricity,
          annual_food_spend: annualFood,
          annual_transport_spend: annualTransport,
          total_annual_spend: total,
        },
      };
    }

    case "GOAL_SELECTION": {
      const goal = detectGoal(message);
      if (!goal) {
        return {
          response: "Which goal resonates with you? Pick one or tell me in your own words! 🎯",
          nextState: "GOAL_SELECTION",
          quickReplies: ["Education 📚", "Vacation ✈️", "Business 💼", "Rent Support 🏠"],
        };
      }
      const totalSpend = profile?.total_annual_spend || 0;
      return {
        response: `Great choice — **${goal.label}**! 🎉\n\nYou're now in the queue. Here's the deal:\n\n🔢 Every day, 50 people advance in the queue\n👫 Refer a friend to jump 20 spots\n💰 Once you're off the queue, you can claim your spend back\n\nYour referral code is ready to share. Let's get you moving! 🚀`,
        nextState: "ONBOARDING_COMPLETE",
        profileUpdate: {
          selected_goal: goal.goal,
          target_amount: Math.min(totalSpend, 500000),
        },
      };
    }

    case "DASHBOARD":
    default: {
      // General dashboard chat — provide helpful responses
      const lower = message.toLowerCase();
      if (lower.includes("refer") || lower.includes("invite") || lower.includes("friend")) {
        return {
          response: `Your referral code is **${profile?.referral_code || "loading..."}** 🔗\n\nShare it with friends! For every person who signs up:\n${(profile?.queue_position ?? 0) > 0 ? "• You skip 20 spots in the queue" : "• You earn 1,000 points (₦500 value)"}\n\nThe more you share, the faster you benefit! 🚀`,
          nextState: "DASHBOARD",
        };
      }
      if (lower.includes("queue") || lower.includes("position") || lower.includes("when")) {
        const pos = profile?.queue_position ?? 0;
        if (pos <= 0) {
          return {
            response: "You're already off the queue! 🎉 You can now verify your spend and claim your voucher.",
            nextState: "DASHBOARD",
          };
        }
        return {
          response: `You're currently at position **#${pos}** in the queue.\n\n50 people advance daily. Refer friends to jump ahead faster! 📊`,
          nextState: "DASHBOARD",
        };
      }
      if (lower.includes("point") || lower.includes("balance") || lower.includes("earn")) {
        return {
          response: `Your current points balance: **${(profile?.points_balance ?? 0).toLocaleString()}** points\n\n1 point = ₦0.50. Complete offers in the Earn tab to grow your balance! 💎`,
          nextState: "DASHBOARD",
        };
      }
      if (lower.includes("verify") || lower.includes("claim") || lower.includes("voucher")) {
        if ((profile?.queue_position ?? 999) > 0) {
          return {
            response: "You need to be off the queue first before you can verify your spend and claim vouchers. Keep referring friends to speed things up! 🏃‍♂️",
            nextState: "DASHBOARD",
          };
        }
        return {
          response: "Head to the Verify tab to submit your transaction IDs and verify your spend. Once verified and matured, you can claim your voucher! ✅",
          nextState: "DASHBOARD",
        };
      }
      return {
        response: "I'm here to help! You can ask me about:\n\n• Your queue position 📊\n• Your points balance 💎\n• How to refer friends 👫\n• Verifying your spend ✅\n\nWhat would you like to know?",
        nextState: "DASHBOARD",
        quickReplies: ["My queue position", "My points", "How to refer", "How to verify"],
      };
    }
  }
}

// Get dashboard suggestion messages
export function getDashboardSuggestions(profile: Profile): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  const pos = profile.queue_position ?? 0;

  if (pos > 0) {
    msgs.push({
      id: "suggest-referral",
      role: "assistant",
      content: `💡 **Tip:** Refer just one friend and skip 20 spots! Your code: **${profile.referral_code}**`,
      timestamp: Date.now(),
    });
    const daysLeft = Math.ceil(pos / 50);
    msgs.push({
      id: "suggest-eta",
      role: "assistant",
      content: `📊 At current pace, you could be off the queue in about **${daysLeft} days**. Referrals can cut that dramatically!`,
      timestamp: Date.now() + 100,
    });
  } else {
    msgs.push({
      id: "suggest-offqueue",
      role: "assistant",
      content: "🎉 You're off the queue! Head to the Verify tab to start verifying your spend transactions.",
      timestamp: Date.now(),
    });
    if (profile.points_balance > 0) {
      msgs.push({
        id: "suggest-points",
        role: "assistant",
        content: `💰 You have **${profile.points_balance.toLocaleString()} points** (worth ₦${(profile.points_balance * 0.5).toLocaleString()}). Keep earning through offers!`,
        timestamp: Date.now() + 100,
      });
    }
  }

  return msgs;
}

// Chat messages storage key
const CHAT_KEY = "karbali_chat_messages";

export function loadMessages(userId: string): ChatMessage[] {
  try {
    const stored = localStorage.getItem(`${CHAT_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveMessages(userId: string, messages: ChatMessage[]): void {
  try {
    // Keep last 200 messages to avoid storage bloat
    const trimmed = messages.slice(-200);
    localStorage.setItem(`${CHAT_KEY}_${userId}`, JSON.stringify(trimmed));
  } catch {
    // Storage full, clear and retry
    localStorage.removeItem(`${CHAT_KEY}_${userId}`);
  }
}
