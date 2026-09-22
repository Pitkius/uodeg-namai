import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

function formatTime(value) {
  try {
    return new Date(value).toLocaleString("lt-LT", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

export function AdminChatPanel({ onError, onSuccess }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(() => searchParams.get("chat") || "");
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  async function loadThreads() {
    const res = await api.get("/api/chat/admin/threads", { params: { status: "open" } });
    setThreads(res.data.threads || []);
  }

  async function openThread(id) {
    if (!id) return;
    setSelectedId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("chat", id);
      return next;
    });
    const res = await api.get(`/api/chat/admin/threads/${id}`);
    setThread(res.data.thread);
    setMessages(res.data.messages || []);
    await loadThreads();
  }

  useEffect(() => {
    loadThreads().catch((e) => onError?.(e?.response?.data?.message || "Nepavyko užkrauti pokalbių"));
    const fromUrl = searchParams.get("chat");
    if (fromUrl) {
      openThread(fromUrl).catch((e) => onError?.(e?.response?.data?.message || "Nepavyko atidaryti pokalbio"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function claim() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await api.post(`/api/chat/admin/threads/${selectedId}/claim`);
      setThread(res.data.thread);
      onSuccess?.("Pokalbis priskirtas jums — lankytojas matys jūsų vardą");
      await loadThreads();
    } catch (e) {
      onError?.(e?.response?.data?.message || "Nepavyko prisiskirti");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setBusy(true);
    try {
      const res = await api.post(`/api/chat/admin/threads/${selectedId}/messages`, {
        message: draft.trim()
      });
      setMessages((prev) => [...prev, res.data.message]);
      setThread(res.data.thread);
      setDraft("");
      onSuccess?.("Atsakymas išsiųstas");
      await loadThreads();
    } catch (err) {
      onError?.(err?.response?.data?.message || "Nepavyko atsakyti");
    } finally {
      setBusy(false);
    }
  }

  async function closeThread() {
    if (!selectedId) return;
    setBusy(true);
    try {
      await api.patch(`/api/chat/admin/threads/${selectedId}/close`);
      setThread(null);
      setMessages([]);
      setSelectedId("");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("chat");
        return next;
      });
      onSuccess?.("Pokalbis uždarytas");
      await loadThreads();
    } catch (e) {
      onError?.(e?.response?.data?.message || "Nepavyko uždaryti");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-card ring-1 ring-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-sand-100 bg-gradient-to-r from-skyyard-50 to-white px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy-800">Lankytojų žinutės</h2>
          <p className="mt-0.5 text-sm text-navy-800/55">Inbox · pirmas atsakymas priskiria jūsų vardą</p>
        </div>
        <button className="btn-ghost !px-3 !py-2 text-xs" type="button" onClick={() => loadThreads().catch(() => {})}>
          Atnaujinti
        </button>
      </div>

      <div className="grid lg:grid-cols-5">
        <div className="max-h-[380px] space-y-1 overflow-y-auto border-b border-sand-100 p-3 lg:col-span-2 lg:max-h-[480px] lg:border-b-0 lg:border-r">
          {threads.length === 0 ? (
            <div className="rounded-2xl bg-sand-50 p-4 text-sm text-navy-800/60 ring-1 ring-sand-200">
              Nėra atvirų pokalbių.
            </div>
          ) : (
            threads.map((t) => {
              const active = String(selectedId) === String(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openThread(t.id)}
                  className={[
                    "flex w-full items-start gap-3 rounded-2xl p-3 text-left transition",
                    active ? "bg-skyyard-100 ring-1 ring-skyyard-200" : "hover:bg-sand-50"
                  ].join(" ")}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-800 text-xs font-bold text-white">
                    {initials(t.guestName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-navy-900">{t.guestName}</span>
                      {t.unreadByAdmin ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-skyyard-500 px-1.5 text-[10px] font-bold text-white">
                          1
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-navy-800/50">{t.guestEmail}</span>
                    <span className="mt-1 block text-[11px] text-navy-800/40">{formatTime(t.lastMessageAt)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex min-h-[360px] flex-col lg:col-span-3 lg:min-h-[480px]">
          {!thread ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-skyyard-50 text-skyyard-500 ring-1 ring-skyyard-100">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 6h14v10H8l-3 3V6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-sm text-navy-800/55">Pasirinkite pokalbį iš sąrašo</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-sand-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-skyyard-100 text-sm font-bold text-navy-800">
                    {initials(thread.guestName)}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-navy-900">{thread.guestName}</div>
                    <div className="text-xs text-navy-800/60">{thread.guestEmail}</div>
                    <div className="mt-0.5 text-[11px] text-skyyard-500">
                      {thread.assignedAdminDisplayName
                        ? `Lankytojas mato: ${thread.assignedAdminDisplayName}`
                        : "Dar nepriskirta"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!thread.assignedAdminDisplayName ? (
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" type="button" disabled={busy} onClick={claim}>
                      Prisiimti
                    </button>
                  ) : null}
                  <button className="btn-ghost !px-3 !py-1.5 text-xs" type="button" disabled={busy} onClick={closeThread}>
                    Uždaryti
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto bg-sand-50/80 p-3">
                {messages.map((m) => {
                  const admin = m.senderRole === "admin";
                  return (
                    <div key={m.id} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                          admin ? "bg-skyyard-100 text-navy-900" : "bg-white text-navy-800 ring-1 ring-sand-200"
                        ].join(" ")}
                      >
                        <div className="mb-0.5 text-[11px] font-semibold text-navy-800/70">{m.displayName}</div>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className="mt-1 text-[10px] text-navy-800/40">{formatTime(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form className="flex items-end gap-2 border-t border-sand-100 bg-white p-3" onSubmit={sendReply}>
                <textarea
                  className="input min-h-[48px] flex-1 resize-none"
                  placeholder="Parašykite atsakymą..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  required
                />
                <button
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-skyyard-500 text-white transition hover:brightness-105 disabled:opacity-50"
                  type="submit"
                  disabled={busy}
                  aria-label="Siųsti"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 12 20 4l-6 16-2-7-8-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
