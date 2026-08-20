import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";

const CONTACT_PHONE_DISPLAY = "+370 620 33487";
const CONTACT_PHONE_TEL = "+37062033487";

function LeafDecor({ className = "", flip = false }) {
  return (
    <svg
      className={className}
      width="140"
      height="200"
      viewBox="0 0 140 200"
      fill="none"
      aria-hidden
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M70 12C42 38 24 68 20 98c-5 34 12 62 36 82 8-26 22-48 42-64 18-16 38-28 42-32-14-26-40-50-70-72Z"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.45"
      />
      <path d="M32 108c22-10 44-10 66 4" stroke="currentColor" strokeWidth="1.1" opacity="0.35" />
      <path d="M48 72c14-6 28-4 40 6" stroke="currentColor" strokeWidth="1" opacity="0.28" />
    </svg>
  );
}

function HeartIcon({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const steps = [
  {
    title: "Užklausa",
    desc: "Parašykite mums dėl norimų datų.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    title: "Susipažinimas",
    desc: "Susitikimas ir aplinkos apžiūra.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="11" r="1.4" fill="currentColor" />
      </svg>
    )
  },
  {
    title: "Rezervacija",
    desc: "Patvirtiname datas ir suderiname.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 14.5v3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    title: "Atostogos",
    desc: "Augintinis mėgaujasi, jūs keliaujate ramiai.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="13" r="5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7" cy="8" r="1.6" fill="currentColor" />
        <circle cx="17" cy="8" r="1.6" fill="currentColor" />
        <circle cx="5.5" cy="12" r="1.4" fill="currentColor" />
        <circle cx="18.5" cy="12" r="1.4" fill="currentColor" />
      </svg>
    )
  }
];

const faqs = [
  {
    q: "Kaip rezervuoti nakvynę?",
    a: "Sukurkite paskyrą, pasirinkite datas kalendoriuje ir išsiųskite užklausą. Patvirtinsime kuo greičiau."
  },
  {
    q: "Ar reikia atvykti iš anksto?",
    a: "Taip — rekomenduojame trumpą susipažinimą, kad augintiniui būtų ramiau."
  },
  {
    q: "Ką reikia atsivežti?",
    a: "Maistą, antkaklį/pavadėlį ir pastabas apie režimą. Lovytę ar žaislus — pagal pageidavimą."
  }
];

