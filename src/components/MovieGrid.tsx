"use client";

import type { Movie } from "@/lib/recommendationEngine";

type Genre = { id: number; name: string };

type Props = {
  movies: Movie[];
  genres: Genre[];
  selectedGenres: number[];
  selectedMovies: number[];
  maxPerGenre: number;
  onToggleMovie: (movie: Movie) => void;
};

export function MovieGrid({
  movies,
  genres,
  selectedGenres,
  selectedMovies,
  maxPerGenre,
  onToggleMovie,
}: Props) {
  if (selectedGenres.length === 0) {
    return <p className="surface rounded-xl p-4 text-brand-700">Selecciona al menos un género.</p>;
  }

  return (
    <section className="surface reveal-up space-y-4 rounded-2xl p-6 shadow-2xl shadow-black/20">
      <h2 className="text-lg font-bold text-brand-900">
        2) Elige películas (máx {maxPerGenre} por género)
      </h2>
      {selectedGenres.map((genreId) => {
        const genre = genres.find((g) => g.id === genreId);
        const genreMovies = movies.filter((movie) => movie.genre_id === genreId).slice(0, 10);
        const selectedInGenre = genreMovies.filter((movie) =>
          selectedMovies.includes(movie.id),
        ).length;

        return (
          <div key={genreId} className="rounded-xl border border-brand-300 bg-brand-100/45 p-4">
            <h3 className="font-semibold text-brand-800">
              {genre?.name ?? `Género ${genreId}`} ({selectedInGenre}/{maxPerGenre})
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {genreMovies.map((movie) => {
                const isChecked = selectedMovies.includes(movie.id);
                const disabled = !isChecked && selectedInGenre >= maxPerGenre;

                return (
                  <label
                    key={movie.id}
                    className={`group flex cursor-pointer gap-4 rounded-xl border p-3 transition ${
                      isChecked
                        ? "border-primary-500 bg-primary-500/18"
                        : "border-brand-300 bg-brand-100/70 hover:border-brand-500"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    <div className="relative h-32 w-24 overflow-hidden rounded-md border border-brand-300/70 bg-brand-200/70">
                      {movie.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={movie.image_url}
                          alt={`Poster de ${movie.title}`}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-brand-200 text-[10px] font-semibold text-brand-700">
                          SIN IMG
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate text-base font-medium text-brand-900">
                        {movie.title}
                      </span>
                      <input
                        aria-label={`Seleccionar película ${movie.title}`}
                        type="checkbox"
                        checked={isChecked}
                        disabled={disabled}
                        onChange={() => onToggleMovie(movie)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
