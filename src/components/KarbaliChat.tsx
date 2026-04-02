import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Bot, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: number;
}

interface KarbaliChatProps {
  onOnboardingComplete?: () => void;
  mode?: "fullscreen" | "embedded";
  proactiveTip?: string;
}

// Use the common chat key from karbaliEngine if possible, or define a stable one here
const CHAT_KEY = "karbali_chat_v3";

function loadMessages(userId: string): ChatMessage[] {
  try {
    const stored = localStorage.getItem(`${CHAT_KEY}_${userId}`);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load messages:", e);
    return [];
  }
}

function saveMessages(userId: string, messages: ChatMessage[]): void {
  if (!userId) return;
  try {
    // Keep last 100 messages for context and storage efficiency
    const trimmed = messages.slice(-100);
    localStorage.setItem(`${CHAT_KEY}_${userId}`, JSON.stringify(trimmed));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("Storage quota exceeded, trimming chat history further...");
      try {
        localStorage.setItem(`${CHAT_KEY}_${userId}`, JSON.stringify(messages.slice(-50)));
      } catch {
        try {
          localStorage.setItem(`${CHAT_KEY}_${userId}`, JSON.stringify(messages.slice(-20)));
        } catch {
          // If still failing, just don't update storage for this message
          console.error("Critical storage failure: could not save even minimal chat history.");
        }
      }
    } else {
      console.error("Chat storage error:", e);
    }
  }
}

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-end gap-2 mb-4"
  >
    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <Bot className="w-3.5 h-3.5 text-primary" />
    </div>
    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/40"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  </motion.div>
);

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 mb-3 ${isAssistant ? "" : "flex-row-reverse"}`}
    >
      {isAssistant && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      {!isAssistant && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
          <UserIcon className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
          isAssistant
            ? "bg-muted text-foreground rounded-bl-md"
            : "bg-primary text-primary-foreground rounded-br-md"
        }`}
      >
        {isAssistant ? (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 [&>ul]:mb-1 [&>ol]:mb-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    </motion.div>
  );
};

