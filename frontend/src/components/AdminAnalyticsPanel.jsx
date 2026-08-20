import { useEffect, useState } from "react";
import { api } from "../lib/api";

function formatDateKey(dateKey) {
  try {
    const [y, m, d] = String(dateKey).split("-");
    return `${d}.${m}.${y}`;
  } catch {
    return dateKey;
  }
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-sand-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-navy-800/50">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-navy-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-navy-800/55">{hint}</div> : null}
    </div>
  );
}

function MiniBars({ series }) {
  const last14 = (series || []).slice(-14);
  const max = Math.max(1, ...last14.map((s) => s.uniqueVisitors || 0));
  return (
    <div className="mt-3">
      <div className="mb-2 text-xs font-semibold text-navy-800/70">Unikalūs lankytojai · paskutinės 14 d.</div>
      <div className="flex h-28 items-end gap-1">
        {last14.map((s) => {
          const h = Math.max(4, Math.round(((s.uniqueVisitors || 0) / max) * 100));
          return (
            <div key={s.dateKey} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-md bg-skyyard-500"
                style={{ height: `${h}%` }}
                title={`${formatDateKey(s.dateKey)}: ${s.uniqueVisitors} lankyt., ${s.pageViews} peržiūrų`}
              />
              <div className="text-[9px] text-navy-800/40">{String(s.dateKey).slice(8)}</div>
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

  return (
    <div className="card p-6 text-left">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy-800">Svetainės lankomumas ir augimas</h2>
          <p className="mt-1 text-sm text-navy-800/65">
            Kiek žmonių apsilanko, kiek užsiregistruoja ir kaip pritraukti daugiau.
          </p>
        </div>
        <button className="btn-ghost" type="button" onClick={load} disabled={loading}>
          {loading ? "Kraunama..." : "Atnaujinti statistiką"}
        </button>
      </div>

      {!data && loading ? <div className="mt-4 text-sm text-navy-800/50">Kraunama statistika...</div> : null}

      {data ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Šiandien · lankytojai"
              value={data.today.uniqueVisitors}
              hint={`${data.today.pageViews} puslapio peržiūrų`}
            />
            <StatCard
              label="7 d. · vid. lankytojų / dieną"
              value={data.last7Days.avgUniqueVisitorsPerDay}
              hint={`${data.last7Days.uniqueVisitors} unikalių per savaitę`}
            />
            <StatCard
              label="Registruoti vartotojai"
              value={data.users.registeredTotal}
              hint={`+${data.users.registeredLast7Days} per 7 d.`}
            />
            <StatCard
              label="Viso peržiūrų"
              value={data.allTime.pageViews}
              hint={`${data.activity.pendingReservations} laukiančios rezervacijos`}
            />
          </div>

          <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
            <MiniBars series={data.series} />
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-navy-800">
                <thead>
                  <tr className="border-b border-sand-200 text-navy-800/50">
                    <th className="py-2 pr-3 font-semibold">Data</th>
                    <th className="py-2 pr-3 font-semibold">Lankytojai</th>
                    <th className="py-2 font-semibold">Peržiūros</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(data.series || [])]
                    .reverse()
                    .slice(0, 14)
                    .map((row) => (
                      <tr key={row.dateKey} className="border-b border-sand-100">
                        <td className="py-1.5 pr-3">{formatDateKey(row.dateKey)}</td>
                        <td className="py-1.5 pr-3 font-semibold text-navy-900">{row.uniqueVisitors}</td>
                        <td className="py-1.5">{row.pageViews}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-skyyard-50 p-4 ring-1 ring-skyyard-200">
            <h3 className="font-display text-base font-semibold text-navy-800">Kaip pritraukti daugiau žmonių</h3>
            <p className="mt-1 text-xs text-navy-800/55">Patarimai pagal dabartinius skaičius.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(data.tips || []).map((tip) => (
                <div key={tip.title} className="rounded-xl bg-white p-3 ring-1 ring-sand-200">
                  <div className="text-sm font-semibold text-navy-900">{tip.title}</div>
                  <div className="mt-1 text-sm text-navy-800/75">{tip.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Aktyvios rezervacijos" value={data.activity.activeReservations} />
            <StatCard label="Atviri pokalbiai" value={data.activity.openChats} />
            <StatCard label="Neskaitytos kontaktų žinutės" value={data.activity.unreadContactMessages} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
