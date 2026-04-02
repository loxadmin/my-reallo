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

const CHAT_KEY = "karbali_chat_v2";

function loadMessages(userId: string): ChatMessage[] {
  try {
    const stored = localStorage.getItem(`${CHAT_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMessages(userId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`${CHAT_KEY}_${userId}`, JSON.stringify(messages.slice(-100)));
  } catch {
    localStorage.removeItem(`${CHAT_KEY}_${userId}`);
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/karbali-chat`;

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
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Initialize
  useEffect(() => {
    if (!user || !profile || initialized.current) return;
    initialized.current = true;

    const saved = loadMessages(user.id);
    if (saved.length > 0) {
      setMessages(saved);
      setIsInitializing(false);
    } else {
      // Generate first message via AI
      const name = profile.email.split("@")[0];
      const needsOnboarding = !profile.selected_goal || !profile.total_annual_spend || profile.total_annual_spend === 0;
      
      const systemGreeting = needsOnboarding
        ? `The user "${name}" just signed up. Greet them warmly and start the onboarding conversation. Ask about their weekly data spend first.`
        : `The user "${name}" is returning. Greet them and offer helpful suggestions based on their profile.`;

      setIsInitializing(false);
      // Send an initial prompt to get the AI's greeting
      sendToAI([{ role: "user", content: systemGreeting }], true);
    }
  }, [user, profile]);

  // Handle proactive tips
  useEffect(() => {
    if (proactiveTip && user && initialized.current && messages.length > 0) {
      const tipMsg: ChatMessage = {
        id: `tip-${Date.now()}`,
        role: "assistant",
        content: proactiveTip,
        timestamp: Date.now(),
      };
      setMessages(prev => {
        // Don't add duplicate tips
        if (prev.some(m => m.content === proactiveTip)) return prev;
        const updated = [...prev, tipMsg];
        saveMessages(user.id, updated);
        return updated;
      });
    }
  }, [proactiveTip]);

  useEffect(scrollToBottom, [messages, isStreaming, scrollToBottom]);

  const sendToAI = async (chatHistory: { role: string; content: string }[], isSystemGreeting = false) => {
    if (!user || !profile) return;

    setIsStreaming(true);
    const abortController = new AbortController();
    abortRef.current = abortController;

    let assistantSoFar = "";
    const msgId = `assistant-${Date.now()}`;

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

          // Update message with cleaned text (remove action blocks)
          if (cleanText !== fullText) {
            setMessages(prev => {
              const updated = prev.map(m => m.id === msgId ? { ...m, content: cleanText } : m);
              saveMessages(user.id, updated);
              return updated;
            });
          } else {
            setMessages(prev => {
              saveMessages(user.id, prev);
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
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveMessages(user.id, updatedMessages);
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
