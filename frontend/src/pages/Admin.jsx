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
import { AdminGalleryPanel } from "../components/AdminGalleryPanel";

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

  const pendingReservations = useMemo(
    () =>
      reservations
        .filter((r) => r.status === "pending")
        .slice()
        .sort((a, b) => new Date(a.start) - new Date(b.start)),
    [reservations]
  );

  const firstName = user?.name ? String(user.name).split(" ")[0] : "Admin";
  const todayLabel = new Date().toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="admin-sunny -mx-3 min-h-[70vh] bg-[linear-gradient(180deg,#EAF4FB_0%,#FBF8F2_38%,#FBF8F2_100%)] px-3 pb-10 pt-2 sm:-mx-0 sm:rounded-[1.75rem] sm:px-5 sm:pt-5 md:px-6">
      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-skyyard-500">Sunny Yard · Admin</p>
          <h1 className="page-title mt-1 text-2xl font-semibold sm:text-3xl md:text-4xl">Labas, {firstName}!</h1>
          <p className="mt-2 text-sm text-navy-800/65">
            Štai kas vyksta Uodegų namuose šiandien — statistika, žinutės ir rezervacijų patvirtinimai.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <div className="rounded-2xl bg-white/90 px-3.5 py-2 text-sm font-medium text-navy-800 shadow-sm ring-1 ring-sand-200">
            {todayLabel}
          </div>
          <button className="btn-ghost bg-white/90" onClick={load} disabled={loading}>
            {loading ? "Kraunama..." : "Atnaujinti"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-2xl border border-skyyard-200 bg-white px-4 py-3 text-sm text-navy-800 shadow-sm">
          {success}
        </div>
      ) : null}

      <div className="grid gap-5">
        <AdminAnalyticsPanel
          onError={(msg) => {
            setError(msg);
            setSuccess("");
          }}
        />

        <AdminGalleryPanel
          onError={(msg) => {
            setError(msg);
            setSuccess("");
          }}
          onSuccess={(msg) => {
            setSuccess(msg);
            setError("");
          }}
        />

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {/* Approvals — mockup style */}
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-card ring-1 ring-white">
            <div className="flex items-center justify-between gap-3 border-b border-sand-100 bg-gradient-to-r from-sand-50 to-white px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-navy-800">Rezervacijų patvirtinimai</h2>
                <p className="mt-0.5 text-sm text-navy-800/55">
                  {pendingReservations.length
                    ? `${pendingReservations.length} laukia jūsų sprendimo`
                    : "Nėra laukiančių užklausų"}
                </p>
              </div>
            </div>
            <div className="max-h-[480px] space-y-2 overflow-y-auto p-3 sm:p-4">
              {pendingReservations.length === 0 ? (
                <div className="rounded-2xl bg-skyyard-50/80 px-4 py-8 text-center text-sm text-navy-800/60 ring-1 ring-skyyard-100">
                  Viskas švaru — naujų laukiančių rezervacijų nėra.
                </div>
              ) : (
                pendingReservations.map((r) => (
                  <div
                    key={r._id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-sand-50/90 p-3 ring-1 ring-sand-200/80 sm:flex-nowrap"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-skyyard-100 text-sm font-bold text-navy-800">
                      {String(r.ownerName || r.userName || "?")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() || "")
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-navy-900">{r.ownerName || r.userName}</div>
                      <div className="text-xs text-navy-800/55">
                        Nakvynė · {new Date(r.start).toLocaleDateString("lt-LT")} –{" "}
                        {new Date(r.end).toLocaleDateString("lt-LT")}
                      </div>
                      <div className="truncate text-[11px] text-navy-800/40">{r.ownerEmail || "be el. pašto"}</div>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <button
                        type="button"
                        className="grid h-10 flex-1 place-items-center rounded-xl bg-skyyard-100 text-navy-800 ring-1 ring-skyyard-200 transition hover:bg-skyyard-200 sm:w-10 sm:flex-none"
                        onClick={() => confirmReservation(r._id)}
                        aria-label="Patvirtinti"
                        title="Patvirtinti"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="grid h-10 flex-1 place-items-center rounded-xl bg-white text-navy-800 ring-1 ring-sand-300 transition hover:bg-sand-100 sm:w-10 sm:flex-none"
                        onClick={() => deleteReservation(r._id)}
                        aria-label="Atmesti"
                        title="Ištrinti"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

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
        </div>

        {/* Calendar */}
        <div className="overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-card ring-1 ring-white sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-navy-800">Kalendorius ir slotai</h2>
              <p className="mt-0.5 text-sm text-navy-800/55">Savaitės / mėnesio vaizdas ir naujų slotų kūrimas</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
              <div className="text-sm font-semibold text-navy-900">Pridėti slotą</div>
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
                <button className="btn-sky w-full" onClick={createSlot}>
                  Pridėti
                </button>
              </div>
            </div>
            <div className="sunny-calendar min-w-0 overflow-x-auto rounded-2xl border border-sand-100 bg-white p-2">
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

        {/* Ops: admins + slots list */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] bg-white p-4 shadow-card ring-1 ring-white sm:p-5">
            <h2 className="font-display text-xl font-semibold text-navy-800">Komanda</h2>
            <p className="mt-0.5 text-sm text-navy-800/55">Admin vartotojai</p>
            {isSuperAdmin ? (
              <form className="mt-4 grid gap-3" onSubmit={createAdmin}>
                <div>
                  <div className="label">Vardas (Ernesta / Patricija / Pijus)</div>
                  <input
                    className="input mt-1"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <div className="label">El. paštas</div>
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
              <div className="mt-4 rounded-2xl bg-sand-50 p-3 text-sm text-navy-800/70 ring-1 ring-sand-200">
                Tik pagrindinis adminas gali pridėti arba ištrinti adminus.
              </div>
            )}

            <div className="mt-4 grid gap-2">
              {admins.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-sand-50/90 p-3 ring-1 ring-sand-200"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-800 text-xs font-bold text-white">
                      {String(a.name || "?")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() || "")
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-navy-900">{a.name}</div>
                      <div className="truncate text-xs text-navy-800/60">{a.email}</div>
                    </div>
                  </div>
                  {isSuperAdmin && String(a._id) !== String(user?.id) ? (
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => removeAdmin(a._id)}>
                      Ištrinti
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-4 shadow-card ring-1 ring-white sm:p-5">
            <h2 className="font-display text-xl font-semibold text-navy-800">Apsistojimo slotai</h2>
            <p className="mt-0.5 text-sm text-navy-800/55">Aktyvūs slotai šiame intervale</p>
            <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
              {slots.length === 0 ? (
                <div className="rounded-2xl bg-sand-50 p-4 text-sm text-navy-800/65 ring-1 ring-sand-200">
                  Nėra apsistojimo slotų šiame intervale.
                </div>
              ) : (
                slots
                  .slice()
                  .sort((a, b) => new Date(a.start) - new Date(b.start))
                  .map((s) => (
                    <div
                      key={s._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sand-50/90 p-3 ring-1 ring-sand-200"
                    >
                      <div>
                        <div className="text-sm font-medium text-navy-900">
                          {new Date(s.start).toLocaleString("lt-LT")}
                        </div>
                        <div className="text-xs text-navy-800/60">
                          Trukmė: {Math.round((new Date(s.end) - new Date(s.start)) / (60 * 1000))} min.
                        </div>
                      </div>
                      <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => removeSlot(s._id)}>
                        Pašalinti
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Contact messages */}
        <div className="rounded-[1.5rem] bg-white p-4 shadow-card ring-1 ring-white sm:p-5">
          <h2 className="font-display text-xl font-semibold text-navy-800">Kontaktų formos žinutės</h2>
          <p className="mt-0.5 text-sm text-navy-800/55">Žinutės iš pagrindinio puslapio formos</p>
          <div className="mt-4 grid gap-3">
            {contactMessages.length === 0 ? (
              <div className="rounded-2xl bg-sand-50 p-4 text-sm text-navy-800/65 ring-1 ring-sand-200">
                Kol kas nėra gautų žinučių.
              </div>
            ) : (
              contactMessages.map((m) => (
                <div key={m._id} className="rounded-2xl bg-sand-50/90 p-4 ring-1 ring-sand-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-navy-900">{m.name}</div>
                      <div className="text-xs text-navy-800/60">{m.email}</div>
                      <div className="text-xs text-navy-800/60">Tel.: {m.phone || "-"}</div>
                      <div className="mt-1 text-[11px] text-navy-800/40">
                        {new Date(m.createdAt).toLocaleString("lt-LT")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          m.isRead ? "bg-skyyard-100 text-navy-800" : "bg-tan-200 text-navy-900"
                        ].join(" ")}
                      >
                        {m.isRead ? "Perskaityta" : "Nauja"}
                      </span>
                      {!m.isRead ? (
                        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => markMessageRead(m._id)}>
                          Perskaityta
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-navy-800 ring-1 ring-sand-200">
                    {m.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* All stays */}
        <div className="rounded-[1.5rem] bg-white p-4 shadow-card ring-1 ring-white sm:p-5">
          <h2 className="font-display text-xl font-semibold text-navy-800">Visos apsistojimo užklausos</h2>
          <p className="mt-0.5 text-sm text-navy-800/55">Su pastabomis ir savininkų nuotraukomis</p>
          <div className="mt-4 grid gap-3">
            {reservations.length === 0 ? (
              <div className="rounded-2xl bg-sand-50 p-4 text-sm text-navy-800/65 ring-1 ring-sand-200">
                Nėra apsistojimo užklausų šiame intervale.
              </div>
            ) : (
              reservations
                .slice()
                .sort((a, b) => new Date(a.start) - new Date(b.start))
                .map((r) => (
                  <div key={r._id} className="rounded-2xl bg-sand-50/90 p-4 ring-1 ring-sand-200">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-navy-900">{r.ownerName || r.userName}</div>
                        <div className="text-xs text-navy-800/60">{r.ownerEmail || "be el. pašto"}</div>
                        <div className="mt-1 text-xs text-navy-800/70">
                          {new Date(r.start).toLocaleDateString("lt-LT")} –{" "}
                          {new Date(r.end).toLocaleDateString("lt-LT")} (išvykimas)
                        </div>
                        <div className="mt-1">
                          <span
                            className={[
                              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              r.status === "confirmed"
                                ? "bg-skyyard-100 text-skyyard-500"
                                : r.status === "pending"
                                  ? "bg-tan-200 text-navy-900"
                                  : "bg-sand-200 text-navy-800/70"
                            ].join(" ")}
                          >
                            {r.status === "pending"
                              ? "Laukianti"
                              : r.status === "confirmed"
                                ? "Patvirtinta"
                                : "Atšaukta"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-navy-800">
                          Pastabos: <span className="text-navy-800/65">{r.notes || "-"}</span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {(r.ownerPhotos || []).length === 0 ? (
                            <div className="rounded-xl bg-white p-2 text-xs text-navy-800/45 ring-1 ring-sand-200">
                              Nuotraukų nėra
                            </div>
                          ) : (
                            (r.ownerPhotos || []).slice(0, 8).map((p) => (
                              <div
                                key={`${r._id}-${p.url}`}
                                className="overflow-hidden rounded-xl ring-1 ring-sand-200"
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
                          <button className="btn-primary !px-3 !py-2 text-xs" onClick={() => confirmReservation(r._id)}>
                            Patvirtinti
                          </button>
                        ) : null}
                        <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => deleteReservation(r._id)}>
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
    </div>
  );
}
