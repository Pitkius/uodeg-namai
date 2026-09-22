import { useEffect, useState } from "react";
import { api } from "../lib/api";

function formatDateKey(dateKey) {
  try {
    const [y, m, d] = String(dateKey).split("-");
    return `${d}.${m}`;
  } catch {
    return dateKey;
  }
}

function MetricCard({ icon, label, value, hint, accent = "sky" }) {
  const accents = {
    sky: "from-skyyard-50 to-white ring-skyyard-100",
    sand: "from-sand-50 to-white ring-sand-200",
    navy: "from-navy-800/5 to-white ring-sand-200"
  };
  return (
    <div className={`rounded-[1.35rem] bg-gradient-to-br p-4 shadow-card ring-1 sm:p-5 ${accents[accent]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-skyyard-500 shadow-sm ring-1 ring-sand-200">
          {icon}
        </div>
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-800/45">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold text-navy-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-navy-800/55">{hint}</div> : null}
    </div>
  );
}

function MiniBars({ series }) {
  const last7 = (series || []).slice(-7);
  const max = Math.max(1, ...last7.map((s) => s.uniqueVisitors || 0));
  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-navy-800/70">Lankytojai · 7 d.</div>
        <div className="text-[11px] text-navy-800/40">Unikalūs / dieną</div>
      </div>
      <div className="flex h-32 items-end gap-1.5 sm:gap-2">
        {last7.map((s) => {
          const h = Math.max(8, Math.round(((s.uniqueVisitors || 0) / max) * 100));
          return (
            <div key={s.dateKey} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className="w-full max-w-[2rem] rounded-t-xl bg-gradient-to-t from-skyyard-500 to-skyyard-300"
                style={{ height: `${h}%` }}
                title={`${formatDateKey(s.dateKey)}: ${s.uniqueVisitors}`}
              />
              <div className="text-[10px] font-medium text-navy-800/45">{formatDateKey(s.dateKey)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminAnalyticsPanel({ onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/analytics/admin/summary");
      setData(res.data);
    } catch (e) {
      onError?.(e?.response?.data?.message || "Nepavyko užkrauti statistikos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data && loading) {
    return (
      <div className="rounded-[1.5rem] bg-white/90 p-6 text-sm text-navy-800/50 shadow-card ring-1 ring-white">
        Kraunama statistika...
      </div>
    );
  }

  if (!data) return null;

  const tip = (data.tips || [])[0];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="sky"
          label="Šiandien lankytojai"
          value={data.today.uniqueVisitors}
          hint={`${data.today.pageViews} peržiūrų`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 19V9l8-5 8 5v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 19v-6h6v6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          }
        />
        <MetricCard
          accent="sand"
          label="Registracijos · 7 d."
          value={data.users.registeredLast7Days}
          hint={`${data.users.registeredTotal} iš viso`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M5 19c1.5-3.2 4-4.8 7-4.8S17.5 15.8 19 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
        />
        <MetricCard
          accent="navy"
          label="Aktyvios rezervacijos"
          value={data.activity.activeReservations}
          hint={`${data.activity.pendingReservations} laukia patvirtinimo`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          }
        />
        <MetricCard
          accent="sky"
          label="Atviri pokalbiai"
          value={data.activity.openChats}
          hint={`${data.activity.unreadContactMessages} naujos kontaktų žinutės`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 6h14v10H8l-3 3V6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-card ring-1 ring-white sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-navy-800">Lankomumo apžvalga</h2>
              <p className="mt-1 text-sm text-navy-800/55">Kasdieniai unikalūs lankytojai</p>
            </div>
            <button className="btn-ghost !px-3 !py-2 text-xs" type="button" onClick={load} disabled={loading}>
              {loading ? "..." : "Atnaujinti"}
            </button>
          </div>
          <MiniBars series={data.series} />
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs text-navy-800">
              <thead>
                <tr className="border-b border-sand-100 text-navy-800/40">
                  <th className="py-2 pr-3 font-semibold">Data</th>
                  <th className="py-2 pr-3 font-semibold">Lankytojai</th>
                  <th className="py-2 font-semibold">Peržiūros</th>
                </tr>
              </thead>
              <tbody>
                {[...(data.series || [])]
                  .reverse()
                  .slice(0, 7)
                  .map((row) => (
                    <tr key={row.dateKey} className="border-b border-sand-50">
                      <td className="py-1.5 pr-3">{formatDateKey(row.dateKey)}</td>
                      <td className="py-1.5 pr-3 font-semibold text-navy-900">{row.uniqueVisitors}</td>
                      <td className="py-1.5">{row.pageViews}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] bg-skyyard-100 p-5 ring-1 ring-skyyard-200 sm:p-6">
          <div className="pointer-events-none absolute -bottom-8 -right-6 h-28 w-28 rounded-full bg-skyyard-200/50" />
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-skyyard-500">Augimo patarimas</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-navy-800">
            {tip?.title || "Skatinkite ankstyvas rezervacijas"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-navy-800/75">
            {tip?.body ||
              "Priminkite klientams rezervuoti iš anksto — taip mažiau tuščių dienų ir greitesnis planavimas."}
          </p>
          <div className="mt-5 grid gap-2">
            {(data.tips || []).slice(0, 3).map((t, i) => (
              <div key={t.title} className="rounded-xl bg-white/80 px-3 py-2 text-xs text-navy-800 ring-1 ring-white">
                <span className="font-semibold text-skyyard-500">0{i + 1}</span> · {t.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
