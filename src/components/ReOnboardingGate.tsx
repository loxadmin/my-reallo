import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const REQUIRED_VERSION = 2;

type Msg = { role: "user" | "assistant"; content: string; options?: string[]; multiSelect?: boolean };

export default function ReOnboardingGate() {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const bottom = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profile) return;
    const version = (profile as any).onboarding_version ?? 0;
    if (version < REQUIRED_VERSION) setOpen(true);
  }, [profile]);

  useEffect(() => {
    if (!open || messages.length) return;
    setMessages([{ role: "assistant", content: "What's that one thing you truly wish you could achieve or have in your life right now?" }]);
  }, [open, messages.length]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendText = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setPicked([]);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-onboard", {
        body: { messages: [...messages, userMsg] },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const reply = (data as any)?.reply ?? "Thanks!";
      const options = Array.isArray((data as any)?.options) ? (data as any).options as string[] : [];
      const multiSelect = !!(data as any)?.multi_select;
      const done = !!(data as any)?.done;
      setMessages(m => [...m, { role: "assistant", content: reply, options, multiSelect }]);
      if (done) {
        await refreshProfile?.();
        toast({ title: "Onboarding complete", description: "You're all set." });
        setTimeout(() => setOpen(false), 800);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const send = () => sendText(input);

  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
  const currentOptions = lastAssistant?.options ?? [];
  const currentMulti = !!lastAssistant?.multiSelect;

  const togglePick = (opt: string) => {
    if (currentMulti) {
      setPicked(p => p.includes(opt) ? p.filter(x => x !== opt) : [...p, opt]);
    } else {
      void sendText(opt);
    }
  };

  if (!user || !open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md h-[92vh] sm:h-[80vh] bg-card border rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <div className="text-sm font-semibold">Quick setup</div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground" aria-label="Minimize">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`text-sm max-w-[85%] rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {currentOptions.length > 0 && !sending && (
            <div className="flex flex-wrap gap-2 pt-1">
              {currentOptions.map(opt => {
                const active = picked.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => togglePick(opt)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
                  >
                    {opt}
                  </button>
                );
              })}
              {currentMulti && picked.length > 0 && (
                <button
                  onClick={() => void sendText(picked.join(", "))}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground"
                >
                  Confirm ({picked.length})
                </button>
              )}
            </div>
          )}
          {sending && <div className="text-xs text-muted-foreground">Karbali is typing…</div>}
          <div ref={bottom} />
        </div>
        <div className="p-3 border-t flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void send(); }}
            placeholder={currentOptions.length ? "Or type your own…" : "Type your answer…"}
            className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
            style={{ fontSize: 16 }}
          />
          <button onClick={() => void send()} disabled={sending || !input.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">Send</button>
        </div>
      </div>
    </div>
  );
}