export function Home() {
  const { isAuthed } = useAuth();
  useSeo({
    title: "Gyvūnų viešbutis ir nakvynė augintiniams",
    description:
      "Gyvūnų viešbutis Uodegų namai: patikima augintinių nakvynė ir priežiūra. Registruokite apsistojimą internetu.",
    path: "/"
  });

  const testimonials = useMemo(
    () => [
      {
        name: "Rūta",
        dog: "Lokis",
        text: "Palikom pirmą kartą — viskas buvo aišku, o Lokis grįžo ramus ir laimingas. Tikrai kaip namie.",
        photo: "https://images.dog.ceo/breeds/retriever-golden/n02099601_3414.jpg"
      },
      {
        name: "Tomas",
        dog: "Rikis",
        text: "Patiko komunikacija ir tai, kad datas galima rezervuoti kalendoriuje. Viskas sklandžiai.",
        photo: "https://images.dog.ceo/breeds/labrador/n02099712_7410.jpg"
      },
      {
        name: "Ieva",
        dog: "Moka",
        text: "Švaru, tvarkinga, daug dėmesio. Moka mėgo žaidimų laiką — užsiregistruosime dar kartą.",
        photo: "https://images.dog.ceo/breeds/corgi-cardigan/n02113186_1030.jpg"
      }
    ],
    []
  );

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  async function submitContactForm(e) {
    e.preventDefault();
    setContactError("");
    setContactSuccess("");
    setContactLoading(true);
    try {
      await api.post("/api/contact", {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        message: contactMessage
      });
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setContactMessage("");
      setContactSuccess("Ačiū! Žinutė išsiųsta. Susisieksime netrukus.");
    } catch (err) {
      setContactError(err?.response?.data?.message || "Nepavyko išsiųsti žinutės.");
    } finally {
      setContactLoading(false);
    }
  }

  const datesHref = isAuthed ? "/reservations" : "/register";

  return (
    <div className="overflow-x-hidden bg-sand-50">
      {/* HERO */}
      <section className="relative min-h-[min(88vh,780px)] w-full sm:min-h-[min(92vh,860px)]">
        <img
          src="/hero-sunny-yard.jpg"
          alt="Augintiniai žaidžia saulėtame kieme"
          className="absolute inset-0 h-full w-full object-cover object-[center_35%] sm:object-[center_40%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(19,33,68,0.55)_0%,rgba(19,33,68,0.18)_42%,rgba(19,33,68,0.08)_70%,rgba(19,33,68,0.45)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,33,68,0.12)_0%,transparent_35%,rgba(19,33,68,0.55)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[min(88vh,780px)] max-w-6xl flex-col justify-end px-4 pb-24 pt-24 sm:min-h-[min(92vh,860px)] sm:pb-32 sm:pt-28 md:pb-40">
          <div className="max-w-xl animate-[fadeUp_0.75s_ease-out]">
            <h1 className="font-display text-[clamp(2.4rem,11vw,5.25rem)] font-semibold leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.25)]">
              Uodegų namai
            </h1>
            <p className="mt-4 max-w-md text-base font-medium tracking-wide text-white/95 sm:mt-5 sm:text-lg md:text-xl">
              Kai išvykstate — jiems kaip namie
            </p>
            <div className="mt-7 sm:mt-9">
              <Link
                className="inline-flex w-full items-center justify-center rounded-2xl bg-navy-800 px-6 py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_-10px_rgba(0,0,0,0.5)] transition hover:bg-navy-700 active:scale-[0.98] sm:w-auto sm:px-8"
                to={datesHref}
              >
                Žiūrėti laisvas datas
              </Link>
            </div>
          </div>
        </div>

        {/* Trust seal — smaller on tablet, hidden on very small phones */}
        <div className="pointer-events-none absolute bottom-[3.75rem] right-3 z-20 hidden animate-[fadeUp_0.9s_ease-out_0.15s_both] sm:bottom-[4.5rem] sm:right-5 sm:block md:bottom-24 md:right-10 lg:right-16">
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-white shadow-[0_12px_40px_-12px_rgba(26,43,86,0.35)] ring-1 ring-sand-200 md:h-[7.5rem] md:w-[7.5rem] lg:h-36 lg:w-36">
            <svg className="absolute inset-1 md:inset-1.5" viewBox="0 0 120 120" aria-hidden>
              <defs>
                <path id="sealPath" d="M60,60 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0" />
              </defs>
              <text fill="#1A2B56" fontSize="8" fontWeight="700" letterSpacing="2.2">
                <textPath href="#sealPath" startOffset="0%">
                  MEILĖ · RŪPESTIS · SAUGUMAS · KAIP NAMIE ·
                </textPath>
              </text>
            </svg>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-navy-800 md:h-10 md:w-10">
              <circle cx="12" cy="13.5" r="4.2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="7.2" cy="9" r="1.5" fill="currentColor" />
              <circle cx="16.8" cy="9" r="1.5" fill="currentColor" />
              <circle cx="5.8" cy="13" r="1.3" fill="currentColor" />
              <circle cx="18.2" cy="13" r="1.3" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 leading-[0]">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="block h-[56px] w-full sm:h-[80px] md:h-[120px]">
            <path
              fill="#FBF8F2"
              d="M0,52 C180,110 360,18 540,48 C720,78 900,110 1080,62 C1260,14 1350,28 1440,48 L1440,120 L0,120 Z"
            />
          </svg>
        </div>
      </section>

      {/* APIE */}
      <section id="apie" className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16 md:py-20">
        <LeafDecor className="pointer-events-none absolute -left-8 top-4 hidden text-skyyard-300 opacity-80 sm:block md:top-10" />
        <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-skyyard-500">Apie mus</p>
            <h2 className="mt-2 font-display text-[1.75rem] font-semibold leading-tight text-navy-800 sm:text-3xl md:text-4xl">
              Sunny Yard — šilta vieta augintiniui
            </h2>
            <p className="mt-4 text-base leading-relaxed text-navy-800/75 md:text-lg">
              Uodegų namai — šeimos gyvūnų viešbutis, kur rūpinamės draugiškais šunimis kaip savais.
              Aiški rezervacija, greitas atsakymas ir rami aplinka, kad jūs keliautumėte be nerimo.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {["Namų ramybė", "Daug žaidimų", "Aiški komunikacija"].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy-800 shadow-card ring-1 ring-sand-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] shadow-soft ring-1 ring-sand-200">
            <img
              src="/hero-sunny-yard.jpg"
              alt="Saulėtas kiemas"
              className="h-72 w-full object-cover md:h-[24rem]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/75 via-navy-900/30 to-transparent p-6 pt-16">
              <p className="font-display text-lg text-white md:text-xl">
                Daug žaidimų. Daug draugų. Daug laimės.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PASLAUGOS */}
      <section id="paslaugos" className="bg-white/70 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-skyyard-500">Paslaugos</p>
          <h2 className="section-title mt-2 text-center">Kas įeina į nakvynę</h2>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-3">
            {[
              {
                t: "Nakvynė",
                d: "Šilta, saugi vieta nakčiai su aiškiu dienos ritmu.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                )
              },
              {
                t: "Maitinimas",
                d: "Pagal jūsų pastabas ir įprastą režimą.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 8v8M9 10.5h6" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                )
              },
              {
                t: "Žaidimai ir vaikščiojimai",
                d: "Aktyvus laikas kieme ir ramybės akimirkos.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="13" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="7" cy="8" r="1.4" fill="currentColor" />
                    <circle cx="17" cy="8" r="1.4" fill="currentColor" />
                  </svg>
                )
              }
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-[1.75rem] bg-sand-50 p-7 ring-1 ring-sand-200 transition duration-300 hover:-translate-y-1 hover:shadow-soft"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-navy-800 shadow-sm ring-1 ring-sand-200">
                  {item.icon}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-navy-800">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-800/70">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KAIP — horizontal steps like mockup */}
      <section id="kaip" className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16 md:py-20">
        <LeafDecor className="pointer-events-none absolute -right-6 top-6 hidden text-skyyard-300 opacity-70 sm:block" flip />
        <div className="text-center">
          <h2 className="section-title">Kaip viskas vyksta?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-navy-800/70 sm:text-base">
            Keturi paprasti žingsniai — nuo pirmos žinutės iki ramių atostogų.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-4 lg:gap-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative flex flex-col items-center text-center">
              {i < steps.length - 1 ? (
                <div
                  className="pointer-events-none absolute left-[calc(50%+2.5rem)] top-7 hidden h-px w-[calc(100%-5rem)] bg-gradient-to-r from-skyyard-300 to-transparent lg:block"
                  aria-hidden
                />
              ) : null}
              <div className="grid h-16 w-16 place-items-center rounded-full border-[1.5px] border-navy-800 bg-white text-navy-800 shadow-sm">
                {s.icon}
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-skyyard-500">
                0{i + 1}
              </div>
              <h3 className="mt-1 font-display text-xl font-semibold text-navy-800">{s.title}</h3>
              <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-navy-800/70">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ATSILIEPIMAI — 3 columns */}
      <section id="atsiliepimai" className="relative bg-white/60 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:mb-10">
            <h2 className="section-title text-center">Mūsų šeimos atsiliepimai</h2>
            <HeartIcon className="text-skyyard-500" />
          </div>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote
                key={`${t.name}-${t.dog}`}
                className="flex flex-col items-center rounded-[1.75rem] bg-sand-50 p-7 text-center shadow-card ring-1 ring-sand-200 transition duration-300 hover:-translate-y-0.5 hover:shadow-soft"
              >
                <img
                  src={t.photo}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover ring-[3px] ring-white shadow-md"
                />
                <div className="mt-3 text-navy-800" aria-hidden>
                  ★★★★★
                </div>
                <p className="mt-3 font-display text-[15px] italic leading-relaxed text-navy-800/90">
                  „{t.text}“
                </p>
                <footer className="mt-4 text-sm font-semibold text-navy-800">
                  — {t.name} ir {t.dog}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* DUK */}
      <section id="duk" className="bg-skyyard-50/80 py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="section-title text-center">DUK</h2>
          <div className="mt-6 space-y-3 sm:mt-8">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <button
                  key={f.q}
                  type="button"
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  className="w-full rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-sand-200 transition sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-display text-base font-semibold text-navy-800 sm:text-lg">{f.q}</span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sand-50 text-navy-800/50 ring-1 ring-sand-200">
                      {open ? "−" : "+"}
                    </span>
                  </div>
                  {open ? <p className="mt-3 text-sm leading-relaxed text-navy-800/70">{f.a}</p> : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* KONTAKTAI */}
      <section id="kontaktai" className="mx-auto max-w-6xl px-4 py-12 sm:py-16 md:py-20">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-4">
            <h2 className="section-title">Susisiekime!</h2>
            <p className="mt-3 text-sm text-navy-800/70">
              Parašykite forma arba paskambinkite. Atsakome kuo greičiau.
            </p>
            <div className="mt-6 space-y-4 text-sm">
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="flex items-center gap-3 font-semibold text-navy-800 transition hover:text-skyyard-500"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-skyyard-100 text-navy-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 4h3l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
                {CONTACT_PHONE_DISPLAY}
              </a>
              <p className="flex items-center gap-3 text-navy-800/80">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-skyyard-100 text-navy-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 7l8 6 8-6M5 19h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
                Arba „Rašykite mums“ apačioje dešinėje
              </p>
              <p className="flex items-center gap-3 text-navy-800/80">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-skyyard-100 text-navy-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
                Sodų 10
              </p>
            </div>
            <div className="mt-7 overflow-hidden rounded-[1.75rem] shadow-card ring-1 ring-sand-200">
              <img src="/hero-sunny-yard.jpg" alt="Saulėtas kiemas" className="h-48 w-full object-cover" />
            </div>
          </div>

          <form
            className="rounded-[1.75rem] bg-white p-5 shadow-card ring-1 ring-sand-200 sm:p-6 md:p-7 lg:col-span-4"
            onSubmit={submitContactForm}
          >
            <div className="grid gap-3.5">
              <div>
                <label className="label">Jūsų vardas</label>
                <input
                  className="input mt-1"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
              <div>
                <label className="label">El. paštas</label>
                <input
                  className="input mt-1"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <label className="label">Telefono numeris</label>
                <input
                  className="input mt-1"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  maxLength={40}
                  placeholder="Nebūtina"
                />
              </div>
              <div>
                <label className="label">Žinutė</label>
                <textarea
                  className="input mt-1 min-h-28 resize-y"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  minLength={10}
                  maxLength={3000}
                  placeholder="Parašykite mums..."
                />
              </div>
              {contactError ? <div className="error">{contactError}</div> : null}
              {contactSuccess ? (
                <div className="rounded-xl bg-skyyard-50 px-3 py-2 text-sm text-navy-800 ring-1 ring-skyyard-200">
                  {contactSuccess}
                </div>
              ) : null}
              <button className="btn-primary mt-1 w-full" type="submit" disabled={contactLoading}>
                {contactLoading ? "Siunčiama..." : "Siųsti"}
              </button>
            </div>
          </form>

          <div className="relative overflow-hidden rounded-[1.75rem] bg-skyyard-100 p-5 ring-1 ring-skyyard-200 sm:p-7 lg:col-span-4">
            <h3 className="font-display text-xl font-semibold text-navy-800 sm:text-2xl">Svarbu žinoti</h3>
            <ul className="mt-6 space-y-4 text-sm text-navy-800/90">
              {[
                "Priimame draugiškus šunis",
                "Užtikriname saugią ir jaukią aplinką",
                "Daug dėmesio, žaidimų ir meilės kiekvieną dieną"
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-skyyard-500 ring-1 ring-skyyard-200">
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link className="btn-primary mt-8 inline-flex" to={datesHref}>
              Žiūrėti laisvas datas
            </Link>
            {/* decorative sun */}
            <div
              className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_center,#F5D76E_0%,#F5D76E_28%,transparent_29%)] opacity-90"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 rounded-full border-2 border-tan-400/40"
              aria-hidden
            />
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
