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

describe("Security Traps Enhanced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";
  });

  it("detectMaliciousPatterns identifies SQL injection", () => {
    expect(detectMaliciousPatterns("' OR 1=1 --")).toBe(true);
    expect(detectMaliciousPatterns("DROP TABLE users")).toBe(true);
    expect(detectMaliciousPatterns("normal_user@gmail.com")).toBe(false);
    // Lone single quote should be allowed to avoid false positives
    expect(detectMaliciousPatterns("O'Reilly")).toBe(false);
  });

  it("detectMaliciousPatterns identifies XSS", () => {
    expect(detectMaliciousPatterns("<script>alert(1)</script>")).toBe(true);
    expect(detectMaliciousPatterns("<img src=x onerror=alert(1)>")).toBe(true);
    expect(detectMaliciousPatterns("Safe string with symbols!@#")).toBe(false);
  });

  it("triggerTrap calls edge function and redirects for high severity", async () => {
    await triggerTrap("honeypot_triggered", { test: "data" }, "high", true);

    expect(supabase.functions.invoke).toHaveBeenCalledWith("report-incident", expect.any(Object));
    expect(window.location.href).toBe(REDIRECT_URL);
  });

  it("checkBlacklist redirects if blacklisted via RPC", async () => {
    (supabase.rpc as any).mockResolvedValue({ data: true, error: null });

    const result = await checkBlacklist();

    expect(result).toBe(true);
    expect(window.location.href).toBe(REDIRECT_URL);
  });
});
