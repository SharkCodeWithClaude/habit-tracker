const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const AUTH_EVENTS = new EventTarget();

interface AuthFetchOptions {
  method?: string;
  body?: unknown;
  onTokenRefreshed?: (newToken: string) => void;
}

export function getStoredToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("access_token");
}

function saveStoredToken(token: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("access_token", token);
  }
}

export async function authFetch(
  path: string,
  token: string | null,
  options?: AuthFetchOptions
): Promise<Response> {
  const method = options?.method ?? "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOpts: RequestInit = { method, headers };
  if (options?.body !== undefined) {
    fetchOpts.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, fetchOpts);

  if (res.status === 401 && token) {
    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!refreshRes.ok) {
      AUTH_EVENTS.dispatchEvent(new Event("unauthorized"));
      return res;
    }

    const data = await refreshRes.json();
    const newToken = data.accessToken;
    saveStoredToken(newToken);
    options?.onTokenRefreshed?.(newToken);

    const retryOpts: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
      },
    };
    if (options?.body !== undefined) {
      retryOpts.body = JSON.stringify(options.body);
    }

    return fetch(`${API_BASE}${path}`, retryOpts);
  }

  return res;
}
