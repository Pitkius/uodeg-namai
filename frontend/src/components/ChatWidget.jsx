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
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="flex h-[min(560px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-rose-200/70 bg-white shadow-xl shadow-rose-200/40">
          <div className="flex items-center justify-between bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-3 text-white">
            <div>
              <div className="text-sm font-bold">Rašykite mums</div>
              <div className="text-xs text-white/85">
                {thread?.assignedAdminDisplayName
                  ? `Atsako: ${thread.assignedAdminDisplayName}`
                  : "Atsakys Ernesta, Patricija arba Pijus"}
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-lg leading-none text-white/90 hover:bg-white/15"
              onClick={() => setOpen(false)}
              aria-label="Uždaryti"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-gradient-to-b from-rose-50/40 to-sky-50/30 p-3">
            {!thread ? (
              <p className="text-sm text-slate-600">
                Parašykite bet kada — registracija nebūtina. Kai kas nors iš komandos atsakys, matysite
                jų vardą.
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.senderRole === "visitor";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={[
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        mine
                          ? "bg-rose-600 text-white"
                          : "bg-white text-slate-800 ring-1 ring-slate-200"
                      ].join(" ")}
                    >
                      {!mine ? (
                        <div className="mb-0.5 text-[11px] font-semibold text-rose-700">{m.displayName}</div>
                      ) : null}
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-rose-100 bg-white p-3">
            {error ? <div className="mb-2 text-xs text-rose-700">{error}</div> : null}
            {!thread ? (
              <form className="grid gap-2" onSubmit={startChat}>
                <input
                  className="input"
                  placeholder="Jūsų vardas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="El. paštas"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder="Telefonas (nebūtina)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <textarea
                  className="input min-h-[72px] resize-none"
                  placeholder="Jūsų žinutė..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  required
                  minLength={1}
                />
                <button className="btn-primary" type="submit" disabled={busy}>
                  {busy ? "Siunčiama..." : "Pradėti pokalbį"}
                </button>
              </form>
            ) : (
              <form className="grid gap-2" onSubmit={sendReply}>
                <textarea
                  className="input min-h-[64px] resize-none"
                  placeholder="Rašykite atsakymą..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <button className="btn-primary flex-1" type="submit" disabled={busy}>
                    {busy ? "..." : "Siųsti"}
                  </button>
                  <button className="btn-ghost" type="button" onClick={newConversation}>
                    Naujas
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-300/50 ring-1 ring-white/40 transition hover:brightness-105"
      >
        {open ? "Uždaryti" : "Rašykite mums"}
      </button>
    </div>
  );
}
