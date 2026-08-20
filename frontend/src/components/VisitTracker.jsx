import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { getVisitorId } from "../lib/visitorId";

/** Sends anonymized page-view pings (skips /admin on the server). */
export function VisitTracker() {
  const location = useLocation();
  const lastSent = useRef("");

  useEffect(() => {
    const path = `${location.pathname || "/"}${location.search || ""}`.slice(0, 200);
    const key = path;
    if (lastSent.current === key) return;
    lastSent.current = key;

    const visitorId = getVisitorId();
    api.post("/api/analytics/visit", { path, visitorId }).catch(() => {
      // analytics must never break UX
    });
  }, [location.pathname, location.search]);

  return null;
}
