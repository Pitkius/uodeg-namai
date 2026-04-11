import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function NavItem({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "rounded-xl px-3 py-2 text-sm font-semibold transition duration-200",
          isActive
            ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md shadow-rose-300/40"
            : "text-slate-700 hover:bg-white/70 hover:text-rose-700"
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  const { user, isAuthed, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-rose-200/40 bg-gradient-to-r from-sky-100/95 via-white/90 to-rose-100/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Uodegų namai — logotipas"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-2xl object-contain bg-[#fff9f4] shadow-lg shadow-rose-300/50 ring-1 ring-white/80"
            />
            <div className="leading-tight">
              <div className="bg-gradient-to-r from-rose-700 to-orange-600 bg-clip-text text-sm font-bold text-transparent">
                Uodegų namai
              </div>
              <div className="text-xs text-slate-600">Apsistojimų rezervacijos ir profilis</div>
            </div>
          </div>

          <nav className="hidden items-center gap-1.5 rounded-2xl bg-white/50 p-1 ring-1 ring-sky-200/60 md:flex">
            <NavItem to="/" end>
              Home
            </NavItem>
            {isAuthed ? (
              <>
                <NavItem to="/dashboard">Mano profilis</NavItem>
                <NavItem to="/reservations">Apsistojimai</NavItem>
                {isAdmin ? <NavItem to="/admin">Admin</NavItem> : null}
              </>
            ) : (
              <>
                <NavItem to="/login">Prisijungti</NavItem>
                <NavItem to="/register">Registracija</NavItem>
              </>
            )}
          </nav>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            {isAuthed && isAdmin ? (
              <NavLink
                to="/admin"
                title="Administravimas"
                className={({ isActive }) =>
                  [
                    "md:hidden rounded-xl border border-violet-300/80 bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-violet-400/30 ring-1 ring-white/30",
                    isActive ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-white" : "active:scale-[0.98]"
                  ].join(" ")
                }
              >
                Admin
              </NavLink>
            ) : null}
            {isAuthed ? (
              <>
                <div className="hidden text-right md:block">
                  <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
                  <div className="text-xs text-slate-500">{user?.email}</div>
                </div>
                <button className="btn-ghost" onClick={logout}>
                  Atsijungti
                </button>
              </>
            ) : (
              <div className="hidden text-xs text-slate-600 sm:block">
                Prisijunkite, kad užsiregistruotumėte apsistojimui
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-rose-900/20 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{new Date().getFullYear()} • Uodegų namai</span>
            <span className="text-rose-300/80">Šilta nakvynė augintiniui</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
