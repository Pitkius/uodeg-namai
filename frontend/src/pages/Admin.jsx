import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ltLocale from "@fullcalendar/core/locales/lt";
import { api, getApiBaseUrl } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useSeo } from "../lib/seo";

function iso(d) {
  return new Date(d).toISOString();
}

function toLocalInputValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function resolveMediaUrl(url, version = "") {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = getApiBaseUrl();
  const clean = `${base}${url.startsWith("/") ? "" : "/"}${url}`;
  return version ? `${clean}?v=${encodeURIComponent(String(version))}` : clean;
}
export function Admin() {
  const { user } = useAuth();
  useSeo({
    title: "Administravimas",
    description: "Valdykite apsistojimų kalendorių, rezervacijas ir administratoriaus teises.",
    path: "/admin"
  });
  const isSuperAdmin = String(user?.email || "").toLowerCase().trim() === "pytka4101@gmail.com";
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
      const [slotsRes, resRes, adminsRes] = await Promise.all([
        api.get("/api/slots", { params: { from: iso(range.from), to: iso(range.to) } }),
        api.get("/api/reservations", { params: { from: iso(range.from), to: iso(range.to) } }),
        api.get("/api/admin/admins")
      ]);
      setSlots(slotsRes.data.slots || []);
      setReservations(resRes.data.reservations || []);
      setAdmins(adminsRes.data.admins || []);
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
          ? "bg-slate-900 border-slate-900"
          : "bg-amber-600 border-amber-600"
        : "bg-emerald-600 border-emerald-600";
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
            ? "bg-slate-900 border-slate-900"
            : "bg-amber-600 border-amber-600",
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

  return (
    <div className="grid gap-6">
      <div className="card overflow-hidden border-0 bg-gradient-to-br from-slate-900/5 via-sky-50/50 to-rose-50/40 p-6 text-left ring-1 ring-sky-100/80">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="page-title">Admin: pilnas valdymas</span>
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Matomas pilnas kalendorius, visos pastabos ir savininkų įkeltos augintinio nuotraukos.
            </p>
          </div>
          <button className="btn-ghost" onClick={load} disabled={loading}>
            {loading ? "Kraunama..." : "Atnaujinti"}
          </button>
        </div>

        {error ? <div className="mt-3 error">{error}</div> : null}
        {success ? <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">{success}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-100/80 to-violet-50/60 p-4 md:col-span-1">
            <div className="text-sm font-semibold text-slate-900">Pridėti apsistojimo slotą</div>
            <div className="mt-3 grid gap-3">
              <div>
                <div className="label">Pradžia</div>
                <input className="input mt-1" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <div className="label">Pabaiga</div>
                <input className="input mt-1" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={createSlot}>
                Pridėti
              </button>
            </div>
          </div>

          <div className="md:col-span-2 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-2 shadow-inner">
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
        <div className="card border-0 bg-gradient-to-br from-indigo-50/70 to-sky-50/40 p-6 text-left ring-1 ring-indigo-100/60">
          <h2 className="text-lg font-bold text-slate-900">Admin vartotojai</h2>
          {isSuperAdmin ? (
            <form className="mt-3 grid gap-3" onSubmit={createAdmin}>
              <div>
                <div className="label">Vardas</div>
                <input className="input mt-1" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
              </div>
              <div>
                <div className="label">El. paštas</div>
                <input className="input mt-1" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
              </div>
              <div>
                <div className="label">Slaptažodis</div>
                <input className="input mt-1" type="password" minLength={8} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
              </div>
              <button className="btn-primary" type="submit">Pridėti admin</button>
            </form>
          ) : (
            <div className="mt-3 rounded-xl bg-white/80 p-3 text-sm text-slate-700 ring-1 ring-indigo-100">
              Tik pagrindinis adminas <strong>pytka4101@gmail.com</strong> gali pridėti arba istrinti adminus.
            </div>
          )}

          <div className="mt-4 grid gap-2">
            {admins.map((a) => (
              <div key={a._id} className="flex items-center justify-between gap-3 rounded-xl bg-white/90 p-3 ring-1 ring-indigo-100">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                  <div className="text-xs text-slate-600">{a.email}</div>
                </div>
                {isSuperAdmin && String(a.email).toLowerCase().trim() !== "pytka4101@gmail.com" ? (
                  <button className="btn-ghost" onClick={() => removeAdmin(a._id)}>
                    Ištrinti admin
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-emerald-50/70 to-cyan-50/40 p-6 text-left ring-1 ring-emerald-100/60">
          <h2 className="text-lg font-bold text-slate-900">Apsistojimo slotai</h2>
          <div className="mt-3 grid gap-2">
            {slots.length === 0 ? (
              <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4 text-sm text-slate-600">
                Nėra apsistojimo slotų šiame intervale.
              </div>
            ) : (
              slots.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).map((s) => (
                <div
                  key={s._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-emerald-100/50"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(s.start).toLocaleString("lt-LT")}
                    </div>
                    <div className="text-xs text-slate-600">
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

      <div className="card border-0 bg-gradient-to-br from-rose-50/80 to-orange-50/50 p-6 text-left ring-1 ring-rose-100/60">
        <h2 className="text-lg font-bold text-slate-900">Visos apsistojimo užklausos (su pastabomis ir foto)</h2>
        <div className="mt-3 grid gap-3">
          {reservations.length === 0 ? (
            <div className="rounded-xl border border-rose-200/50 bg-rose-50/50 p-4 text-sm text-slate-600">
              Nėra apsistojimo užklausų šiame intervale.
            </div>
          ) : (
            reservations
              .slice()
              .sort((a, b) => new Date(a.start) - new Date(b.start))
              .map((r) => (
                <div
                  key={r._id}
                  className="rounded-xl border border-white/80 bg-white/95 p-4 shadow-sm ring-1 ring-rose-100/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{r.ownerName || r.userName}</div>
                      <div className="text-xs text-slate-600">{r.ownerEmail || "be el. pašto"}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {new Date(r.start).toLocaleDateString("lt-LT")} - {new Date(r.end).toLocaleDateString("lt-LT")}{" "}
                        (išvykimas)
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Statusas:{" "}
                        <span className="font-medium text-slate-900">
                          {r.status === "pending" ? "laukiama" : r.status === "confirmed" ? "patvirtinta" : "atšaukta"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-700">
                        Pastabos: <span className="text-slate-600">{r.notes || "-"}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(r.ownerPhotos || []).length === 0 ? (
                          <div className="rounded-lg bg-slate-100 p-2 text-xs text-slate-500">Nuotraukų nėra</div>
                        ) : (
                          (r.ownerPhotos || []).slice(0, 8).map((p) => (
                            <a
                              key={`${r._id}-${p.url}`}
                              href={resolveMediaUrl(p.url, p.uploadedAt || p.filename || p.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="group overflow-hidden rounded-lg ring-1 ring-slate-200"
                            >
                              <img
                                src={resolveMediaUrl(p.url, p.uploadedAt || p.filename || p.url)}
                                alt={p.filename || "Augintinio nuotrauka"}
                                className="h-20 w-full object-cover transition group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                            </a>
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

