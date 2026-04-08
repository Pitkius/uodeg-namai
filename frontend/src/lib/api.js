import axios from "axios";
import { getStoredToken, setStoredToken, setStoredUser } from "./storage";

/** Base URL for resolving /uploads/... in the browser (same host in production). */
export function getApiBaseUrl() {
  const v = import.meta.env.VITE_API_URL;
  if (v != null && String(v).trim() !== "") {
    return String(v).replace(/\/api\/?$/, "");
  }
  if (import.meta.env.DEV) return "http://localhost:4000";
  return "";
}

export const api = axios.create({
  baseURL: (() => {
    const v = import.meta.env.VITE_API_URL;
    if (v != null && String(v).trim() !== "") return String(v);
    if (import.meta.env.DEV) return "http://localhost:4000";
    return "";
  })(),
  timeout: 15000
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
    const hadAuth = Boolean(err?.config?.headers?.Authorization);
    if (err?.response?.status === 401 && hadAuth) {
      setStoredToken("");
      setStoredUser(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("suniukai:auth-expired"));
      }
    }
    return Promise.reject(err);
  }
);
