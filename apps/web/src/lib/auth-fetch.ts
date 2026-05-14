const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const AUTH_EVENTS = new EventTarget();

interface AuthFetchOptions {
  onTokenRefreshed?: (newToken: string) => void;
}

export async function authFetch(
  path: string,
  token: string | null,
  options?: AuthFetchOptions
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { headers });

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
    options?.onTokenRefreshed?.(newToken);

    return fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
      },
    });
  }

  return res;
}
