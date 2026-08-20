import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ltLocale from "@fullcalendar/core/locales/lt";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useSeo } from "../lib/seo";
import { AuthImage } from "../components/AuthImage";
import { AdminChatPanel } from "../components/AdminChatPanel";
import { AdminAnalyticsPanel } from "../components/AdminAnalyticsPanel";

function iso(d) {
  return new Date(d).toISOString();
}

function toLocalInputValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Admin() {
  const { user, isSuperAdmin } = useAuth();
  useSeo({
    title: "Administravimas",
    description: "Valdykite apsistojimų kalendorių, rezervacijas ir administratoriaus teises.",
    path: "/admin"
  });
  const [range, setRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    const to = new Date(now);
    to.setDate(to.getDate() + 60);
    return { from, to };
  });

  const [slots, setSlots] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [start, setStart] = useState(() => toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [end, setEnd] = useState(() => toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000)));

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [slotsRes, resRes, adminsRes, contactRes] = await Promise.all([
        api.get("/api/slots", { params: { from: iso(range.from), to: iso(range.to) } }),
        api.get("/api/reservations", { params: { from: iso(range.from), to: iso(range.to) } }),
        api.get("/api/admin/admins"),
        api.get("/api/admin/contact-messages", { params: { limit: 100 } })
      ]);
      setSlots(slotsRes.data.slots || []);
      setReservations(resRes.data.reservations || []);
      setAdmins(adminsRes.data.admins || []);
      setContactMessages(contactRes.data.messages || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko užkrauti duomenų");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from.getTime(), range.to.getTime()]);

  const resBySlot = useMemo(() => {
    const map = new Map();
    for (const r of reservations) {
      if (r.slotId) map.set(String(r.slotId), r);
    }
    return map;
  }, [reservations]);

  const events = useMemo(() => {
    const ev = slots.map((s) => {
      const r = resBySlot.get(String(s._id));
      const title = r
        ? r.status === "confirmed"
          ? `Patvirtinta: ${r.ownerName || r.userName}`
          : `Laukia: ${r.ownerName || r.userName}`
        : "Laisvas apsistojimo laikas";
      const className = r
        ? r.status === "confirmed"
          ? "bg-navy-800 border-navy-800"
          : "bg-tan-400 border-tan-400"
        : "bg-skyyard-500 border-skyyard-500";
      return {
        id: String(s._id),
        title,
        start: s.start,
        end: s.end,
        className,
        extendedProps: { slot: s, reservation: r }
      };
    });
    for (const r of reservations) {
      if (r.slotId || r.status === "cancelled") continue;
      ev.push({
        id: `stay-${r._id}`,
        title:
          r.status === "confirmed"
            ? `Nakvynė (patvirtinta): ${r.ownerName || r.userName}`
            : `Nakvynė (laukiama): ${r.ownerName || r.userName}`,
        start: r.start,
        end: r.end,
        allDay: true,
        className:
          r.status === "confirmed"
            ? "bg-navy-800 border-navy-800"
            : "bg-tan-400 border-tan-400",
        extendedProps: { slot: null, reservation: r }
      });
    }
    return ev;
  }, [slots, reservations, resBySlot]);

  async function createSlot() {
    setError("");
    setSuccess("");
    try {
      await api.post("/api/slots", { start: new Date(start).toISOString(), end: new Date(end).toISOString() });
      setSuccess("Slotas sukurtas");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko sukurti sloto");
    }
  }

  async function removeSlot(slotId) {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/api/slots/${slotId}`);
      setSuccess("Slotas pašalintas");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko pašalinti sloto");
    }
  }

  async function confirmReservation(id) {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/api/reservations/${id}/confirm`);
      setSuccess("Rezervacija patvirtinta");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko patvirtinti");
    }
  }

  async function deleteReservation(id) {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/api/reservations/${id}/admin`);
      setSuccess("Rezervacija ištrinta");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko ištrinti");
    }
  }

  async function createAdmin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await api.post("/api/admin/admins", {
        name: adminName,
        email: adminEmail,
        password: adminPassword
      });
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setSuccess(res.data.updated ? "Esamas vartotojas pakeistas į admin" : "Naujas admin sukurtas");
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Nepavyko sukurti admin");
    }
  }

  async function removeAdmin(userId) {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/api/admin/admins/${userId}`);
      setSuccess("Admin teisės nuimtos");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko istrinti admin");
    }
  }

  async function markMessageRead(messageId) {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/api/admin/contact-messages/${messageId}/read`);
      setContactMessages((prev) =>
        prev.map((msg) =>
          String(msg._id) === String(messageId)
            ? {
                ...msg,
                isRead: true
              }
            : msg
        )
      );
      setSuccess("Žinutė pažymėta kaip perskaityta");
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko atnaujinti žinutės");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="card relative overflow-hidden p-4 text-left sm:p-6 md:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 hidden h-36 w-36 rounded-full bg-skyyard-100/70 sm:block" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-skyyard-500">Sunny Yard</p>
            <h1 className="page-title mt-1 text-2xl font-semibold sm:text-3xl md:text-4xl">
              Labas{user?.name ? `, ${String(user.name).split(" ")[0]}` : ", Admin"}!
            </h1>
            <p className="mt-2 text-sm text-navy-800/65">
              Kas vyksta Uodegų namuose šiandien — kalendorius, rezervacijos, žinutės ir statistika.
            </p>
          </div>
          <button className="btn-ghost w-full sm:w-auto" onClick={load} disabled={loading}>
            {loading ? "Kraunama..." : "Atnaujinti"}
          </button>
        </div>

        {error ? <div className="mt-3 error">{error}</div> : null}
        {success ? (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
            {success}
          </div>
        ) : null}
      </div>

      <AdminAnalyticsPanel
        onError={(msg) => {
          setError(msg);
          setSuccess("");
        }}
      />

      <AdminChatPanel
        onError={(msg) => {
          setError(msg);
          setSuccess("");
        }}
        onSuccess={(msg) => {
          setSuccess(msg);
          setError("");
        }}
      />

      <div className="card p-6 text-left">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4 md:col-span-1">
            <div className="text-sm font-semibold text-navy-900">Pridėti apsistojimo slotą</div>
            <div className="mt-3 grid gap-3">
              <div>
                <div className="label">Pradžia</div>
                <input
                  className="input mt-1"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <div className="label">Pabaiga</div>
                <input
                  className="input mt-1"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={createSlot}>
                Pridėti
              </button>
            </div>
          </div>

          <div className="md:col-span-2 min-w-0 overflow-x-auto overflow-y-hidden rounded-2xl border border-sand-200 bg-white p-2 shadow-inner">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              locale={ltLocale}
              initialView="timeGridWeek"
              height="auto"
              nowIndicator
              firstDay={1}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,dayGridMonth"
              }}
              buttonText={{
                today: "Šiandien",
                month: "Mėnuo",
                week: "Savaitė",
                day: "Diena"
              }}
              events={events}
              datesSet={(arg) => {
                const from = new Date(arg.start);
                from.setDate(from.getDate() - 7);
                const to = new Date(arg.end);
                to.setDate(to.getDate() + 14);
                setRange({ from, to });
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6 text-left">
          <h2 className="font-display text-xl font-semibold text-navy-800">Admin vartotojai</h2>
          {isSuperAdmin ? (
            <form className="mt-3 grid gap-3" onSubmit={createAdmin}>
              <div>
                <div className="label">Vardas (pvz. Ernesta / Patricija / Pijus)</div>
                <input
                  className="input mt-1"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="label">El. paštas (Gmail)</div>
                <input
                  className="input mt-1"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="label">Slaptažodis</div>
                <input
                  className="input mt-1"
                  type="password"
                  minLength={8}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
              <button className="btn-primary" type="submit">
                Pridėti admin
              </button>
            </form>
          ) : (
            <div className="mt-3 rounded-xl bg-white/80 p-3 text-sm text-navy-800 ring-1 ring-sand-200">
              Tik pagrindinis adminas gali pridėti arba ištrinti adminus.
            </div>
          )}

          <div className="mt-4 grid gap-2">
            {admins.map((a) => (
              <div
                key={a._id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/90 p-3 ring-1 ring-sand-200"
              >
                <div>
                  <div className="text-sm font-semibold text-navy-900">{a.name}</div>
                  <div className="text-xs text-navy-800/70">{a.email}</div>
                </div>
                {isSuperAdmin && String(a._id) !== String(user?.id) ? (
                  <button className="btn-ghost" onClick={() => removeAdmin(a._id)}>
                    Ištrinti admin
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 text-left">
          <h2 className="font-display text-xl font-semibold text-navy-800">Apsistojimo slotai</h2>
          <div className="mt-3 grid gap-2">
            {slots.length === 0 ? (
              <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 text-sm text-navy-800/70">
                Nėra apsistojimo slotų šiame intervale.
              </div>
            ) : (
              slots
                .slice()
                .sort((a, b) => new Date(a.start) - new Date(b.start))
                .map((s) => (
                  <div
                    key={s._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-sand-200"
                  >
                    <div>
                      <div className="text-sm font-medium text-navy-900">
                        {new Date(s.start).toLocaleString("lt-LT")}
                      </div>
                      <div className="text-xs text-navy-800/70">
                        Trukmė: {Math.round((new Date(s.end) - new Date(s.start)) / (60 * 1000))} min.
                      </div>
                    </div>
                    <button className="btn-ghost" onClick={() => removeSlot(s._id)}>
                      Pašalinti slotą
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-6 text-left">
        <h2 className="font-display text-xl font-semibold text-navy-800">Kontaktų formos žinutės</h2>
        <div className="mt-3 grid gap-3">
          {contactMessages.length === 0 ? (
            <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 text-sm text-navy-800/70">
              Kol kas nėra gautų žinučių.
            </div>
          ) : (
            contactMessages.map((m) => (
              <div
                key={m._id}
                className="rounded-xl border border-white/80 bg-white/95 p-4 shadow-sm ring-1 ring-sand-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-navy-900">{m.name}</div>
                    <div className="text-xs text-navy-800/70">{m.email}</div>
                    <div className="text-xs text-navy-800/70">Tel.: {m.phone || "-"}</div>
                    <div className="mt-1 text-xs text-navy-800/50">
                      Gauta: {new Date(m.createdAt).toLocaleString("lt-LT")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "rounded-lg px-2 py-1 text-xs font-semibold",
                        m.isRead ? "bg-skyyard-100 text-navy-800" : "bg-tan-200 text-navy-900"
                      ].join(" ")}
                    >
                      {m.isRead ? "Perskaityta" : "Nauja"}
                    </span>
                    {!m.isRead ? (
                      <button className="btn-ghost" onClick={() => markMessageRead(m._id)}>
                        Žymėti perskaityta
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-sand-50 p-3 text-sm text-navy-800 ring-1 ring-sand-200">
                  {m.message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6 text-left">
        <h2 className="font-display text-xl font-semibold text-navy-800">Visos apsistojimo užklausos (su pastabomis ir foto)</h2>
        <div className="mt-3 grid gap-3">
          {reservations.length === 0 ? (
            <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 text-sm text-navy-800/70">
              Nėra apsistojimo užklausų šiame intervale.
            </div>
          ) : (
            reservations
              .slice()
              .sort((a, b) => new Date(a.start) - new Date(b.start))
              .map((r) => (
                <div
                  key={r._id}
                  className="rounded-xl border border-white/80 bg-white/95 p-4 shadow-sm ring-1 ring-sand-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-navy-900">{r.ownerName || r.userName}</div>
                      <div className="text-xs text-navy-800/70">{r.ownerEmail || "be el. pašto"}</div>
                      <div className="mt-1 text-xs text-navy-800/70">
                        {new Date(r.start).toLocaleDateString("lt-LT")} -{" "}
                        {new Date(r.end).toLocaleDateString("lt-LT")} (išvykimas)
                      </div>
                      <div className="mt-1 text-xs text-navy-800/70">
                        Statusas:{" "}
                        <span className="font-medium text-navy-900">
                          {r.status === "pending"
                            ? "laukiama"
                            : r.status === "confirmed"
                              ? "patvirtinta"
                              : "atšaukta"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-navy-800">
                        Pastabos: <span className="text-navy-800/70">{r.notes || "-"}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(r.ownerPhotos || []).length === 0 ? (
                          <div className="rounded-lg bg-sand-100 p-2 text-xs text-navy-800/50">Nuotraukų nėra</div>
                        ) : (
                          (r.ownerPhotos || []).slice(0, 8).map((p) => (
                            <div
                              key={`${r._id}-${p.url}`}
                              className="overflow-hidden rounded-lg ring-1 ring-sand-200"
                            >
                              <AuthImage
                                src={p.url}
                                version={p.uploadedAt || p.filename || p.url}
                                alt={p.filename || "Augintinio nuotrauka"}
                                className="h-20 w-full object-cover"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {r.status === "pending" ? (
                        <button className="btn-primary" onClick={() => confirmReservation(r._id)}>
                          Patvirtinti
                        </button>
                      ) : null}
                      <button className="btn-ghost" onClick={() => deleteReservation(r._id)}>
                        Ištrinti
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
