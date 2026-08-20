import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { clearChatSession, getChatSession, setChatSession } from "../lib/chatSession";

function formatTime(value) {
  try {
    return new Date(value).toLocaleString("lt-LT", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit"
    });
  } catch {
    return "";
  }
}

export function ChatWidget() {
  const { user, isAuthed } = useAuth();
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visitorToken, setVisitorToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isAuthed && user) {
      setName((n) => n || user.name || "");
      setEmail((e) => e || user.email || "");
    }
  }, [isAuthed, user]);

  useEffect(() => {
    const session = getChatSession();
    if (!session) return;
    setVisitorToken(session.visitorToken);
    (async () => {
      try {
        const res = await api.get(`/api/chat/threads/${session.threadId}`, {
          params: { token: session.visitorToken },
          headers: { "X-Chat-Token": session.visitorToken }
        });
        setThread(res.data.thread);
        setMessages(res.data.messages || []);
      } catch {
        clearChatSession();
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!thread?.id || !visitorToken) return undefined;

    const t = setInterval(async () => {
      try {
        const res = await api.get(`/api/chat/threads/${thread.id}`, {
          params: { token: visitorToken },
          headers: { "X-Chat-Token": visitorToken }
        });
        setThread(res.data.thread);
        setMessages(res.data.messages || []);
      } catch {
        // ignore poll errors
      }
    }, 8000);
    return () => clearInterval(t);
  }, [open, thread?.id, visitorToken]);

  async function startChat(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/api/chat/threads", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: draft.trim()
      });
      setThread(res.data.thread);
      setMessages(res.data.messages || []);
      setVisitorToken(res.data.visitorToken);
      setChatSession(res.data.thread.id, res.data.visitorToken);
      setDraft("");
    } catch (err) {
      setError(err?.response?.data?.message || "Nepavyko pradėti pokalbio");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!thread?.id || !draft.trim()) return;
    setError("");
    setBusy(true);
    try {
      const res = await api.post(`/api/chat/threads/${thread.id}/messages`, {
        message: draft.trim(),
        visitorToken
      });
      setMessages((prev) => [...prev, res.data.message]);
      setThread(res.data.thread);
      setDraft("");
    } catch (err) {
      setError(err?.response?.data?.message || "Nepavyko išsiųsti");
    } finally {
      setBusy(false);
    }
  }

  function newConversation() {
    clearChatSession();
    setThread(null);
    setMessages([]);
    setVisitorToken("");
    setDraft("");
    setError("");
  }

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3">
      {open ? (
        <div className="flex h-[min(580px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.2rem] border border-sand-200 bg-white shadow-[0_20px_50px_-20px_rgba(26,43,86,0.35)] sm:rounded-[1.35rem]">
          <div className="flex items-start justify-between gap-2 bg-skyyard-100 px-3 py-3 text-navy-900 sm:px-4">
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold leading-snug">Pokalbis su administratoriumi</div>
              <div className="mt-0.5 text-xs leading-snug text-navy-800/65">
                {thread?.assignedAdminDisplayName
                  ? `Atsako: ${thread.assignedAdminDisplayName}`
                  : "Atsakys Ernesta, Patricija arba Pijus"}
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-navy-800/60 hover:bg-white/70"
              onClick={() => setOpen(false)}
              aria-label="Uždaryti"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-sand-50 p-3">
            {!thread ? (
              <p className="rounded-2xl bg-white p-3 text-sm text-navy-800/70 ring-1 ring-sand-200">
                Parašykite bet kada — registracija nebūtina. Kai kas nors iš komandos atsakys, matysite jų vardą.
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.senderRole === "visitor";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={[
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                        mine
                          ? "bg-skyyard-100 text-navy-900"
                          : "bg-white text-navy-900 ring-1 ring-sand-200"
                      ].join(" ")}
                    >
                      {!mine ? (
                        <div className="mb-0.5 text-[11px] font-semibold text-navy-800">{m.displayName}</div>
                      ) : null}
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className="mt-1 text-[10px] text-navy-800/40">{formatTime(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-sand-200 bg-white p-3">
            {error ? <div className="mb-2 text-xs text-red-700">{error}</div> : null}
            {!thread ? (
              <form className="grid gap-2" onSubmit={startChat}>
                <input className="input" placeholder="Jūsų vardas" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
                <input className="input" type="email" placeholder="El. paštas" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input className="input" placeholder="Telefonas (nebūtina)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <textarea className="input min-h-[72px] resize-none" placeholder="Jūsų žinutė..." value={draft} onChange={(e) => setDraft(e.target.value)} required minLength={1} />
                <button className="btn-primary" type="submit" disabled={busy}>
                  {busy ? "Siunčiama..." : "Pradėti pokalbį"}
                </button>
              </form>
            ) : (
              <form className="flex items-end gap-2" onSubmit={sendReply}>
                <textarea
                  className="input min-h-[48px] flex-1 resize-none"
                  placeholder="Parašyk žinutę..."
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
            )}
            {thread ? (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-navy-800/50 hover:text-navy-800"
                onClick={newConversation}
              >
                Naujas pokalbis
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-14px_rgba(26,43,86,0.65)] transition hover:bg-navy-700 sm:px-5 sm:py-3.5"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 6h14v10H8l-3 3V6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span className="sm:hidden">{open ? "Uždaryti" : "Rašyti"}</span>
        <span className="hidden sm:inline">{open ? "Uždaryti" : "Rašykite mums"}</span>
      </button>
    </div>
  );
}
