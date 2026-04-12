import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiJson } from "./api";

const STORAGE_KEY = "clinic_ai_auth_session";

export type AuthSession = {
  accessToken: string;
  userId: string;
  email: string;
  fullName: string;
  clinicId: string;
  clinicSlug: string;
};

type AuthResponse = {
  access_token: string;
  user_id: string;
  email: string;
  full_name: string;
  clinic_id: string;
  clinic_slug: string;
  requires_email_confirmation?: boolean;
  message?: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (input: {
    email: string;
    password: string;
    full_name: string;
    clinic_name: string;
  }) => Promise<AuthResponse>;
  logout: () => void;
  setSessionFromAuthResponse: (body: AuthResponse) => void;
  /** Merge into the persisted session (e.g. after profile update). Does not call the API. */
  patchSession: (patch: Partial<Pick<AuthSession, "fullName" | "email" | "clinicSlug">>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(body: AuthResponse): AuthSession {
  return {
    accessToken: body.access_token,
    userId: body.user_id,
    email: body.email,
    fullName: body.full_name,
    clinicId: body.clinic_id,
    clinicSlug: body.clinic_slug,
  };
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AuthSession;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);
  const [ready] = useState(true);

  const persist = useCallback((next: AuthSession | null) => {
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSession(next);
  }, []);

  const setSessionFromAuthResponse = useCallback(
    (body: AuthResponse) => {
      persist(toSession(body));
    },
    [persist],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const body = await apiJson<AuthResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        if (body.access_token) {
          persist(toSession(body));
        }
        return body;
      } catch (e) {
        if (e instanceof ApiError) {
          throw e;
        }
        throw new ApiError(e instanceof Error ? e.message : "Login failed", 0);
      }
    },
    [persist],
  );

  const register = useCallback(async (input: {
    email: string;
    password: string;
    full_name: string;
    clinic_name: string;
  }) => {
    try {
      const body = await apiJson<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (body.access_token) {
        persist(toSession(body));
      }
      return body;
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }
      throw new ApiError(e instanceof Error ? e.message : "Registration failed", 0);
    }
  }, [persist]);

  const logout = useCallback(() => {
    persist(null);
  }, [persist]);

  const patchSession = useCallback(
    (patch: Partial<Pick<AuthSession, "fullName" | "email" | "clinicSlug">>) => {
      setSession((prev) => {
        if (!prev) {
          return prev;
        }
        const next = { ...prev, ...patch };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      session,
      ready,
      login,
      register,
      logout,
      setSessionFromAuthResponse,
      patchSession,
    }),
    [session, ready, login, register, logout, setSessionFromAuthResponse, patchSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
