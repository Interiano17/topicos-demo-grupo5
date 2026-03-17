"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { GenreSelector } from "@/components/GenreSelector";
import { Header } from "@/components/Header";
import { MovieGrid } from "@/components/MovieGrid";
import { Spinner } from "@/components/Spinner";
import type { Movie } from "@/lib/recommendationEngine";
import { supabase } from "@/lib/supabaseClient";

type Genre = { id: number; name: string };

const MAX_PER_GENRE = 3;

export default function SelectPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<number[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sim_user_id");
    if (!stored) {
      router.push("/");
      return;
    }
    setUserId(stored);
  }, [router]);

  useEffect(() => {
    const load = async () => {
      setLoadingCatalog(true);
      try {
        const [{ data: genresData, error: genresError }, { data: moviesData, error: moviesError }] =
          await Promise.all([
            supabase.from("genres").select("id,name").order("id", { ascending: true }),
            supabase
              .from("movies")
              .select("id,title,genre_id,tags,popularity,image_url")
              .order("id", { ascending: true }),
          ]);

        if (genresError || moviesError) {
          setMessage("No se pudo cargar el catálogo. Intenta recargar la página.");
        } else {
          setGenres((genresData as Genre[]) ?? []);
          setMovies((moviesData as Movie[]) ?? []);
        }
      } finally {
        setLoadingCatalog(false);
      }
    };
    void load();
  }, []);

  const movieMap = useMemo(() => {
    const map = new Map<number, Movie>();
    movies.forEach((movie) => map.set(movie.id, movie));
    return map;
  }, [movies]);

  const toggleGenre = (genreId: number) => {
    const removing = selectedGenres.includes(genreId);
    setSelectedGenres((prev) =>
      removing ? prev.filter((id) => id !== genreId) : [...prev, genreId],
    );
    if (removing) {
      setSelectedMovies((prev) =>
        prev.filter((movieId) => {
          const movie = movieMap.get(movieId);
          return movie ? movie.genre_id !== genreId : true;
        }),
      );
    }
  };

  const toggleMovie = (movie: Movie) => {
    setSelectedMovies((prev) => {
      if (prev.includes(movie.id)) {
        return prev.filter((id) => id !== movie.id);
      }

      const selectedInGenre = prev.filter(
        (movieId) => movieMap.get(movieId)?.genre_id === movie.genre_id,
      ).length;
      if (selectedInGenre >= MAX_PER_GENRE) {
        return prev;
      }
      return [...prev, movie.id];
    });
  };

  const handleFinish = async () => {
    if (!userId) return;
    if (selectedGenres.length === 0) {
      setMessage("Debes seleccionar al menos un género.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await supabase.from("user_genres").delete().eq("user_id", userId);
      await supabase.from("user_movie_choices").delete().eq("user_id", userId);

      const genresPayload = selectedGenres.map((genre_id) => ({ user_id: userId, genre_id }));
      const moviesPayload = selectedMovies.map((movie_id) => ({ user_id: userId, movie_id }));

      const { error: genresError } = await supabase.from("user_genres").insert(genresPayload);
      const { error: moviesError } = await supabase
        .from("user_movie_choices")
        .insert(moviesPayload);

      if (genresError || moviesError) {
        setMessage("No se pudieron guardar tus preferencias. Intenta nuevamente.");
        return;
      }

      router.push("/results");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="surface reveal-up rounded-2xl p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-bold text-brand-900">Configura tus gustos</h2>
          <p className="mt-2 text-brand-700">
            Selecciona géneros y películas para alimentar el motor didáctico.
          </p>
          {userId ? (
            <p className="mt-2 text-sm text-brand-600">Tu ID: {userId.slice(0, 8)}</p>
          ) : null}
        </div>

        {loadingCatalog ? (
          <div className="surface flex items-center gap-3 rounded-2xl p-6 text-brand-700">
            <Spinner />
            Cargando catálogo de películas...
          </div>
        ) : (
          <>
            <GenreSelector genres={genres} selected={selectedGenres} onToggle={toggleGenre} />
            <MovieGrid
              movies={movies}
              genres={genres}
              selectedGenres={selectedGenres}
              selectedMovies={selectedMovies}
              maxPerGenre={MAX_PER_GENRE}
              onToggleMovie={toggleMovie}
            />
          </>
        )}

        {message ? (
          <p className="rounded-lg border border-primary-500/45 bg-primary-700/18 p-3 text-brand-900">
            {message}
          </p>
        ) : null}

        <button
          type="button"
          aria-label="Guardar preferencias"
          onClick={handleFinish}
          disabled={saving || loadingCatalog}
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition disabled:opacity-70"
        >
          {saving ? (
            <>
              <Spinner size="sm" />
              Guardando...
            </>
          ) : (
            "Terminar"
          )}
        </button>
      </main>
      <Footer />
    </div>
  );
}
