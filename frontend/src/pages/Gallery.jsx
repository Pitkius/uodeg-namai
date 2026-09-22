import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";

export function Gallery() {
  useSeo({
    title: "Galerija",
    description: "Nuotraukos iš Uodegų namų — mūsų svečiai ir dienos kieme Mažeikiuose.",
    path: "/galerija"
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/api/gallery");
        if (!cancelled) setImages(res.data.images || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || "Nepavyko užkrauti galerijos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    function onKey(e) {
      if (e.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-skyyard-100/70 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-1 pb-12 pt-4 sm:px-0 sm:pb-16 sm:pt-6">
        <header className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-skyyard-500">Uodegų namai</p>
          <h1 className="page-title mt-1 text-3xl font-semibold sm:text-4xl md:text-5xl">Galerija</h1>
          <p className="mt-3 text-sm text-navy-800/65 sm:text-base">
            Akimirkos iš mūsų kiemo — šunys, kurie čia viešėjo. Nuotraukas kelia tik komanda.
          </p>
        </header>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="mt-10 text-sm text-navy-800/55">Kraunama…</div>
        ) : images.length === 0 ? (
          <div className="mt-10 rounded-[1.5rem] bg-white/80 px-6 py-14 text-center shadow-card ring-1 ring-sand-200">
            <p className="font-display text-xl font-semibold text-navy-800">Kol kas tuščia</p>
            <p className="mt-2 text-sm text-navy-800/60">Netrukus čia atsiras nuotraukų iš viešnagės.</p>
          </div>
        ) : (
          <ul className="mt-8 columns-1 gap-3 sm:columns-2 sm:gap-4 lg:columns-3">
            {images.map((img) => (
              <li key={img._id} className="mb-3 break-inside-avoid sm:mb-4">
                <button
                  type="button"
                  className="group block w-full overflow-hidden rounded-2xl bg-sand-100 text-left shadow-sm ring-1 ring-sand-200/80 transition hover:shadow-md"
                  onClick={() => setActive(img)}
                >
                  <img
                    src={img.url}
                    alt={img.caption || "Galerijos nuotrauka"}
                    className="w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  {img.caption ? (
                    <div className="bg-white/95 px-3 py-2 text-sm text-navy-800/75">{img.caption}</div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Nuotraukos peržiūra"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-navy-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-navy-900 shadow"
              onClick={() => setActive(null)}
              aria-label="Uždaryti"
            >
              ×
            </button>
            <img
              src={active.url}
              alt={active.caption || "Galerijos nuotrauka"}
              className="max-h-[85vh] w-full object-contain"
            />
            {active.caption ? (
              <p className="bg-navy-900 px-4 py-3 text-center text-sm text-sand-100">{active.caption}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
