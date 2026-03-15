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
    return (
      <p className="rounded-xl bg-brand-50 p-4 text-brand-700">Selecciona al menos un género.</p>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-6 shadow-md">
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
          <div key={genreId} className="rounded-xl border border-brand-200 p-4">
            <h3 className="font-semibold text-brand-800">
              {genre?.name ?? `Género ${genreId}`} ({selectedInGenre}/{maxPerGenre})
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {genreMovies.map((movie) => {
                const isChecked = selectedMovies.includes(movie.id);
                const disabled = !isChecked && selectedInGenre >= maxPerGenre;

                return (
                  <label
                    key={movie.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${
                      isChecked ? "border-brand-500 bg-brand-50" : "border-brand-200"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    <input
                      aria-label={`Seleccionar película ${movie.title}`}
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabled}
                      onChange={() => onToggleMovie(movie)}
                    />
                    <span>{movie.title}</span>
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
