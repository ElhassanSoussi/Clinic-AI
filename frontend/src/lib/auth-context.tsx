"use client";

import {
  createContext,
  useEffect,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthResponse } from "@/types";
import { createClient } from "@/utils/supabase/client";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthResponse | null;
  setAuthenticatedUser: (data: AuthResponse) => void;
  login: (data: AuthResponse) => void;
  loginWithOnboarding: (data: AuthResponse) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  setAuthenticatedUser: () => {},
  login: () => {},
  loginWithOnboarding: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (globalThis.window !== undefined) {
      const stored = localStorage.getItem("auth_user");
      const token = localStorage.getItem("access_token");

      if (stored && token) {
        try {
          const parsed = JSON.parse(stored) as AuthResponse;
          if (token.trim() && parsed.access_token.trim()) {
            globalThis.queueMicrotask(() => setUser(parsed));
          } else {
            localStorage.removeItem("auth_user");
            localStorage.removeItem("access_token");
          }
        } catch {
          localStorage.removeItem("auth_user");
          localStorage.removeItem("access_token");
        }
      }
    }

    globalThis.queueMicrotask(() => setIsLoading(false));
  }, []);

  const setAuthenticatedUser = useCallback((data: AuthResponse) => {
    if (!data.access_token.trim()) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_user");
      setUser(null);
      return;
    }
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("auth_user", JSON.stringify(data));
    setUser(data);
  }, []);

  const login = useCallback((data: AuthResponse) => {
    setAuthenticatedUser(data);
    router.push("/dashboard");
  }, [router, setAuthenticatedUser]);

  const loginWithOnboarding = useCallback((data: AuthResponse) => {
    setAuthenticatedUser(data);
    router.push("/dashboard");
  }, [router, setAuthenticatedUser]);

  const logout = useCallback(async () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* ignore sign-out errors */ }
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      isAuthenticated: !!user,
      isLoading,
      user,
      setAuthenticatedUser,
      login,
      loginWithOnboarding,
      logout,
    }),
    [user, isLoading, setAuthenticatedUser, login, loginWithOnboarding, logout]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
