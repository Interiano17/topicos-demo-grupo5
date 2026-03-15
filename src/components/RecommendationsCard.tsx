import type { ExplanationItem, Movie } from "@/lib/recommendationEngine";

type Props = {
  items: number[];
  explanation: ExplanationItem[];
  movies: Movie[];
  title?: string;
};

export function RecommendationsCard({
  items,
  explanation,
  movies,
  title = "Tus recomendaciones",
}: Props) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="text-lg font-bold text-brand-900">{title}</h2>
        <p className="mt-3 text-brand-700">Todavía no hay recomendaciones disponibles.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <h2 className="text-lg font-bold text-brand-900">{title}</h2>
      <div className="mt-4 space-y-4">
        {items.map((itemId) => {
          const movie = movies.find((entry) => entry.id === itemId);
          const detail = explanation.find((entry) => entry.movie_id === itemId);
          return (
            <article key={itemId} className="rounded-xl border border-brand-200 p-4">
              <h3 className="font-semibold text-brand-800">
                {movie?.title ?? `Película #${itemId}`}
              </h3>
              <p className="text-sm text-brand-600">Puntaje: {detail?.score ?? 0}</p>
              <ul className="mt-2 space-y-1 text-sm text-brand-700">
                {(detail?.reasons ?? []).map((reason, idx) => (
                  <li key={`${reason.type}-${idx}`}>• {reason.detail}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
