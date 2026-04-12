import { describe, it, expect, vi, beforeEach } from "vitest";
import { identifyUser, trackDownload, trackSignup, trackPurchase } from "../lib/tracker";

describe("tracker.ts", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      Karbali: {
        identify: vi.fn(),
        trackDownload: vi.fn(),
        trackSignup: vi.fn(),
        trackPurchase: vi.fn(),
      },
    });
  });

  it("should call window.Karbali.identify with userId", () => {
    const userId = "test-user-id";
    identifyUser(userId);
    expect(window.Karbali?.identify).toHaveBeenCalledWith(userId);
  });

  it("should call window.Karbali.trackDownload with userId", () => {
    const userId = "test-user-id";
    trackDownload(userId);
    expect(window.Karbali?.trackDownload).toHaveBeenCalledWith(userId);
  });

  it("should call window.Karbali.trackDownload without userId", () => {
    trackDownload();
    expect(window.Karbali?.trackDownload).toHaveBeenCalledWith(undefined);
  });

  it("should call window.Karbali.trackSignup with userId", () => {
    const userId = "test-user-id";
    trackSignup(userId);
    expect(window.Karbali?.trackSignup).toHaveBeenCalledWith(userId);
  });

  it("should call window.Karbali.trackPurchase with userId and amount", () => {
    const userId = "test-user-id";
    const amount = 99.99;
    trackPurchase(userId, amount);
    expect(window.Karbali?.trackPurchase).toHaveBeenCalledWith({
      user_id: userId,
      amount: amount,
    });
  });
});
