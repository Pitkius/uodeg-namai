import axios from "axios";
import { getStoredToken, setStoredToken, setStoredUser } from "./storage";

/** Base URL for resolving media in the browser (same host in production / Vite proxy). */
export function getApiBaseUrl() {
  const v = import.meta.env.VITE_API_URL;
  if (v != null && String(v).trim() !== "") {
    return String(v).replace(/\/api\/?$/, "");
  }
  return "";
}

export const api = axios.create({
  baseURL: (() => {
    const v = import.meta.env.VITE_API_URL;
    if (v != null && String(v).trim() !== "") return String(v);
    return "";
  })(),
  timeout: 15000,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const hadAuth =
      Boolean(err?.config?.headers?.Authorization) || err?.config?.withCredentials;
    if (err?.response?.status === 401 && hadAuth && !String(err?.config?.url || "").includes("/api/auth/login")) {
      setStoredToken("");
      setStoredUser(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("suniukai:auth-expired"));
      }
    }
    return Promise.reject(err);
  }
);

/** Map legacy /uploads/... paths to authenticated API file route. */
export function toProtectedUploadPath(url) {
  if (!url) return "";
  const s = String(url);
  if (s.includes("/api/uploads/file/")) return s.startsWith("http") ? s : s;
  const m = s.match(/\/uploads\/users\/([^/]+)\/([^/?#]+)/);
  if (m) return `/api/uploads/file/${m[1]}/${encodeURIComponent(m[2])}`;
  if (s.startsWith("/api/")) return s;
  return s;
}
