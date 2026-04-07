import axios from "axios";
import { getStoredToken, setStoredToken, setStoredUser } from "./storage";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
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

