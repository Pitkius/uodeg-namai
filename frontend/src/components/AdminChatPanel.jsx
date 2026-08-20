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
      onSuccess?.("Pokalbis priskirtas jums — lankytojas matys jusu varda");
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
      onSuccess?.("Atsakymas issiustas");
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
      onSuccess?.("Pokalbis uzdarytas");
      await loadThreads();
    } catch (e) {
      onError?.(e?.response?.data?.message || "Nepavyko uzdaryti");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-0 bg-gradient-to-br from-violet-50/80 to-rose-50/40 p-6 text-left ring-1 ring-violet-100/60">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Žinutės iš lankytojų</h2>
          <p className="mt-1 text-sm text-slate-600">
            Kai atsakote, lankytojas mato jūsų vardą (pvz. Ernesta, Patricija, Pijus). Naujos žinutės
            ateina į visų adminų Gmail.
          </p>
        </div>
        <button className="btn-ghost" type="button" onClick={() => loadThreads().catch(() => {})}>
          Atnaujinti
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-2 max-h-[420px] overflow-y-auto">
          {threads.length === 0 ? (
            <div className="rounded-xl bg-white/80 p-4 text-sm text-slate-600 ring-1 ring-violet-100">
              Nera atviru pokalbiu.
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
                    ? "bg-violet-600 text-white ring-violet-600"
                    : "bg-white/90 text-slate-800 ring-violet-100 hover:bg-violet-50"
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{t.guestName}</span>
                  {t.unreadByAdmin ? (
                    <span
                      className={[
                        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        String(selectedId) === String(t.id) ? "bg-white/20" : "bg-amber-100 text-amber-900"
                      ].join(" ")}
                    >
                      Nauja
                    </span>
                  ) : null}
                </div>
                <div
                  className={[
                    "mt-0.5 text-xs",
                    String(selectedId) === String(t.id) ? "text-white/80" : "text-slate-500"
                  ].join(" ")}
                >
                  {t.guestEmail}
                </div>
                <div
                  className={[
                    "mt-1 text-[11px]",
                    String(selectedId) === String(t.id) ? "text-white/70" : "text-slate-400"
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

        <div className="lg:col-span-3 flex min-h-[360px] flex-col rounded-2xl bg-white/90 ring-1 ring-violet-100">
          {!thread ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
              Pasirinkite pokalbi is saraso arba atidarykite nuoroda is el. laisko.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-violet-100 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{thread.guestName}</div>
                  <div className="text-xs text-slate-600">{thread.guestEmail}</div>
                  {thread.guestPhone ? (
                    <div className="text-xs text-slate-600">Tel.: {thread.guestPhone}</div>
                  ) : null}
                  <div className="mt-1 text-xs text-violet-700">
                    {thread.assignedAdminDisplayName
                      ? `Lankytojas mato: ${thread.assignedAdminDisplayName}`
                      : "Dar niekas neatsake — pirmas atsakymas priskirs jusu varda"}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!thread.assignedAdminDisplayName ? (
                    <button className="btn-ghost" type="button" disabled={busy} onClick={claim}>
                      Prisiimti
                    </button>
                  ) : null}
                  <button className="btn-ghost" type="button" disabled={busy} onClick={closeThread}>
                    Uzdaruti
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/80 p-3">
                {messages.map((m) => {
                  const admin = m.senderRole === "admin";
                  return (
                    <div key={m.id} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          admin
                            ? "bg-violet-600 text-white"
                            : "bg-white text-slate-800 ring-1 ring-slate-200"
                        ].join(" ")}
                      >
                        <div
                          className={`mb-0.5 text-[11px] font-semibold ${admin ? "text-violet-100" : "text-rose-700"}`}
                        >
                          {m.displayName}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`mt-1 text-[10px] ${admin ? "text-white/70" : "text-slate-400"}`}>
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form className="grid gap-2 border-t border-violet-100 p-3" onSubmit={sendReply}>
                <textarea
                  className="input min-h-[72px] resize-none"
                  placeholder="Jusu atsakymas lankytojui..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  required
                />
                <button className="btn-primary" type="submit" disabled={busy}>
                  {busy ? "Siunciama..." : "Atsakyti"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
