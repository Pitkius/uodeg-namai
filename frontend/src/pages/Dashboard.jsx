import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useSeo } from "../lib/seo";
import { AuthImage } from "../components/AuthImage";

export function Dashboard() {
  const { user, refreshMe } = useAuth();
  useSeo({
    title: "Augintinio profilis",
    description: "Įkelkite augintinio nuotraukas, valdykite profilį ir peržiūrėkite paskyros informaciją.",
    path: "/dashboard"
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState("");

  const photos = useMemo(() => user?.photos || [], [user]);
  const firstName = user?.name ? String(user.name).split(" ")[0] : "";

  async function uploadPhoto(file) {
    setError("");
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      await api.post("/api/uploads/photo", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await refreshMe();
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko įkelti nuotraukos");
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(filename) {
    if (!filename) return;
    setError("");
    setDeleting(filename);
    try {
      await api.delete(`/api/uploads/photo/${encodeURIComponent(filename)}`);
      await refreshMe();
    } catch (e) {
      setError(e?.response?.data?.message || "Nepavyko ištrinti nuotraukos");
    } finally {
      setDeleting("");
    }
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      <div className="card relative overflow-hidden p-4 text-left sm:p-6 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 hidden h-40 w-40 rounded-full bg-skyyard-100/80 sm:block" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-skyyard-100 text-tan-400 ring-1 ring-skyyard-200">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                  <path
                    d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-skyyard-500">Sunny Yard</p>
                <h1 className="page-title text-2xl font-semibold sm:text-3xl md:text-4xl">
                  Labas{firstName ? `, ${firstName}` : ""}!
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-lg text-sm text-navy-800/65">
              Čia — tavo augintinio profilis: įkelk nuotraukas ir turėk viską vienoje vietoje.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <label className="btn-primary w-full cursor-pointer sm:w-auto">
                {busy ? "Įkeliama..." : "Įkelti nuotrauką"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => uploadPhoto(e.target.files?.[0])}
                />
              </label>
              <Link className="btn-ghost w-full sm:w-auto" to="/reservations">
                Nauja rezervacija
              </Link>
            </div>
            {error ? <div className="mt-3 error">{error}</div> : null}
          </div>
          <div className="w-full rounded-2xl bg-skyyard-50 px-4 py-3 text-sm text-navy-800 ring-1 ring-skyyard-200 sm:w-auto sm:max-w-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-skyyard-500">Paskyra</div>
            <div className="mt-1 break-words font-semibold">{user?.name}</div>
            <div className="break-all text-navy-800/60">{user?.email}</div>
          </div>
        </div>
      </div>

      <div className="card p-4 text-left sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-navy-800 sm:text-xl">Nuotraukos iš Sunny Yard</h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-skyyard-500" aria-hidden>
              <path
                d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="text-xs font-medium text-navy-800/50">{photos.length} vnt.</div>
        </div>

        {photos.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-sand-50 p-6 text-center text-sm text-navy-800/65 ring-1 ring-sand-200">
            Kol kas nuotraukų nėra. Įkelk pirmąją — ji atsiras čia.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <div
                key={p.url}
                className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-sand-200 transition hover:ring-skyyard-300 sm:rounded-2xl"
              >
                <AuthImage
                  src={p.url}
                  version={p.uploadedAt || p.filename || p.url}
                  alt={p.filename}
                  className="h-32 w-full object-cover sm:h-40 md:h-44"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-semibold text-navy-800 opacity-100 shadow-sm ring-1 ring-sand-200 transition sm:right-2 sm:top-2 sm:px-3 sm:text-xs md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => deletePhoto(p.filename)}
                  disabled={deleting === p.filename}
                >
                  {deleting === p.filename ? "..." : "Ištrinti"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
