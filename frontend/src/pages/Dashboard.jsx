import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

function resolveMediaUrl(url, version = "") {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/api\/?$/, "");
  const clean = `${base}${url.startsWith("/") ? "" : "/"}${url}`;
  return version ? `${clean}?v=${encodeURIComponent(String(version))}` : clean;
}

export function Dashboard() {
  const { user, refreshMe } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState("");

  const photos = useMemo(() => user?.photos || [], [user]);

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
      setError(e?.response?.data?.message || "Nepavyko ikelti nuotraukos");
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
      setError(e?.response?.data?.message || "Nepavyko istrinti nuotraukos");
    } finally {
      setDeleting("");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="card overflow-hidden border-0 bg-gradient-to-br from-white/95 to-sky-50/50 p-6 text-left ring-1 ring-sky-100/80">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="page-title">Augintinio profilis</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Cia galite ikelti suniuko nuotraukas ir matyti jas savo profilyje.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="btn-primary cursor-pointer">
            {busy ? "Ikeliama..." : "Ikelti nuotrauka"}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => uploadPhoto(e.target.files?.[0])}
            />
          </label>
          <div className="text-sm text-slate-600">
            Vartotojas: <span className="font-medium text-slate-900">{user?.name}</span>
          </div>
        </div>

        {error ? <div className="mt-3 error">{error}</div> : null}
      </div>

      <div className="card border-0 bg-gradient-to-br from-rose-50/80 to-amber-50/40 p-6 text-left ring-1 ring-rose-100/60">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Nuotraukos</h2>
          <div className="text-xs text-slate-500">{photos.length} vnt.</div>
        </div>

        {photos.length === 0 ? (
          <div className="mt-4 rounded-xl border border-sky-200/60 bg-sky-50/80 p-4 text-sm text-slate-600">
            Kol kas nuotrauku nera.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((p) => (
              <div
                key={p.url}
                className="group relative overflow-hidden rounded-2xl bg-white ring-2 ring-rose-100/80 shadow-sm transition hover:ring-rose-200"
              >
                <a href={resolveMediaUrl(p.url, p.uploadedAt || p.filename || p.url)} target="_blank" rel="noreferrer">
                  <img
                    src={resolveMediaUrl(p.url, p.uploadedAt || p.filename || p.url)}
                    alt={p.filename}
                    className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </a>
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded-xl bg-white/90 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 backdrop-blur hover:bg-rose-50"
                  onClick={() => deletePhoto(p.filename)}
                  disabled={deleting === p.filename}
                  title="Ištrinti nuotrauką"
                >
                  {deleting === p.filename ? "Trinama..." : "Ištrinti"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
