import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

function formatTime(value) {
  try {
    return new Date(value).toLocaleString("lt-LT");
  } catch {
    return "";
  }
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
    <div className="card p-6 text-left">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy-800">Žinutės iš lankytojų</h2>
          <p className="mt-1 text-sm text-navy-800/65">
            Kai atsakote, lankytojas mato jūsų vardą. Naujos žinutės ateina į visų adminų Gmail.
          </p>
        </div>
        <button className="btn-ghost" type="button" onClick={() => loadThreads().catch(() => {})}>
          Atnaujinti
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="max-h-[420px] space-y-2 overflow-y-auto lg:col-span-2">
          {threads.length === 0 ? (
            <div className="rounded-xl bg-sand-50 p-4 text-sm text-navy-800/65 ring-1 ring-sand-200">
              Nėra atvirų pokalbių.
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openThread(t.id)}
                className={[
                  "w-full rounded-xl p-3 text-left ring-1 transition",
                  String(selectedId) === String(t.id)
                    ? "bg-navy-800 text-white ring-navy-800"
                    : "bg-white text-navy-800 ring-sand-200 hover:bg-sand-50"
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{t.guestName}</span>
                  {t.unreadByAdmin ? (
                    <span
                      className={[
                        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        String(selectedId) === String(t.id) ? "bg-white/20" : "bg-tan-200 text-navy-900"
                      ].join(" ")}
                    >
                      Nauja
                    </span>
                  ) : null}
                </div>
                <div
                  className={[
                    "mt-0.5 text-xs",
                    String(selectedId) === String(t.id) ? "text-white/80" : "text-navy-800/55"
                  ].join(" ")}
                >
                  {t.guestEmail}
                </div>
                <div
                  className={[
                    "mt-1 text-[11px]",
                    String(selectedId) === String(t.id) ? "text-white/70" : "text-navy-800/40"
                  ].join(" ")}
                >
                  {t.assignedAdminDisplayName
                    ? `Atsako: ${t.assignedAdminDisplayName}`
                    : "Dar nepriskirta"}{" "}
                  · {formatTime(t.lastMessageAt)}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex min-h-[360px] flex-col rounded-2xl bg-white ring-1 ring-sand-200 lg:col-span-3">
          {!thread ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-navy-800/50">
              Pasirinkite pokalbį iš sąrašo arba atidarykite nuorodą iš el. laiško.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-sand-200 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-navy-900">{thread.guestName}</div>
                  <div className="text-xs text-navy-800/70">{thread.guestEmail}</div>
                  {thread.guestPhone ? (
                    <div className="text-xs text-navy-800/70">Tel.: {thread.guestPhone}</div>
                  ) : null}
                  <div className="mt-1 text-xs text-skyyard-500">
                    {thread.assignedAdminDisplayName
                      ? `Lankytojas mato: ${thread.assignedAdminDisplayName}`
                      : "Dar niekas neatsakė — pirmas atsakymas priskirs jūsų vardą"}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!thread.assignedAdminDisplayName ? (
                    <button className="btn-ghost" type="button" disabled={busy} onClick={claim}>
                      Prisiimti
                    </button>
                  ) : null}
                  <button className="btn-ghost" type="button" disabled={busy} onClick={closeThread}>
                    Uždaryti
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto bg-sand-50 p-3">
                {messages.map((m) => {
                  const admin = m.senderRole === "admin";
                  return (
                    <div key={m.id} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          admin
                            ? "bg-navy-800 text-white"
                            : "bg-white text-navy-800 ring-1 ring-sand-200"
                        ].join(" ")}
                      >
                        <div
                          className={`mb-0.5 text-[11px] font-semibold ${admin ? "text-skyyard-200" : "text-skyyard-500"}`}
                        >
                          {m.displayName}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`mt-1 text-[10px] ${admin ? "text-white/70" : "text-navy-800/40"}`}>
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form className="grid gap-2 border-t border-sand-200 p-3" onSubmit={sendReply}>
                <textarea
                  className="input min-h-[72px] resize-none"
                  placeholder="Jūsų atsakymas lankytojui..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  required
                />
                <button className="btn-primary" type="submit" disabled={busy}>
                  {busy ? "Siunčiama..." : "Atsakyti"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
