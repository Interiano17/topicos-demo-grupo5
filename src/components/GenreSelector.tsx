"use client";

type Genre = { id: number; name: string };

type Props = {
  genres: Genre[];
  selected: number[];
  onToggle: (genreId: number) => void;
};

export function GenreSelector({ genres, selected, onToggle }: Props) {
  return (
    <section className="surface reveal-up rounded-2xl p-6 shadow-2xl shadow-black/20">
      <h2 className="text-lg font-bold text-brand-900">1) Elige tus géneros</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {genres.map((genre) => {
          const isActive = selected.includes(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              aria-label={`Seleccionar género ${genre.name}`}
              onClick={() => onToggle(genre.id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                isActive
                  ? "border-primary-500 bg-primary-500/20 text-brand-900"
                  : "border-brand-300 bg-brand-100/70 text-brand-700 hover:border-primary-500"
              }`}
            >
              {genre.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
