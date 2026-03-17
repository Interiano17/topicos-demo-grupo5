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
      <section className="surface rounded-2xl p-6 shadow-2xl shadow-black/20">
        <h2 className="text-lg font-bold text-brand-900">{title}</h2>
        <p className="mt-3 text-brand-700">Todavía no hay recomendaciones disponibles.</p>
      </section>
    );
  }

  return (
    <section className="surface rounded-2xl p-6 shadow-2xl shadow-black/20">
      <h2 className="text-lg font-bold text-brand-900">{title}</h2>
      <div className="mt-4 space-y-4">
        {items.map((itemId) => {
          const movie = movies.find((entry) => entry.id === itemId);
          const detail = explanation.find((entry) => entry.movie_id === itemId);
          return (
            <article
              key={itemId}
              className="rounded-xl border border-primary-500/45 bg-brand-100/45 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="h-36 w-24 shrink-0 overflow-hidden rounded-md border border-brand-300 bg-brand-200/70">
                  {movie?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={movie.image_url}
                      alt={`Poster de ${movie.title}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-200 text-[10px] font-semibold text-brand-700">
                      SIN IMG
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-brand-800">
                    {movie?.title ?? `Película #${itemId}`}
                  </h3>
                  <p className="text-sm text-primary-500">Puntaje: {detail?.score ?? 0}</p>
                  <ul className="mt-2 space-y-1 text-sm text-brand-700">
                    {(detail?.reasons ?? []).map((reason, idx) => (
                      <li key={`${reason.type}-${idx}`}>• {reason.detail}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
