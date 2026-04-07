import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser
} from "../lib/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStoredToken(token);
  }, [token]);

  useEffect(() => {
    setStoredUser(user);
  }, [user]);

  async function refreshMe(nextToken = token) {
    if (!nextToken) return;
    try {
      const res = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${nextToken}` }
      });
      setUser(res.data.user);
      setStoredUser(res.data.user);
    } catch {
      setToken("");
      setUser(null);
      setStoredToken("");
      setStoredUser(null);
    }
  }

  useEffect(() => {
    if (token && !user) refreshMe(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onExpired() {
      setToken("");
      setUser(null);
    }
    window.addEventListener("suniukai:auth-expired", onExpired);
    return () => window.removeEventListener("suniukai:auth-expired", onExpired);
  }, []);

  async function login(email, password) {
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setToken(res.data.token);
      setUser(res.data.user);
      return { ok: true };
    } catch (e) {
      const message = e?.response?.data?.message || "Nepavyko prisijungti";
      return { ok: false, message };
    } finally {
      setLoading(false);
    }
  }

  async function register(name, email, password) {
    setLoading(true);
    try {
      const res = await api.post("/api/auth/register", { name, email, password });
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setToken(res.data.token);
      setUser(res.data.user);
      return { ok: true };
    } catch (e) {
      const message = e?.response?.data?.message || "Nepavyko užsiregistruoti";
      return { ok: false, message };
    } finally {
      setLoading(false);
    }
  }

  async function requestResetCode(email) {
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password/request-code", { email });
      return { ok: true };
    } catch (e) {
      const message = e?.response?.data?.message || "Nepavyko issiusti kodo";
      return { ok: false, message };
    } finally {
      setLoading(false);
    }
  }

  async function confirmResetPassword(email, code, newPassword) {
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password/confirm", { email, code, newPassword });
      return { ok: true };
    } catch (e) {
      const message = e?.response?.data?.message || "Nepavyko pakeisti slaptazodzio";
      return { ok: false, message };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setStoredToken("");
    setStoredUser(null);
    setToken("");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthed: Boolean(token),
      isAdmin: user?.role === "admin",
      login,
      register,
      requestResetCode,
      confirmResetPassword,
      logout,
      refreshMe
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

