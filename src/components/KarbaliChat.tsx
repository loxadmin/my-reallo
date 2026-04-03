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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase configuration missing");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authToken = session?.access_token || publishableKey;

  const chatUrl = `${supabaseUrl}/functions/v1/karbali-chat`;

  const resp = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
      "apikey": publishableKey,
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
  const [isChatReady, setIsChatReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedUserIdRef = useRef<string | null>(null);
  const bootstrapStartedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setMessages([]);
      setIsChatReady(false);
      initializedUserIdRef.current = null;
      bootstrapStartedRef.current = false;
      return;
    }

    if (initializedUserIdRef.current === user.id) return;

    const savedMessages = loadMessages(user.id);
    setMessages(savedMessages);
    setIsChatReady(true);
    initializedUserIdRef.current = user.id;
    bootstrapStartedRef.current = savedMessages.length > 0;
  }, [user?.id]);

  useEffect(() => {
    if (!isChatReady || !user || !profile || bootstrapStartedRef.current) return;

    if (messages.length > 0) {
      bootstrapStartedRef.current = true;
      return;
    }

    bootstrapStartedRef.current = true;

    const name = (profile.email || "").split("@")[0];
    const needsOnboarding = !profile.selected_goal || !profile.total_annual_spend || profile.total_annual_spend === 0;
    const openingInstruction = needsOnboarding
      ? `Start a warm, natural onboarding conversation with ${name}. Greet them briefly, then ask about their weekly data spend first.`
      : `Greet ${name} warmly as a returning user, mention one relevant helpful insight from their profile, and ask what they want to do next.`;

    void sendToAI([{ role: "user", content: openingInstruction }], true);
  }, [isChatReady, user, profile, messages.length]);

  // Persistence: Save to localStorage whenever messages change
  useEffect(() => {
    if (isChatReady && user?.id) {
      saveMessages(user.id, messages);
    }
  }, [messages, isChatReady, user?.id]);

  // Handle proactive tips
  useEffect(() => {
    if (proactiveTip && user && isChatReady) {
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
  }, [proactiveTip, user, isChatReady]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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
          const finalText = cleanText.trim() || (navRoute ? "Taking you there now…" : "Got it — I’ve saved that.");
          const userId = user.id;

          // Update message with cleaned text (remove action blocks)
          if (finalText !== fullText) {
            setMessages(prev => {
              const updated = prev.map(m => m.id === msgId ? { ...m, content: finalText } : m);
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
            const { error: profileError } = await supabase
              .from("profiles")
              .update(profileUpdate)
              .eq("id", user.id);
            if (profileError) {
              console.error("Profile update error:", profileError);
              toast({
                title: "Update issue",
                description: "I couldn’t save that change yet. Please try again.",
                variant: "destructive",
              });
            } else {
              await refreshProfile();
            }
            
            // Check if onboarding completed
            const completedOnboarding = Boolean(
              (profileUpdate.selected_goal ?? profile.selected_goal) &&
              (profileUpdate.total_annual_spend ?? profile.total_annual_spend)
            );

            if (completedOnboarding) {
              setTimeout(() => onOnboardingComplete?.(), 1200);
            }
          }

          // Handle navigation
          if (navRoute) {
            const targetPath = navRoute === "home" ? "/dashboard" : `/dashboard/${navRoute}`;
            setTimeout(() => navigate(targetPath), 1200);
          }

          abortRef.current = null;
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
      abortRef.current = null;
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
    saveMessages(user.id, updatedMessages);
    setInput("");

    // Build chat history for AI with enough context for real conversation continuity
    const history = updatedMessages.slice(-100).map(m => ({
      role: m.role,
      content: m.content,
    }));

    void sendToAI(history);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`relative z-10 flex flex-col ${
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
        {!isChatReady ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
            Loading your conversation…
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
            <AnimatePresence>
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
            </AnimatePresence>
          </>
        )}
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
            disabled={!isChatReady || isStreaming}
          />
          <button
            onClick={() => handleSend()}
            disabled={!isChatReady || !input.trim() || isStreaming}
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