async function streamChat({
  messages,
  profile,
  onDelta,
  onDone,
  signal,
}: {
  messages: { role: string; content: string }[];
  profile: any;
  onDelta: (text: string) => void;
  onDone: (fullText: string) => void;
  signal?: AbortSignal;
}) {
  // Use import.meta.env for reliable access to Supabase environment variables in Vite
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (supabase as any).supabaseUrl;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (supabase as any).supabaseKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration missing");
  }

  const chatUrl = `${supabaseUrl}/functions/v1/karbali-chat`;

  const resp = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
      "apikey": supabaseKey,
    },
    body: JSON.stringify({ messages, profile }),
    signal,
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${resp.status}`);
  }

  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let fullText = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          fullText += content;
          onDelta(content);
        }
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Flush remaining buffer
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          fullText += content;
          onDelta(content);
        }
      } catch { /* ignore */ }
    }
  }

  onDone(fullText);
}

// Parse special blocks from assistant response
function parseActions(text: string): {
  cleanText: string;
  profileUpdate?: Record<string, any>;
  navigate?: string;
} {
  let cleanText = text;
  let profileUpdate: Record<string, any> | undefined;
  let navigate: string | undefined;

  // Parse karbali-save blocks
  const saveMatch = text.match(/```karbali-save\s*\n([\s\S]*?)\n```/);
  if (saveMatch) {
    try {
      profileUpdate = JSON.parse(saveMatch[1]);
      cleanText = cleanText.replace(saveMatch[0], "").trim();
    } catch { /* ignore */ }
  }

  // Parse karbali-navigate blocks
  const navMatch = text.match(/```karbali-navigate\s*\n([\s\S]*?)\n```/);
  if (navMatch) {
    try {
      const navData = JSON.parse(navMatch[1]);
      navigate = navData.route;
      cleanText = cleanText.replace(navMatch[0], "").trim();
    } catch { /* ignore */ }
  }

  return { cleanText, profileUpdate, navigate };
}

const KarbaliChat = ({ onOnboardingComplete, mode = "fullscreen", proactiveTip }: KarbaliChatProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Initialize state directly from localStorage to prevent flash of empty messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Try to get userId from various sources to ensure we load history if available
    const userId = user?.id || profile?.id;
    if (userId) {
      return loadMessages(userId);
    }
    return [];
  });

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  // If we have messages, we aren't "initializing" in the sense of needing a greeting
  const [isInitializing, setIsInitializing] = useState(() => !messages.length);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(!!user?.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Initialize: Load history from localStorage if not already done via state initializer
  useEffect(() => {
    if (!user?.id || isHistoryLoaded) return;

    const saved = loadMessages(user.id);
    if (saved.length > 0) {
      setMessages(saved);
    }
    setIsHistoryLoaded(true);
  }, [user?.id, isHistoryLoaded]);

  // After history is loaded, check if we need an initial AI greeting
  useEffect(() => {
    if (!isHistoryLoaded || !user || !profile || initialized.current) return;

    // Only proceed if we haven't already handled initialization
    initialized.current = true;

    if (messages.length === 0 && profile?.email) {
      // Generate first message via AI
      const name = (profile.email || "").split("@")[0];
      const needsOnboarding = !profile.selected_goal || !profile.total_annual_spend || profile.total_annual_spend === 0;
      
      const systemGreeting = needsOnboarding
        ? `The user "${name}" just signed up. Greet them warmly and start the onboarding conversation. Ask about their weekly data spend first.`
        : `The user "${name}" is returning. Greet them and offer helpful suggestions based on their profile.`;

      setIsInitializing(false);
      // Send an initial prompt to get the AI's greeting
      sendToAI([{ role: "user", content: systemGreeting }], true);
    } else {
      setIsInitializing(false);
    }
  }, [isHistoryLoaded, user, profile, messages.length]);

  // Persistence: Save to localStorage whenever messages change
  useEffect(() => {
    // Determine the userId to save under
    const userId = user?.id || profile?.id;
    // Only save if history was actually loaded and we have a user and we actually have messages to save
    // We also check for messages.length > 0 to avoid wiping history with an empty array during transient states
    if (isHistoryLoaded && userId && messages.length > 0) {
      saveMessages(userId, messages);
    }
  }, [messages, isHistoryLoaded, user?.id, profile?.id]);

  // Handle proactive tips
  useEffect(() => {
    if (proactiveTip && user && isHistoryLoaded && !isInitializing) {
      setMessages(prev => {
        // Don't add duplicate tips
        if (prev.some(m => m.content === proactiveTip)) return prev;

        const tipMsg: ChatMessage = {
          id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          role: "assistant",
          content: proactiveTip,
          timestamp: Date.now(),
        };

        return [...prev, tipMsg];
      });
    }
  }, [proactiveTip, user, isHistoryLoaded, isInitializing]);

  useEffect(scrollToBottom, [messages, isStreaming, scrollToBottom]);

  const sendToAI = async (chatHistory: { role: string; content: string }[], isSystemGreeting = false) => {
    if (!user || !profile) return;

    setIsStreaming(true);
    const abortController = new AbortController();
    abortRef.current = abortController;

    let assistantSoFar = "";
    const msgId = `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id === msgId) {
          return prev.map(m => m.id === msgId ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { id: msgId, role: "assistant" as const, content: assistantSoFar, timestamp: Date.now() }];
      });
    };

    try {
      await streamChat({
        messages: isSystemGreeting ? chatHistory : chatHistory,
        profile: {
          email: profile.email,
          queue_position: profile.queue_position,
          points_balance: profile.points_balance,
          total_annual_spend: profile.total_annual_spend,
          selected_goal: profile.selected_goal,
          referral_code: profile.referral_code,
          annual_data_spend: profile.annual_data_spend,
          annual_electricity_spend: profile.annual_electricity_spend,
          annual_food_spend: profile.annual_food_spend,
          annual_transport_spend: profile.annual_transport_spend,
          off_queue_at: profile.off_queue_at,
        },
        onDelta: upsertAssistant,
        onDone: async (fullText) => {
          const { cleanText, profileUpdate, navigate: navRoute } = parseActions(fullText);
          const userId = user.id;

          // Update message with cleaned text (remove action blocks)
          if (cleanText !== fullText) {
            setMessages(prev => {
              const updated = prev.map(m => m.id === msgId ? { ...m, content: cleanText } : m);
              saveMessages(userId, updated);
              return updated;
            });
          } else {
            setMessages(prev => {
              saveMessages(userId, prev);
              return prev;
            });
          }

          // Apply profile updates
          if (profileUpdate) {
            await supabase
              .from("profiles")
              .update(profileUpdate)
              .eq("id", user.id);
            await refreshProfile();
            
            // Check if onboarding completed
            if (profileUpdate.selected_goal && profileUpdate.total_annual_spend) {
              setTimeout(() => onOnboardingComplete?.(), 2000);
            }
          }

          // Handle navigation
          if (navRoute) {
            setTimeout(() => navigate(`/dashboard/${navRoute === "home" ? "" : navRoute}`), 1500);
          }

          setIsStreaming(false);
        },
        signal: abortController.signal,
      });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Chat error:", err);
      toast({
        title: "Connection issue",
        description: err.message || "Could not reach the assistant. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || !user || !profile || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    // Build chat history for AI (last 20 messages for context)
    const history = updatedMessages.slice(-20).map(m => ({
      role: m.role,
      content: m.content,
    }));

    await sendToAI(history);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isInitializing) return null;

  return (
    <div
      className={`flex flex-col ${
        mode === "fullscreen" ? "h-[calc(100vh-3.5rem)]" : "h-full"
      } bg-background`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">Karbali Assistant</h2>
          <p className="text-[11px] text-muted-foreground">
            {isStreaming ? "typing..." : "Online"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-muted rounded-full px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            disabled={isStreaming}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default KarbaliChat;
