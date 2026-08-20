import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import ltLocale from "@fullcalendar/core/locales/lt";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";

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

function formatLt(ymdOrDate) {
  const d = typeof ymdOrDate === "string" ? parseYmdLocal(ymdOrDate) : new Date(ymdOrDate);
  if (!d) return "";
  return d.toLocaleDateString("lt-LT", { year: "numeric", month: "short", day: "numeric" });
}

function YardDecor() {
  return (
    <svg
      className="pointer-events-none absolute -right-2 -top-4 h-28 w-44 text-skyyard-300 opacity-90 md:h-32 md:w-52"
      viewBox="0 0 220 130"
      fill="none"
      aria-hidden
    >
      <circle cx="178" cy="28" r="18" fill="#F5D76E" opacity="0.95" />
      <circle cx="178" cy="28" r="26" stroke="#F5D76E" strokeWidth="2" opacity="0.35" />
      <path d="M12 98h196" stroke="#C4A882" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path
        d="M28 98V72h18v26M52 98V68h18v30M76 98V74h18v24M100 98V70h18v28"
        stroke="#E8DFD0"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M132 98V58c0-2 2-4 4-4h36c2 0 4 2 4 4v40"
        fill="#4A90C2"
        opacity="0.85"
      />
      <path d="M128 58h52l-6-10H134l-6 10Z" fill="#1A2B56" opacity="0.9" />
      <circle cx="154" cy="78" r="7" fill="#E3F0F9" />
      <path d="M150 78h8M154 74v8" stroke="#1A2B56" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="48" cy="48" rx="22" ry="10" fill="white" opacity="0.7" />
      <ellipse cx="78" cy="36" rx="16" ry="8" fill="white" opacity="0.55" />
    </svg>
  );
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

  const minCheckIn = todayYmd();
  const minCheckOut = checkIn ? nextDayYmd(checkIn) : nextDayYmd(minCheckIn);

  function onCheckInChange(value) {
    setSuccessMsg("");
    setError("");
    if (!value) {
      setCheckIn("");
      setCheckOut("");
      return;
    }
    const safeIn = value < minCheckIn ? minCheckIn : value;
    setCheckIn(safeIn);
    setCheckOut((prev) => {
      if (!prev) return "";
      const earliestOut = nextDayYmd(safeIn);
      return prev < earliestOut ? "" : prev;
    });
    if (value < minCheckIn) {
      setError("Atvykimas negali būti praeityje — pasirinkta šiandienos data.");
    }
  }

  function onCheckOutChange(value) {
    setSuccessMsg("");
    setError("");
    if (!value) {
      setCheckOut("");
      return;
    }
    if (!checkIn) {
      setCheckOut("");
      setError("Pirmiausia pasirinkite atvykimo datą.");
      return;
    }
    const earliestOut = nextDayYmd(checkIn);
    if (value < earliestOut) {
      setCheckOut("");
      setError(
        `Išvykimas turi būti vėliau nei atvykimas (${checkIn}). Ankščiausia galima data: ${earliestOut}.`
      );
      return;
    }
    setCheckOut(value);
  }

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
      const confirmed = r.status === "confirmed";
      const label = confirmed ? "Nakvynė" : "Laukia";
      out.push({
        id: String(r._id),
        title: label,
        start: r.start,
        end: addOneDay(r.end),
        allDay: true,
        display: "block",
        classNames: [confirmed ? "fc-stay-confirmed" : "fc-stay-pending"]
      });
    }
    return out;
  }, [mine]);

  const activeStays = useMemo(
    () => mine.filter((r) => r.status === "pending" || r.status === "confirmed"),
    [mine]
  );

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
      setError(
        `Išvykimas negali būti anksčiau ar tą pačią dieną kaip atvykimas (${cin}). Pasirinkite bent ${nextDayYmd(cin)}.`
      );
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

  function onDateClick(arg) {
    const ymd = arg.dateStr;
    if (ymd < minCheckIn) {
      setError("Negalima rinktis praėjusių datų.");
      return;
    }
    onCheckInChange(ymd);
    setSuccessMsg("");
    const form = document.getElementById("new-stay-form");
    form?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="min-h-[70vh] bg-[linear-gradient(180deg,#E8F4FC_0%,#FBF8F2_42%,#FBF8F2_100%)] px-0 pb-8 pt-1 sm:-mx-0 sm:rounded-[1.75rem] sm:px-4 sm:pb-10 sm:pt-4 md:px-6 md:pt-6">
      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
        <div className="relative z-10 max-w-xl pr-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-skyyard-500">Sunny Yard</p>
          <h1 className="page-title mt-1 text-2xl font-semibold sm:text-3xl md:text-4xl">Apsistojimų kalendorius</h1>
          <p className="mt-2 text-sm text-navy-800/65">
            <span className="lg:hidden">Užpildykite formą arba pasirinkite datą kalendoriuje.</span>
            <span className="hidden lg:inline">Spustelėkite datą kalendoriuje arba užpildykite formą dešinėje.</span>
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <button type="button" className="btn-ghost bg-white/80 !px-3 !py-2 text-sm" onClick={load} disabled={loading}>
            {loading ? "Kraunama..." : "Atnaujinti"}
          </button>
        </div>
        <div className="pointer-events-none absolute -right-1 -top-2 hidden md:block">
          <YardDecor />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {successMsg ? (
        <div className="mb-4 rounded-2xl border border-skyyard-200 bg-white px-4 py-3 text-sm text-navy-800 shadow-sm">
          {successMsg}
        </div>
      ) : null}

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Form first on mobile */}
        <div className="order-1 grid gap-4 lg:order-2">
          <form
            id="new-stay-form"
            className="rounded-[1.35rem] bg-white p-4 shadow-[0_12px_40px_-18px_rgba(26,43,86,0.2)] ring-1 ring-white sm:rounded-[1.5rem] sm:p-5"
            onSubmit={submitStay}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-skyyard-100 text-skyyard-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-navy-800">Nauja rezervacija</h2>
                <p className="text-xs text-navy-800/50">Išvykimas — kita diena po atvykimo ar vėliau</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3.5">
              <div>
                <label className="label" htmlFor="stay-checkin">
                  Atvykimo data
                </label>
                <input
                  id="stay-checkin"
                  type="date"
                  className="input mt-1.5 border-sand-200 bg-sand-50/80"
                  min={minCheckIn}
                  value={checkIn}
                  onChange={(e) => onCheckInChange(e.target.value)}
                  onBlur={(e) => onCheckInChange(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="stay-checkout">
                  Išvykimo data
                </label>
                <input
                  id="stay-checkout"
                  type="date"
                  className="input mt-1.5 border-sand-200 bg-sand-50/80 disabled:opacity-50"
                  min={minCheckOut}
                  value={checkOut}
                  disabled={!checkIn}
                  onChange={(e) => onCheckOutChange(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value) onCheckOutChange(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="stay-notes">
                  Pastabos (nebūtina)
                </label>
                <textarea
                  id="stay-notes"
                  className="input mt-1.5 min-h-[4.5rem] border-sand-200 bg-sand-50/80"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pvz. šuo nemėgsta triukšmo…"
                />
              </div>
              <button type="submit" className="btn-sky mt-1 w-full py-3 text-base" disabled={booking}>
                {booking ? "Siunčiama…" : "Siųsti užklausą"}
              </button>
            </div>
          </form>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-18px_rgba(26,43,86,0.2)] ring-1 ring-white">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-tan-200/60 text-navy-800">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M5 7h14l-1 13H6L5 7Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h2 className="font-display text-lg font-semibold text-navy-800">Mano apsistojimai</h2>
            </div>

            <div className="mt-4 grid gap-2.5">
              {activeStays.length === 0 ? (
                <div className="rounded-2xl bg-skyyard-50/80 px-4 py-5 text-center text-sm text-navy-800/60 ring-1 ring-skyyard-100">
                  Kol kas neturite apsistojimų.
                  <div className="mt-1 text-xs text-navy-800/45">Pasirinkite datas ir išsiųskite užklausą.</div>
                </div>
              ) : (
                activeStays.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 rounded-2xl bg-sand-50/90 p-3 ring-1 ring-sand-200/80 transition hover:bg-white hover:shadow-sm"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-skyyard-100 text-skyyard-500 ring-2 ring-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="13" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="7" cy="8.5" r="1.4" fill="currentColor" />
                        <circle cx="17" cy="8.5" r="1.4" fill="currentColor" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-navy-900">
                        {formatLt(r.start)} → {formatLt(r.end)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            r.status === "confirmed"
                              ? "bg-skyyard-100 text-skyyard-500"
                              : "bg-tan-200 text-navy-900"
                          ].join(" ")}
                        >
                          {r.status === "confirmed" ? "Patvirtinta" : "Laukianti"}
                        </span>
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-navy-800/45 hover:text-navy-800"
                          onClick={() => cancelReservation(r._id)}
                        >
                          Atšaukti
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-skyyard-100/80 px-4 py-4 text-center text-sm text-navy-800/70 ring-1 ring-skyyard-200/60">
            <p className="font-display text-[15px] italic text-navy-800">
              Čia gera kaip namuose
            </p>
            <p className="mt-1 text-xs text-navy-800/50">Uodegų namai · Sunny Yard</p>
          </div>
        </div>

        {/* Calendar — second on mobile, first on desktop */}
        <div className="order-2 min-w-0 overflow-hidden rounded-[1.35rem] bg-white/95 p-3 shadow-[0_18px_50px_-24px_rgba(26,43,86,0.28)] ring-1 ring-skyyard-100/80 sm:rounded-[1.75rem] sm:p-4 md:p-6 lg:order-1 lg:p-7">
          <div id="reservations-calendar" className="sunny-calendar">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              locale={ltLocale}
              initialView="dayGridMonth"
              height="auto"
              firstDay={1}
              selectable={false}
              dateClick={onDateClick}
              headerToolbar={{
                left: "prev,next",
                center: "title",
                right: "today"
              }}
              buttonText={{
                today: "Šiandien"
              }}
              events={events}
              eventDisplay="block"
              dayMaxEvents={2}
              eventMinHeight={24}
              eventContent={(arg) => (
                <div className="fc-stay-inner">
                  {arg.isStart ? (
                    <>
                      <span className="fc-stay-paw" aria-hidden>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 19c-3.2 0-5.8-2.1-5.8-5.2 0-2.2 1.3-3.6 2.6-4.5.4-.3.7-.8.6-1.3-.2-1.1.5-2.1 1.5-2.3.7-.1 1.3.2 1.7.7.4-.5 1-.8 1.7-.7 1 .2 1.7 1.2 1.5 2.3-.1.5.2 1 .6 1.3 1.3.9 2.6 2.3 2.6 4.5 0 3.1-2.6 5.2-5.8 5.2Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                          <circle cx="9.2" cy="12.2" r="0.85" fill="currentColor" />
                          <circle cx="14.8" cy="12.2" r="0.85" fill="currentColor" />
                        </svg>
                      </span>
                      <span className="fc-stay-label">{arg.event.title}</span>
                    </>
                  ) : (
                    <span className="fc-stay-continue" aria-hidden />
                  )}
                </div>
              )}
              datesSet={(arg) => {
                const from = new Date(arg.start);
                from.setDate(from.getDate() - 14);
                const to = new Date(arg.end);
                to.setDate(to.getDate() + 60);
                setRange({ from, to });
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-sand-100/90 pt-3 text-xs text-navy-800/70 sm:mt-5 sm:pt-4">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-8 rounded-full bg-gradient-to-b from-[#E7F3FB] to-[#D5EAF7] shadow-sm ring-1 ring-[#BFDFF2]" />
              Patvirtinta
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-8 rounded-full bg-gradient-to-b from-[#F8EDE1] to-[#F0DFC8] shadow-sm ring-1 ring-[#E5D0B5]" />
              Laukianti
            </span>
            <span className="w-full text-navy-800/45 sm:w-auto">· Spustelėkite datą naujai rezervacijai</span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center font-display text-sm italic text-navy-800/45 sm:mt-8">
        Jūsų augintinis atostogaus, kol jūs ilsėsitės
      </p>
    </div>
  );
}
