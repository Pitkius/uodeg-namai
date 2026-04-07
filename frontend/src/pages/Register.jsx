import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Register() {
  const { register, loading } = useAuth();
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
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500" />
        <div className="p-6 text-left">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="page-title">Registracija</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">Sukurkite paskyrą ir užsiregistruokite apsistojimui.</p>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div>
            <div className="label">Vardas</div>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="label">El. paštas</div>
            <input className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="label">Slaptažodis (min. 8 simboliai)</div>
            <input
              className="input mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn-primary" disabled={loading}>
            {loading ? "Kuriama..." : "Registruotis"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-600">
          Jau turite paskyrą?{" "}
          <Link className="font-semibold text-rose-600 underline decoration-rose-200 hover:text-orange-600" to="/login">
            Prisijunkite
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}

