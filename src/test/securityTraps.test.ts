import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerTrap, checkBlacklist, detectMaliciousPatterns, REDIRECT_URL } from "../lib/securityTraps";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { success: true }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gt: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: false, error: null })),
  },
}));

// Mock window.location
const originalLocation = window.location;
delete (window as any).location;
window.location = { ...originalLocation, href: "", history: { pushState: vi.fn() } } as any;

describe("Security Traps Relaxed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";
  });

  it("detectMaliciousPatterns identifies aggressive SQL injection but allows lone quotes", () => {
    // Definitive patterns should still be caught
    expect(detectMaliciousPatterns("' OR '1'='1")).toBe(true);
    // Lone quotes or names with quotes should be allowed
    expect(detectMaliciousPatterns("O'Connor")).toBe(false);
    expect(detectMaliciousPatterns("normal_user@gmail.com")).toBe(false);
  });

  it("detectMaliciousPatterns identifies XSS", () => {
    expect(detectMaliciousPatterns("<script>alert(1)</script>")).toBe(true);
    expect(detectMaliciousPatterns("<img src=x onerror=alert(1)>")).toBe(true);
    expect(detectMaliciousPatterns("Safe string with symbols!@#")).toBe(false);
  });

  it("triggerTrap calls edge function but DOES NOT redirect anymore", async () => {
    await triggerTrap("honeypot_triggered", { test: "data" }, "high", true);

    expect(supabase.functions.invoke).toHaveBeenCalledWith("report-incident", expect.any(Object));
    // Redirect should NOT happen now
    expect(window.location.href).not.toBe(REDIRECT_URL);
  });

  it("checkBlacklist returns true but DOES NOT redirect if blacklisted", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });

    const result = await checkBlacklist();

    expect(result).toBe(true);
    // Redirect should NOT happen now
    expect(window.location.href).not.toBe(REDIRECT_URL);
  });
});
