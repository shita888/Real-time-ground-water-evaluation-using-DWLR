// frontend/src/services/api.ts
export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const customUrl = (import.meta.env as any)?.VITE_API_BASE_URL;
    if (customUrl) {
      return customUrl;
    }
    // When served via HTTP/HTTPS in the browser (e.g. Vite dev on any port or web server),
    // relative paths ("") route through the Vite proxy, completely avoiding CORS,
    // Private Network Access (PNA), and hostname mismatch "Failed to fetch" errors.
    if (window.location.protocol.startsWith("http")) {
      return "";
    }
    const hostname = window.location.hostname || "127.0.0.1";
    return `http://${hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
};

export const API_BASE_URL = getApiBaseUrl();

export async function getForecast(stationId: string, n_future: number = 7) {
  try {
    const res = await fetch(`${API_BASE_URL}/forecast/${encodeURIComponent(stationId)}?n_future=${n_future}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      let detailMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.detail) {
          detailMsg = errorJson.detail;
        }
      } catch (_) {
        // Fallback to HTTP status text
      }
      throw new Error(detailMsg);
    }

    return await res.json();
  } catch (err: any) {
    console.error("Error fetching forecast:", err);
    if (err.message === "Failed to fetch") {
      throw new Error("Unable to connect to backend (Failed to fetch). Please ensure FastAPI server is running on port 8000.");
    }
    throw err;
  }
}

export async function getHistory(stationId: string, days: number = 7) {
  try {
    const res = await fetch(`${API_BASE_URL}/history/${encodeURIComponent(stationId)}?days=${days}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      let detailMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.detail) detailMsg = errorJson.detail;
      } catch (_) {}
      throw new Error(detailMsg);
    }

    return await res.json();
  } catch (err: any) {
    console.error("Error fetching history:", err);
    if (err.message === "Failed to fetch") {
      throw new Error("Unable to connect to backend (Failed to fetch). Please ensure FastAPI server is running on port 8000.");
    }
    throw err;
  }
}

export async function getStations() {
  try {
    const res = await fetch(`${API_BASE_URL}/stations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching stations:", err);
    throw err;
  }
}

export async function getRecentStations(limit: number = 8) {
  try {
    const res = await fetch(`${API_BASE_URL}/stations/recent?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching recent stations:", err);
    throw err;
  }
}

export async function getStatistics() {
  try {
    const res = await fetch(`${API_BASE_URL}/statistics`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching statistics:", err);
    throw err;
  }
}

export async function getLatest(stationId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/latest/${encodeURIComponent(stationId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching latest station reading:", err);
    throw err;
  }
}

export async function getNearbyStations(lat?: number, lon?: number, limit: number = 3) {
  try {
    const params = new URLSearchParams();
    if (lat !== undefined && lat !== null) params.append("lat", lat.toString());
    if (lon !== undefined && lon !== null) params.append("lon", lon.toString());
    params.append("limit", limit.toString());
    const res = await fetch(`${API_BASE_URL}/stations/nearby?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching nearby stations:", err);
    throw err;
  }
}

// ------------------ Authentication & Subscription ------------------

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  ok: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
}

export interface SubscribePayload {
  name: string;
  email?: string;
  phone?: string;
  preferredChannel: "sms" | "email" | "both";
}

export interface SubscribeResponse {
  ok: boolean;
  id?: number;
  message?: string;
  email_status?: string;
  sms_status?: string;
}

export async function loginUser(credentials: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(credentials),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Login failed (HTTP ${res.status})`);
  }
  return data;
}

export async function signupUser(userData: { name: string; email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(userData),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Signup failed (HTTP ${res.status})`);
  }
  return data;
}

export async function forgotPassword(email: string): Promise<{ ok: boolean; message: string; email_status?: string; reset_code?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed (HTTP ${res.status})`);
  }
  return data;
}

export async function resetPassword(payload: { email: string; token: string; new_password: string }): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Password reset failed (HTTP ${res.status})`);
  }
  return data;
}

export async function subscribeAlerts(payload: SubscribePayload): Promise<SubscribeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Subscription failed (HTTP ${res.status})`);
  }
  return data;
}

