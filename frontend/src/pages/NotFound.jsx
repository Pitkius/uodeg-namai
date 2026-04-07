import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6 text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Puslapis nerastas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Atrodo, kad tokio puslapio nėra.
        </p>
        <div className="mt-5">
          <Link className="btn-primary" to="/">
            Grįžti į Home
          </Link>
        </div>
      </div>
    </div>
  );
}

