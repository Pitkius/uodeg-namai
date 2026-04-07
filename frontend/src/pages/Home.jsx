import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const featureStyles = [
  "from-sky-100 to-cyan-50 ring-sky-200/80 text-sky-950",
  "from-amber-100 to-orange-50 ring-amber-200/80 text-amber-950",
  "from-rose-100 to-pink-50 ring-rose-200/80 text-rose-950",
  "from-violet-100 to-purple-50 ring-violet-200/80 text-violet-950"
];

export function Home() {
  const { isAuthed } = useAuth();

  function initials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const a = parts[0]?.[0] || "A";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }

  const testimonials = useMemo(
    () => [
    {
      name: "Milda",
      dog: "Luna",
      text: "Palikom nakčiai pirmą kartą - viskas buvo aišku, o šuniukas grįžo ramus. Tikrai rekomenduoju!",
      photo: "https://images.dog.ceo/breeds/terrier-american/n02093428_1641.jpg",
      rating: 9,
      accent: "from-emerald-400 to-teal-500"
    },
    {
      name: "Tomas",
      dog: "Rikis",
      text: "Patiko komunikacija ir tai, kad galima iš karto užsiregistruoti laikus kalendoriuje. Viskas sklandžiai.",
      photo: "https://images.dog.ceo/breeds/terrier-westhighland/n02098286_2454.jpg",
      rating: 8,
      accent: "from-sky-400 to-indigo-500"
    },
    {
      name: "Ieva",
      dog: "Moka",
      text: "Švaru, tvarkinga, o mūsų šunelis mėgo žaidimų laiką. Užsiregistruosime dar kartą.",
      photo: "https://images.dog.ceo/breeds/komondor/n02105505_3967.jpg",
      rating: 10,
      accent: "from-rose-400 to-orange-500"
    },

    // Nauji atsiliepimai (automatiškai rotuoja)
    {
      name: "Aistis Jankūnas",
      dog: "—",
      text: "Labai rūpestingai prižiūrėjo. Ačiū visai šeimai!",
      photo: "",
      rating: 10,
      accent: "from-rose-400 to-orange-500"
    },
    {
      name: "Rasa L",
      dog: "—",
      text: "Labai džiaugiuosi matydama, kad šuniukas labai noriai pasilieka pas šią prižiūrėtoją.",
      photo: "",
      rating: 10,
      accent: "from-sky-400 to-indigo-500"
    },
    {
      name: "Indrė",
      dog: "—",
      text: "Puikiai pasirūpino augintiniu. Drąsiai rekomenduoju!",
      photo: "",
      rating: 10,
      accent: "from-emerald-400 to-teal-500"
    },
    {
      name: "Saulė Bruklytė",
      dog: "—",
      text: "Ačiū už priežiūrą, viskas puiku. Labai rekomenduoju!",
      photo: "",
      rating: 10,
      accent: "from-violet-400 to-fuchsia-500"
    },
    {
      name: "Egidijus Montrim​as",
      dog: "—",
      text: "Labai puikiai pasirūpino mūsų augintiniu. Drąsiai galiu rekomenduoti.",
      photo: "",
      rating: 10,
      accent: "from-amber-400 to-orange-500"
    }
    ],
    []
  );

  const perPage = 3;
  const pages = Math.max(1, Math.ceil(testimonials.length / perPage));

  const [pageIndex, setPageIndex] = useState(0);
  const [anim, setAnim] = useState("in"); // 'in' | 'out'

  useEffect(() => {
    if (!testimonials.length) return;
    const everyMs = 6000;
    const outMs = 220;
    const id = setInterval(() => {
      setAnim("out");
      setTimeout(() => {
        setPageIndex((p) => (p + 1) % pages);
        setAnim("in");
      }, outMs);
    }, everyMs);
    return () => clearInterval(id);
  }, [pages, testimonials.length]);

  const visible = useMemo(() => {
    const start = pageIndex * perPage;
    const slice = testimonials.slice(start, start + perPage);
    if (slice.length === perPage) return slice;
    // jei paskutinis puslapis turi mažiau, užpildom nuo pradžios
    return slice.concat(testimonials.slice(0, perPage - slice.length));
  }, [pageIndex, testimonials, perPage]);

  const features = [
    { title: "Nakvynė", desc: "Patogūs laikai ir aiški rezervacija." },
    { title: "Maitinimas", desc: "Pagal tavo pastabas ir režimą." },
    { title: "Žaidimai", desc: "Ramina, užima ir padeda adaptuotis." },
    { title: "Nuotraukos", desc: "Viskas vienoje vietoje profilyje." }
  ];

  return (
    <div className="grid gap-10">
      <section className="card overflow-hidden border-0 bg-gradient-to-br from-rose-100/90 via-amber-50 to-sky-100/90 ring-2 ring-white/80">
        <div className="grid gap-6 p-6 md:grid-cols-2 md:items-center md:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-1.5 text-sm font-medium text-rose-800 shadow-sm ring-1 ring-rose-200/60">
              <span>Uodegų namai</span>
              <span className="text-slate-500">• be streso</span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Rezervuok{" "}
              <span className="page-title">nakvynę augintiniui</span>
            </h1>
            <p className="mt-3 text-slate-600">
              Pasirink laiką kalendoriuje, pridėk pastabas (jei reikia) ir po apsistojimo turėk
              savo šuniuko nuotraukas profilyje.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {isAuthed ? (
                <>
                  <Link className="btn-primary" to="/reservations">
                    Užsiregistruoti apsistojimui
                  </Link>
                  <Link className="btn-ghost" to="/dashboard">
                    Mano profilis
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn-primary" to="/register">
                    Registruotis
                  </Link>
                  <Link className="btn-ghost" to="/login">
                    Prisijungti
                  </Link>
                </>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`rounded-2xl bg-gradient-to-br p-4 ring-1 ${featureStyles[i]}`}
                >
                  <div className="text-sm font-bold">{f.title}</div>
                  <div className="mt-1 text-sm opacity-90">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-rose-600 to-orange-500 p-1 shadow-xl shadow-rose-400/30">
              <div className="rounded-[1.35rem] bg-white/10 p-6 text-white backdrop-blur-sm">
                <div className="text-sm font-medium text-white/90">Motelio paketas</div>
                <div className="mt-2 text-2xl font-bold">Nakvynė, maitinimas, žaidimai</div>
                <p className="mt-3 text-sm text-white/85">
                  Admin gali valdyti apsistojimo slotus ir patvirtinti užklausas, kad būtų tvarka
                  kalendoriuje.
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-white/15 p-4 ring-1 ring-white/25">
                    <div className="text-sm font-semibold">Greita registracija</div>
                    <div className="mt-1 text-sm text-white/85">
                      Matysi laisvus laikus ir išsirinksi sau tinkamiausią.
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-4 ring-1 ring-white/25">
                    <div className="text-sm font-semibold">Aiškus statusas</div>
                    <div className="mt-1 text-sm text-white/85">
                      Užklausa laukiama, o patvirtinta - iškart matysi.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-rose-50 p-4 shadow-sm">
              <div className="text-sm font-bold text-amber-950">Rekomendacija</div>
              <div className="mt-1 text-sm text-slate-700">
                Jei šunelis turi savo režimą ar poreikių, palik pastabas rezervuojant.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-center text-lg font-bold text-slate-800">Ką sako šeimininkai</h2>
        <div className="mx-auto w-full max-w-6xl">
          <div
            className={[
              "grid gap-4 md:grid-cols-3",
              "transition-all duration-300 will-change-transform will-change-opacity",
              anim === "in" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            ].join(" ")}
          >
            {visible.map((t, i) => (
              <div
                key={`${pageIndex}-${t.name}-${i}`}
                className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 text-left shadow-soft ring-1 ring-sky-100/60 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.accent} opacity-90`} />
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{t.name}</div>
                    {t.dog && t.dog !== "—" ? (
                      <div className="text-xs text-slate-600">Šuo: {t.dog}</div>
                    ) : (
                      <div className="text-xs text-slate-500">Atsiliepimas</div>
                    )}
                  </div>

                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-rose-200 bg-slate-100">
                    {t.photo ? (
                      <img src={t.photo} alt={`Nuotrauka: ${t.name}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${t.accent} text-sm font-extrabold text-white`}>
                        {initials(t.name)}
                      </div>
                    )}
                  </div>

                  <div className={`rounded-2xl bg-gradient-to-br px-3 py-1 text-sm font-bold text-white shadow-sm ${t.accent}`}>
                    {t.rating}/10
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{t.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-slate-500">
            <span>Puslapis {pageIndex + 1}/{pages}</span>
            <button
              type="button"
              className="rounded-xl px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              onClick={() => {
                setAnim("out");
                setTimeout(() => {
                  setPageIndex((p) => (p + 1) % pages);
                  setAnim("in");
                }, 180);
              }}
            >
              Kiti 3
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
