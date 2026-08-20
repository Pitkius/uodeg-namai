import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChatWidget } from "./ChatWidget";
import { VisitTracker } from "./VisitTracker";
import { BrandLogo } from "./BrandLogo";

function NavItem({ to, children, end, hash, onClick }) {
  const base = "whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition";
  if (hash) {
    return (
      <a href={hash} onClick={onClick} className={`${base} text-navy-800/70 hover:bg-white/70 hover:text-navy-900`}>
        {children}
      </a>
    );
  }
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [base, isActive ? "bg-skyyard-100 text-navy-900" : "text-navy-800/70 hover:bg-white/70 hover:text-navy-900"].join(
          " "
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  const { user, isAuthed, isAdmin, logout } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const datesHref = isAuthed ? "/reservations" : "/register";
  const [menuOpen, setMenuOpen] = useState(false);
  const firstName = user?.name ? String(user.name).split(" ")[0] : "";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const homeLinks = (
    <>
      <NavItem hash="#apie" onClick={closeMenu}>
        Apie
      </NavItem>
      <NavItem hash="#paslaugos" onClick={closeMenu}>
        Paslaugos
      </NavItem>
      <NavItem hash="#kaip" onClick={closeMenu}>
        Kaip
      </NavItem>
      <NavItem hash="#atsiliepimai" onClick={closeMenu}>
        Atsiliepimai
      </NavItem>
      <NavItem hash="#duk" onClick={closeMenu}>
        DUK
      </NavItem>
      <NavItem hash="#kontaktai" onClick={closeMenu}>
        Kontaktai
      </NavItem>
    </>
  );

  const appLinks = isAuthed ? (
    <>
      <NavItem to="/dashboard" onClick={closeMenu}>
        Profilis
      </NavItem>
      <NavItem to="/reservations" onClick={closeMenu}>
        Apsistojimai
      </NavItem>
      {isAdmin ? (
        <NavItem to="/admin" onClick={closeMenu}>
          Admin
        </NavItem>
      ) : null}
    </>
  ) : (
    <>
      <NavItem to="/login" onClick={closeMenu}>
        Prisijungti
      </NavItem>
      <NavItem to="/register" onClick={closeMenu}>
        Registracija
      </NavItem>
    </>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-sand-50">
      <header className="sticky top-0 z-30 border-b border-sand-200/70 bg-sand-50/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5 lg:px-6">
          <Link to="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-2.5" onClick={closeMenu}>
            <BrandLogo className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-[0.95rem] font-semibold text-navy-800 sm:text-base md:text-lg">
                Uodegų namai
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-skyyard-500 sm:text-[10px] sm:tracking-[0.18em]">
                Sunny Yard
              </span>
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-0.5 xl:flex">
            {isHome ? homeLinks : null}
            {!isHome ? appLinks : null}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isAuthed ? (
              <>
                {isHome ? (
                  <Link
                    to="/dashboard"
                    className="hidden whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-navy-800/70 transition hover:bg-white/70 hover:text-navy-900 xl:inline-flex"
                  >
                    Profilis
                  </Link>
                ) : null}
                <span className="hidden max-w-[7rem] truncate text-sm font-semibold text-navy-900 2xl:inline">
                  {firstName}
                </span>
                <Link
                  className="btn-primary hidden !px-3 !py-2 text-sm sm:inline-flex sm:!px-4"
                  to="/reservations"
                >
                  Laisvos datos
                </Link>
                <button
                  className="btn-ghost hidden !px-3 !py-2 text-sm sm:inline-flex"
                  type="button"
                  onClick={logout}
                >
                  Atsijungti
                </button>
              </>
            ) : (
              <>
                <Link className="btn-ghost hidden !px-3.5 !py-2 text-sm md:inline-flex" to="/login">
                  Prisijungti
                </Link>
                <Link className="btn-primary hidden !px-3 !py-2 text-sm sm:inline-flex sm:!px-4" to={datesHref}>
                  Laisvos datos
                </Link>
              </>
            )}

            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-sand-300 bg-white text-navy-800 xl:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Uždaryti meniu" : "Atidaryti meniu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="max-h-[min(75vh,560px)] overflow-y-auto border-t border-sand-200 bg-sand-50 xl:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-3 py-4 sm:px-4">
              {isHome ? (
                <div className="mb-2">
                  <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-navy-800/40">
                    Svetainė
                  </div>
                  <div className="flex flex-col">{homeLinks}</div>
                </div>
              ) : null}
              <div>
                <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-navy-800/40">
                  {isAuthed ? "Paskyra" : "Prisijungimas"}
                </div>
                <div className="flex flex-col">
                  {isAuthed ? (
                    <>
                      <NavItem to="/dashboard" onClick={closeMenu}>
                        Profilis
                      </NavItem>
                      <NavItem to="/reservations" onClick={closeMenu}>
                        Apsistojimai / datos
                      </NavItem>
                      {isAdmin ? (
                        <NavItem to="/admin" onClick={closeMenu}>
                          Admin
                        </NavItem>
                      ) : null}
                      {firstName ? (
                        <div className="px-3 py-2 text-sm text-navy-800/55">Prisijungęs: {firstName}</div>
                      ) : null}
                      <button
                        type="button"
                        className="mt-1 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-navy-800 hover:bg-white/70"
                        onClick={() => {
                          closeMenu();
                          logout();
                        }}
                      >
                        Atsijungti
                      </button>
                    </>
                  ) : (
                    <>
                      {appLinks}
                      <Link className="btn-primary mt-2 mx-3" to={datesHref} onClick={closeMenu}>
                        Laisvos datos
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className={isHome ? "" : "mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 sm:py-8 md:py-10"}>
        <Outlet />
      </main>

      <footer className="border-t border-navy-900/10 bg-navy-800 text-sand-100">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:py-10 md:grid-cols-[1.2fr_1fr] lg:px-6">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo className="h-10 w-10 sm:h-11 sm:w-11" />
              <div>
                <div className="font-display text-lg font-semibold sm:text-xl">Uodegų namai</div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-skyyard-300 sm:text-xs">
                  Sunny Yard
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm text-sand-200/85">
              Kai išvykstate — jiems kaip namie. Šilta nakvynė, žaidimai ir rami komunikacija.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="text-sm text-sand-200/80">
              <a className="hover:text-white" href="tel:+37062033487">
                +370 620 33487
              </a>
              <div className="mt-1">{new Date().getFullYear()} • Visos teisės saugomos</div>
            </div>
            <Link
              to={datesHref}
              className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 hover:bg-sand-100 sm:w-auto"
            >
              Laisvos datos
            </Link>
          </div>
        </div>
      </footer>

      <ChatWidget />
      <VisitTracker />
    </div>
  );
}
