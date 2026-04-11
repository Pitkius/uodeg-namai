import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import ltLocale from "@fullcalendar/core/locales/lt";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";

function iso(d) {
  return new Date(d).toISOString();
}

function toYmd(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function todayYmd() {
  return toYmd(startOfToday());
}

function parseYmdLocal(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

function nextDayYmd(ymd) {
  const d = parseYmdLocal(ymd);
  if (!d) return todayYmd();
  d.setDate(d.getDate() + 1);
  return toYmd(d);
}

function addOneDay(dateLike) {
  const d = new Date(dateLike);
  d.setDate(d.getDate() + 1);
  return d;
}

export function Reservations() {
  useSeo({
    title: "Apsistojimų rezervacijos",
    description: "Peržiūrėkite laisvus laikus kalendoriuje ir rezervuokite apsistojimą savo augintiniui.",
    path: "/reservations"
  });
  const [range, setRange] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 14);
    const to = new Date(now);
    to.setDate(to.getDate() + 120);
    return { from, to };
  });

  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const mineRes = await api.get("/api/reservations/mine");
      setMine(mineRes.data.reservations || []);
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

  const events = useMemo(() => {
    const out = [];
    for (const r of mine) {
      if (r.status === "cancelled") continue;
      const title = r.status === "confirmed" ? "Mano apsistojimas (patvirtinta)" : "Mano apsistojimas";
      out.push({
        id: String(r._id),
        title,
        start: r.start,
        end: addOneDay(r.end),
        allDay: true,
        classNames:
          r.status === "confirmed"
            ? ["bg-slate-900", "border-slate-900", "text-white"]
            : ["bg-amber-600", "border-amber-600", "text-white"]
      });
    }
    return out;
  }, [mine]);

  async function submitStay(e) {
    e?.preventDefault?.();
    setSuccessMsg("");
    const cin = checkIn.trim();
    const cout = checkOut.trim();
    if (!cin || !cout) {
      setError("Pasirinkite atvykimo ir išvykimo datas.");
      return;
    }
    if (cin < todayYmd()) {
      setError("Atvykimas negali būti praeityje.");
      return;
    }
    if (cout <= cin) {
      setError("Išvykimo diena turi būti vėlesnė už atvykimo (paskutinė diena be nakvynės).");
      return;
    }

    setBooking(true);
    setError("");
    try {
      await api.post("/api/reservations/stay", {
        checkIn: cin,
        checkOut: cout,
        notes: notes || ""
      });
      setNotes("");
      setCheckIn("");
      setCheckOut("");
      setSuccessMsg("Užklausa išsiųsta. Galite matyti ją skiltyje „Mano apsistojimai“.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Nepavyko rezervuoti");
    } finally {
      setBooking(false);
    }
  }

  async function cancelReservation(reservationId) {
    setError("");
    setSuccessMsg("");
    try {
      await api.delete(`/api/reservations/${reservationId}`);
      await load();
      setSuccessMsg("Apsistojimas atšauktas.");
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko atšaukti");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="card overflow-hidden border-0 bg-gradient-to-br from-white/95 via-sky-50/40 to-rose-50/30 p-6 text-left ring-1 ring-sky-100/80">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="page-title">Apsistojimų rezervacijos</span>
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Užpildykite datas žemiau ir spauskite <strong>Siųsti užklausą</strong>. Kalendorius apačioje yra tik peržiūrai.
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={load} disabled={loading}>
            {loading ? "Kraunama..." : "Atnaujinti"}
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {successMsg ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {successMsg}
          </div>
        ) : null}

        <form className="mt-4 rounded-2xl border-2 border-rose-300/80 bg-white p-4 shadow-sm" onSubmit={submitStay}>
          <div className="text-base font-bold text-slate-900">1. Datos ir užklausa</div>
          <p className="mt-1 text-xs text-slate-600">
            Išvykimo data — pirmoji diena be nakvynės (pvz. viena naktis: atvykimas pirmadienis, išvykimas antradienis).
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="stay-checkin">
                Atvykimas
              </label>
              <input
                id="stay-checkin"
                type="date"
                className="input mt-1 block w-auto min-w-[11rem]"
                min={todayYmd()}
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  setCheckOut("");
                  setSuccessMsg("");
                }}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="stay-checkout">
                Išvykimas
              </label>
              <input
                id="stay-checkout"
                type="date"
                className="input mt-1 block w-auto min-w-[11rem]"
                min={checkIn ? nextDayYmd(checkIn) : todayYmd()}
                value={checkOut}
                disabled={!checkIn}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  setSuccessMsg("");
                }}
                required
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="stay-notes">
              Pastabos (nebūtina)
            </label>
            <textarea
              id="stay-notes"
              className="input mt-1 min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pvz. šuo nemėgsta triukšmo…"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={booking}>
              {booking ? "Siunčiama…" : "Siųsti užklausą"}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold text-slate-800">2. Kalendorius (tik peržiūra)</div>
          <div
            id="reservations-calendar"
            className="overflow-hidden rounded-2xl border border-sky-200/60 bg-white/70 p-2 shadow-inner shadow-sky-100/50"
          >
            <FullCalendar
              plugins={[dayGridPlugin]}
              locale={ltLocale}
              initialView="dayGridMonth"
              height="auto"
              firstDay={1}
              selectable={false}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,dayGridWeek"
              }}
              buttonText={{
                today: "Šiandien",
                month: "Mėnuo",
                week: "Savaitė"
              }}
              events={events}
              datesSet={(arg) => {
                const from = new Date(arg.start);
                from.setDate(from.getDate() - 14);
                const to = new Date(arg.end);
                to.setDate(to.getDate() + 60);
                setRange({ from, to });
              }}
            />
          </div>
        </div>
      </div>

      <div className="card border-0 bg-gradient-to-br from-violet-50/70 to-amber-50/40 p-6 text-left ring-1 ring-violet-100/70">
        <h2 className="text-lg font-bold text-slate-900">Mano apsistojimai</h2>
        <div className="mt-3 grid gap-2">
          {mine.length === 0 ? (
            <div className="rounded-xl border border-violet-200/60 bg-violet-50/60 p-4 text-sm text-slate-600">
              Kol kas neturite apsistojimų.
            </div>
          ) : (
            mine.map((r) => (
              <div
                key={r._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-rose-100/60"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {new Date(r.start).toLocaleDateString("lt-LT")} → {new Date(r.end).toLocaleDateString("lt-LT")}{" "}
                    (išvykimas)
                  </div>
                  <div className="text-xs text-slate-600">
                    Statusas:{" "}
                    <span className="font-medium text-slate-900">
                      {r.status === "pending"
                        ? "laukiama patvirtinimo"
                        : r.status === "confirmed"
                          ? "patvirtinta"
                          : "atšaukta"}
                    </span>
                  </div>
                </div>
                {r.status !== "cancelled" ? (
                  <button type="button" className="btn-ghost" onClick={() => cancelReservation(r._id)}>
                    Atšaukti
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
