"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AUTH_EVENTS } from "./auth-fetch";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function setTokenCookie(token: string) {
  document.cookie = `access_token=${token}; path=/; max-age=${15 * 60}; SameSite=Strict`;
}

function clearTokenCookie() {
  document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const saveToken = React.useCallback((t: string) => {
    setToken(t);
    localStorage.setItem("access_token", t);
    setTokenCookie(t);
  }, []);

  const clearAuth = React.useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("access_token");
    clearTokenCookie();
  }, []);

  const refreshToken = React.useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        clearAuth();
        return null;
      }
      const data = await res.json();
      saveToken(data.accessToken);
      return data.accessToken;
    } catch {
      clearAuth();
      return null;
    }
  }, [clearAuth, saveToken]);

  React.useEffect(() => {
    const stored = localStorage.getItem("access_token");
    if (stored) {
      setToken(stored);
      refreshToken().then((newToken) => {
        if (!newToken) {
          clearAuth();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [refreshToken, clearAuth]);

  React.useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth();
      router.push("/login");
    };
    AUTH_EVENTS.addEventListener("unauthorized", handleUnauthorized);
    return () => AUTH_EVENTS.removeEventListener("unauthorized", handleUnauthorized);
  }, [clearAuth, router]);

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
    saveToken(data.accessToken);
  }, [saveToken]);

  const register = React.useCallback(async (email: string, password: string, displayName?: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, displayName }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Registration failed");
    }
    const data = await res.json();
    setUser(data.user);
    saveToken(data.accessToken);
  }, [saveToken]);

  const logout = React.useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    clearAuth();
    router.push("/login");
  }, [clearAuth, router]);

  const value = React.useMemo(
    () => ({ user, token, loading, login, register, logout, refreshToken }),
    [user, token, loading, login, register, logout, refreshToken]
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
