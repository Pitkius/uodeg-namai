import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSeo } from "../lib/seo";

export function Login() {
  const { login, requestResetCode, confirmResetPassword, loading } = useAuth();
  useSeo({
    title: "Prisijungimas",
    description: "Prisijunkite prie Uodegų namų paskyros ir valdykite augintinio apsistojimus bei rezervacijas.",
    path: "/login"
  });
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = location.state?.from || "/dashboard";
  const isResetOnlyView = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  useEffect(() => {
    const shouldOpenReset = searchParams.get("reset") === "1";
    if (!shouldOpenReset) return;

    setShowResetForm(true);
    setResetEmail(searchParams.get("email") || "");
    setResetCode(searchParams.get("code") || "");
  }, [searchParams]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await login(email, password);
    if (!res.ok) return setError(res.message);
    nav(from, { replace: true });
  }

  async function onRequestCode(e) {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    const res = await requestResetCode(resetEmail);
    if (!res.ok) return setResetError(res.message);

    setResetSuccess("Jei el. pastas rastas, kodas issiustas i jusu Gmail.");
  }

  async function onConfirmReset(e) {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    const res = await confirmResetPassword(resetEmail, resetCode, newPassword);
    if (!res.ok) return setResetError(res.message);

    setResetSuccess("Slaptazodis sekmingai pakeistas.");
    setResetCode("");
    setNewPassword("");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card overflow-hidden p-0">
        <div className="h-1.5 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />
        <div className="p-6 text-left">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="page-title">Prisijungimas</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {isResetOnlyView
            ? "Patvirtinkite koda ir nustatykite nauja slaptazodi."
            : "Prisijunkite, kad galėtumėte rezervuoti nakvynės laiką."}
        </p>

        {!isResetOnlyView ? (
          <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
            <div>
              <div className="label">El. paštas</div>
              <input className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <div className="label">Slaptažodis</div>
              <input
                className="input mt-1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="w-fit text-sm font-semibold text-rose-600 underline decoration-rose-200 hover:text-orange-600"
              onClick={() => {
                setShowResetForm((v) => !v);
                setResetError("");
                setResetSuccess("");
                setResetEmail(email);
              }}
            >
              {showResetForm ? "Uždaryti slaptažodžio keitimą" : "Pamiršote slaptažodį?"}
            </button>

            {error ? <div className="error">{error}</div> : null}

            <button className="btn-primary" disabled={loading}>
              {loading ? "Jungiama..." : "Prisijungti"}
            </button>
          </form>
        ) : null}

        {showResetForm || isResetOnlyView ? (
          <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-700">Slaptažodžio keitimas</div>
            {!isResetOnlyView ? (
              <form className="grid gap-3" onSubmit={onRequestCode}>
                <div>
                  <div className="label">El. paštas</div>
                  <input className="input mt-1" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                </div>
                <button className="btn-primary" disabled={loading}>
                  {loading ? "Siunciama..." : "Siusti koda i Gmail"}
                </button>
              </form>
            ) : null}

            <form className="grid gap-3" onSubmit={onConfirmReset}>
              <div>
                <div className="label">6 skaitmenu kodas</div>
                <input className="input mt-1" value={resetCode} onChange={(e) => setResetCode(e.target.value)} />
              </div>
              <div>
                <div className="label">Naujas slaptazodis (min. 8 simboliai)</div>
                <input
                  className="input mt-1"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <button className="btn-primary" disabled={loading}>
                {loading ? "Atnaujinama..." : "Patvirtinti koda ir keisti slaptazodi"}
              </button>
            </form>

            {resetError ? <div className="error">{resetError}</div> : null}
            {resetSuccess ? (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
                {resetSuccess}
              </div>
            ) : null}
          </div>
        ) : null}

        {!isResetOnlyView ? (
          <div className="mt-4 text-sm text-slate-600">
            Neturite paskyros?{" "}
            <Link className="font-semibold text-rose-600 underline decoration-rose-200 hover:text-orange-600" to="/register">
              Registruokitės
            </Link>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}

