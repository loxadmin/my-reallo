import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  updateLastActivity,
  isSessionExpiredByInactivity,
  clearActivityTimestamp,
} from "@/lib/security";
import { isAllowedEmailDomain } from "@/lib/emailValidation";
import { checkBlacklist } from "@/lib/securityTraps";

interface Profile {
  id: string;
  email: string;
  annual_data_spend: number | null;
  annual_electricity_spend: number | null;
  annual_food_spend: number | null;
  annual_transport_spend: number | null;
  total_annual_spend: number | null;
  selected_goal: string | null;
  target_amount: number | null;
  queue_position: number | null;
  referral_code: string | null;
  referred_by: string | null;
  last_active: string | null;
  created_at: string | null;
  points_balance: number;
  is_banned: boolean;
  ban_reason: string | null;
  off_queue_at: string | null;
  spend_verified: boolean | null;
  user_type: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, referralCode?: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = AUTH_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    promise
      .then((result) => { window.clearTimeout(timeout); resolve(result); })
      .catch((error) => { window.clearTimeout(timeout); reject(error); });
  });
}

interface ResolvedUserState {
  profile: Profile | null;
  isAdmin: boolean;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const signOutInFlightRef = useRef(false);

  // Aggressive blacklist check on mount
  useEffect(() => {
    const runCheck = async () => {
      const blacklisted = await checkBlacklist();
      if (blacklisted) {
        setIsBlacklisted(true);
      }
    };
    runCheck();
  }, []);

  const applyResolvedUserState = useCallback((resolved: ResolvedUserState) => {
    setProfile(resolved.profile);
    setIsAdmin(resolved.isAdmin);
    // Persist admin status for the console guard
    if (resolved.isAdmin) {
      localStorage.setItem('karbali-is-admin', 'true');
    } else {
      localStorage.removeItem('karbali-is-admin');
    }
  }, []);

  const resolveUserState = useCallback(async (userId: string): Promise<ResolvedUserState> => {
    // Convert PostgrestBuilder to proper Promise via .then()
    const profilePromise = new Promise<any>((resolve, reject) => {
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()
        .then(resolve, reject);
    });

    const adminPromise = new Promise<any>((resolve, reject) => {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle()
        .then(resolve, reject);
    });

    const [profileResult, adminResult] = await Promise.all([
      withTimeout(profilePromise, "profile lookup"),
      withTimeout(adminPromise, "admin role lookup"),
    ]);

    if (profileResult.error) {
      console.error("Profile lookup error:", profileResult.error);
    }
    if (adminResult.error) {
      console.error("Admin lookup error:", adminResult.error);
    }

    return {
      profile: (profileResult.data as Profile | null) ?? null,
      isAdmin: !!adminResult.data,
    };
  }, []);

  const performSignOut = useCallback(async () => {
    if (signOutInFlightRef.current) return;
    signOutInFlightRef.current = true;
    try {
      await withTimeout(supabase.auth.signOut(), "sign out");
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setProfileLoading(false);
      clearActivityTimestamp();
      setAuthReady(true);
      signOutInFlightRef.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const resolved = await resolveUserState(user.id);
      applyResolvedUserState(resolved);
    } catch (error) {
      console.error("Profile refresh error:", error);
    }
  }, [applyResolvedUserState, resolveUserState, user?.id]);

  // 48-hour inactivity auto-logout
  useEffect(() => {
    if (!authReady || !user) return;
    const checkInactivity = () => {
      if (isSessionExpiredByInactivity()) {
        void performSignOut();
      }
    };
    checkInactivity();
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        updateLastActivity();
        throttleTimer = null;
      }, 60_000);
    };
    activityEvents.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );
    const interval = setInterval(checkInactivity, 5 * 60_000);
    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity));
      clearInterval(interval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [authReady, user, performSignOut]);

  useEffect(() => {
    let isMounted = true;
    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
      if (nextSession?.user) {
        updateLastActivity();
      } else {
        clearActivityTimestamp();
        setProfile(null);
        setIsAdmin(false);
        setProfileLoading(false);
        localStorage.removeItem('karbali-is-admin');
      }
    });

    const initializeAuth = async () => {
      try {
        const { data: { session: restoredSession }, error } = await withTimeout(
          supabase.auth.getSession(), "session restore"
        );
        if (error) console.error("Auth session restore error:", error);
        if (restoredSession?.user && isSessionExpiredByInactivity()) {
          await performSignOut();
          return;
        }
        applySession(restoredSession);
        if (restoredSession?.user) updateLastActivity();
      } catch (error) {
        console.error("Auth initialization error:", error);
        applySession(null);
        setProfile(null);
        setIsAdmin(false);
      } finally {
        if (isMounted) setAuthReady(true);
      }
    };

    void initializeAuth();
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [performSignOut]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    const hydrateUserState = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setProfile(null);
          setIsAdmin(false);
          setProfileLoading(false);
        }
        return;
      }
      setProfileLoading(true);
      try {
        const resolved = await resolveUserState(user.id);
        if (cancelled) return;

        // Auto-block users with non-recognized email domains
        if (resolved.profile && !isAllowedEmailDomain(resolved.profile.email) && !resolved.isAdmin) {
          if (!resolved.profile.is_banned) {
            await supabase.from("profiles").update({
              is_banned: true,
              ban_reason: "Unrecognized email provider. Please use Gmail, Outlook, Yahoo, iCloud, or ProtonMail.",
            } as any).eq("id", user.id);
          }
          await performSignOut();
          return;
        }

        // Auto-block banned users
        if (resolved.profile?.is_banned && !resolved.isAdmin) {
          await performSignOut();
          return;
        }

        applyResolvedUserState(resolved);
      } catch (error) {
        console.error("User state hydration error:", error);
        if (!cancelled) { setProfile(null); setIsAdmin(false); }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };
    void hydrateUserState();
    return () => { cancelled = true; };
  }, [authReady, user?.id, resolveUserState, applyResolvedUserState]);

  const signUp = async (email: string, password: string, referralCode?: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: referralCode ? { referral_code: referralCode.toUpperCase() } : {},
          },
        }),
        "sign up"
      );
      return { data, error };
    } catch (error) { return { data: null, error }; }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        "sign in"
      );
      if (!error) updateLastActivity();
      return { error };
    } catch (error) { return { error }; }
  };

  const signOut = useCallback(async () => {
    await performSignOut();
  }, [performSignOut]);

  const loading = !authReady || profileLoading || isBlacklisted;

  const value = useMemo(
    () => ({ user, session, profile, isAdmin, loading, signUp, signIn, signOut, refreshProfile }),
    [user, session, profile, isAdmin, loading, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
