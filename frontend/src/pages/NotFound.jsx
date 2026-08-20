import { Link } from "react-router-dom";
import { useSeo } from "../lib/seo";

export function NotFound() {
  useSeo({
    title: "Puslapis nerastas",
    description: "Ieškomas puslapis nerastas. Grįžkite į Uodegų namų pagrindinį puslapį.",
    path: "/404"
  });
  return (
    <div className="mx-auto max-w-lg">
      <div className="card overflow-hidden p-0 text-left">
        <div className="bg-gradient-to-r from-skyyard-100 to-sand-50 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-skyyard-500">Sunny Yard</p>
          <h1 className="page-title mt-1 text-3xl font-semibold">Puslapis nerastas</h1>
        </div>
        <div className="p-6">
          <p className="text-sm text-navy-800/65">Atrodo, kad tokio puslapio nėra. Grįžkime į saulėtą kiemą.</p>
          <div className="mt-5">
            <Link className="btn-primary" to="/">
              Grįžti į pradžią
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
