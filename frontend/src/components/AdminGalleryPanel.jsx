import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export function AdminGalleryPanel({ onError, onSuccess }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [caption, setCaption] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/gallery");
      setImages(res.data.images || []);
    } catch (e) {
      onError?.(e?.response?.data?.message || "Nepavyko užkrauti galerijos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadPhoto(file) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      if (caption.trim()) form.append("caption", caption.trim());
      await api.post("/api/gallery", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setCaption("");
      onSuccess?.("Nuotrauka įkelta į viešą galeriją");
      await load();
    } catch (e) {
      onError?.(e?.response?.data?.message || "Nepavyko įkelti nuotraukos");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage(id) {
    if (!id) return;
    if (!window.confirm("Ištrinti šią nuotrauką iš viešos galerijos?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/gallery/${id}`);
      onSuccess?.("Nuotrauka ištrinta");
      await load();
    } catch (e) {
      onError?.(e?.response?.data?.message || "Nepavyko ištrinti nuotraukos");
    } finally {
      setDeleting("");
    }
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-card ring-1 ring-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand-100 bg-gradient-to-r from-sand-50 to-white px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy-800">Vieša galerija</h2>
          <p className="mt-0.5 text-sm text-navy-800/55">
            Nuotraukos matomos visiems puslapyje{" "}
            <Link className="font-semibold text-skyyard-600 underline-offset-2 hover:underline" to="/galerija">
              /galerija
            </Link>
          </p>
        </div>
        <button type="button" className="btn-ghost bg-white text-sm" onClick={load} disabled={loading}>
          {loading ? "Kraunama…" : "Atnaujinti"}
        </button>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-navy-800/45">Parašas (nebūtina)</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-sand-300 bg-sand-50/50 px-3 py-2.5 text-sm text-navy-900 outline-none ring-skyyard-300 focus:bg-white focus:ring-2"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Pvz. Reksas · vasara"
              maxLength={200}
            />
          </label>
          <label className="btn-primary cursor-pointer whitespace-nowrap">
            {busy ? "Įkeliama…" : "Įkelti nuotrauką"}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                uploadPhoto(f);
              }}
            />
          </label>
        </div>

        {loading && images.length === 0 ? (
          <div className="rounded-2xl bg-skyyard-50/80 px-4 py-8 text-center text-sm text-navy-800/60">Kraunama…</div>
        ) : images.length === 0 ? (
          <div className="rounded-2xl bg-skyyard-50/80 px-4 py-8 text-center text-sm text-navy-800/60 ring-1 ring-skyyard-100">
            Dar nėra galerijos nuotraukų — įkelkite pirmąją.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((img) => (
              <li key={img._id} className="overflow-hidden rounded-2xl bg-sand-50 ring-1 ring-sand-200">
                <div className="aspect-[4/3] overflow-hidden bg-sand-100">
                  <img src={img.url} alt={img.caption || ""} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-navy-900">
                      {img.caption || "Be parašo"}
                    </div>
                    <div className="text-[11px] text-navy-800/40">
                      {img.createdAt ? new Date(img.createdAt).toLocaleDateString("lt-LT") : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    disabled={deleting === img._id}
                    onClick={() => deleteImage(img._id)}
                  >
                    {deleting === img._id ? "…" : "Trinti"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
