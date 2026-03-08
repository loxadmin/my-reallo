import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  updateLastActivity,
  isSessionExpiredByInactivity,
  clearActivityTimestamp,
} from "@/lib/security";

interface Profile {
  id: string;
  email: string;
  annual_data_spend: number;
  annual_electricity_spend: number;
  annual_food_spend: number;
  annual_transport_spend: number;
  total_annual_spend: number;
  selected_goal: string | null;
  target_amount: number;
  queue_position: number;
  referral_code: string | null;
  referred_by: string | null;
  last_active: string;
  created_at: string;
  points_balance: number;
  is_banned: boolean;
  ban_reason: string | null;
  off_queue_at: string | null;
  spend_verified: boolean | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data as Profile | null);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const performSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    clearActivityTimestamp();
  }, []);

  // ─── 48-hour inactivity auto-logout ───
  useEffect(() => {
    if (!user) return;

    const checkInactivity = () => {
      if (isSessionExpiredByInactivity()) {
        performSignOut();
      }
    };

    // Check on mount
    checkInactivity();

    // Update activity on user interactions
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        updateLastActivity();
        throttleTimer = null;
      }, 60_000); // Throttle to once per minute
    };

    activityEvents.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    // Periodic inactivity check every 5 minutes
    const interval = setInterval(checkInactivity, 5 * 60_000);

    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      clearInterval(interval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, performSignOut]);

  useEffect(() => {
    let initialSessionHandled = false;

    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          updateLastActivity();
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            await checkAdmin(session.user.id);
            if (initialSessionHandled) {
              // Only set loading false here for subsequent auth changes (sign in/out)
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          if (initialSessionHandled) {
            setLoading(false);
          }
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Check inactivity before restoring session
      if (session?.user && isSessionExpiredByInactivity()) {
        supabase.auth.signOut();
        clearActivityTimestamp();
        initialSessionHandled = true;
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        updateLastActivity();
        await fetchProfile(session.user.id);
        await checkAdmin(session.user.id);
      }
      initialSessionHandled = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, referralCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: referralCode ? { referral_code: referralCode.toUpperCase() } : {},
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      updateLastActivity();
    }
    return { error };
  };

  const signOut = async () => {
    await performSignOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isAdmin, loading, signUp, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
