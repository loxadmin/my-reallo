import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Bot, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChatMessage,
  ConversationData,
  ConversationState,
  getConversationState,
  getWelcomeMessages,
  getDashboardSuggestions,
  processMessage,
  loadMessages,
  saveMessages,
} from "@/lib/karbaliEngine";

interface KarbaliChatProps {
  onOnboardingComplete?: () => void;
  mode?: "fullscreen" | "embedded";
}

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-end gap-2 mb-4"
  >
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <Bot className="w-4 h-4 text-primary" />
    </div>
    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/40"
            animate={{ y: [0, -6, 0] }}
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
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex items-end gap-2 mb-3 ${isAssistant ? "" : "flex-row-reverse"}`}
    >
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
          isAssistant
            ? "bg-muted text-foreground rounded-bl-md"
            : "bg-primary text-primary-foreground rounded-br-md"
        }`}
      >
        {message.content.split("\n").map((line, i) => (
          <span key={i}>
            {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
            {i < message.content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

const QuickReply = ({ text, onClick }: { text: string; onClick: () => void }) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-[13px] font-medium hover:bg-primary/10 transition-colors whitespace-nowrap"
  >
    {text}
  </motion.button>
);

const KarbaliChat = ({ onOnboardingComplete, mode = "fullscreen" }: KarbaliChatProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationData, setConversationData] = useState<ConversationData>({});
  const [currentState, setCurrentState] = useState<ConversationState>("WELCOME");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Initialize conversation
  useEffect(() => {
    if (!user || !profile || initialized.current) return;
    initialized.current = true;

    const state = getConversationState(profile);
    setCurrentState(state);

    // Load existing messages
    const saved = loadMessages(user.id);

    if (state === "DASHBOARD" && saved.length === 0) {
      // User already completed onboarding, show suggestions
      const suggestions = getDashboardSuggestions(profile);
      setMessages(suggestions);
      saveMessages(user.id, suggestions);
    } else if (saved.length > 0) {
      setMessages(saved);
      // Restore quick replies from last assistant message
      const lastAssistant = [...saved].reverse().find((m) => m.role === "assistant");
      if (lastAssistant?.quickReplies) setQuickReplies(lastAssistant.quickReplies);
    } else {
      // New user — show welcome messages with typing effect
      const welcomeMsgs = getWelcomeMessages(profile.email);
      setIsTyping(true);

      let delay = 0;
      welcomeMsgs.forEach((msg, i) => {
        delay += i === 0 ? 500 : 1200;
        setTimeout(() => {
          setMessages((prev) => {
            const updated = [...prev, msg];
            saveMessages(user!.id, updated);
            return updated;
          });
          if (i === welcomeMsgs.length - 1) setIsTyping(false);
        }, delay);
      });
    }
  }, [user, profile]);

  useEffect(scrollToBottom, [messages, isTyping, scrollToBottom]);

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || !user || !profile || isTyping) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setQuickReplies([]);
    setIsTyping(true);

    // Process after short delay for natural feel
    setTimeout(async () => {
      const result = processMessage(currentState, messageText, conversationData, profile);

      // Apply profile updates
      if (result.profileUpdate && user) {
        await supabase
          .from("profiles")
          .update(result.profileUpdate)
          .eq("id", user.id);
        await refreshProfile();
      }

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.response,
        quickReplies: result.quickReplies,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const updated = [...prev, assistantMsg];
        saveMessages(user.id, updated);
        return updated;
      });

      setCurrentState(result.nextState);
      setQuickReplies(result.quickReplies || []);
      setIsTyping(false);

      // Notify parent when onboarding completes
      if (result.nextState === "ONBOARDING_COMPLETE" || result.nextState === "DASHBOARD") {
        setTimeout(() => {
          onOnboardingComplete?.();
        }, 2000);
      }
    }, 800 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex flex-col ${
        mode === "fullscreen" ? "h-[calc(100vh-3.5rem)]" : "h-full"
      } bg-background`}
    >
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-foreground">Karbali Assistant</h2>
          <p className="text-[12px] text-muted-foreground">
            {isTyping ? "typing..." : "Online"}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      <AnimatePresence>
        {quickReplies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide"
          >
            {quickReplies.map((text) => (
              <QuickReply key={text} text={text} onClick={() => handleSend(text)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-muted rounded-full px-5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              disabled={isTyping}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
          <button
            className="w-11 h-11 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-all shrink-0"
            title="Voice input (coming soon)"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default KarbaliChat;
