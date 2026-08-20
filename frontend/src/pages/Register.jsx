import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSeo } from "../lib/seo";

export function Register() {
  const { register, loading } = useAuth();
  useSeo({
    title: "Registracija",
    description: "Sukurkite paskyrą Uodegų namuose ir rezervuokite augintinio apsistojimą internetu.",
    path: "/register"
  });
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await register(name, email, password);
    if (!res.ok) return setError(res.message);
    nav("/dashboard", { replace: true });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card overflow-hidden p-0">
        <div className="bg-gradient-to-r from-skyyard-100 to-sand-50 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-skyyard-500">Sunny Yard</p>
          <h1 className="page-title mt-1 text-3xl font-semibold">Registracija</h1>
          <p className="mt-1 text-sm text-navy-800/65">Sukurkite paskyrą ir rezervuokite apsistojimą.</p>
        </div>
        <div className="p-6 text-left">
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div>
              <div className="label">Vardas</div>
              <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <div className="label">El. paštas</div>
              <input
                className="input mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="label">Slaptažodis (bent 8 simb., raidė ir skaičius)</div>
              <input
                className="input mt-1"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? <div className="error">{error}</div> : null}

            <button className="btn-primary" disabled={loading}>
              {loading ? "Kuriama..." : "Registruotis"}
            </button>
          </form>

          <div className="mt-4 text-sm text-navy-800/65">
            Jau turite paskyrą?{" "}
            <Link className="font-semibold text-skyyard-500 hover:text-navy-800" to="/login">
              Prisijunkite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
