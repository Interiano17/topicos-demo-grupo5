"use client";

import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import {
  generateRecommendationsForAll,
  type Choices,
  type ExplanationItem,
  type Movie,
  type User,
} from "@/lib/recommendationEngine";
import { supabase } from "@/lib/supabaseClient";

type RecommendationRow = {
  user_id: string;
  items: number[];
  explanation: ExplanationItem[];
  version: number;
};

export default function ResultsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [participants, setParticipants] = useState(0);
  const [genreCounts, setGenreCounts] = useState<Record<number, number>>({});
  const [recommendation, setRecommendation] = useState<RecommendationRow | null>(null);
  const [provisional, setProvisional] = useState<{
    items: number[];
    explanation: ExplanationItem[];
  } | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem("sim_user_id"));
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const [{ data: movieRows }, { count: usersCount }, { data: genreRows }] = await Promise.all([
        supabase
          .from("movies")
          .select("id,title,genre_id,tags,popularity")
          .order("id", { ascending: true }),
        supabase.from("users_temp").select("id", { count: "exact", head: true }),
        supabase.from("user_genres").select("genre_id"),
      ]);

      setMovies((movieRows as Movie[]) ?? []);
      setParticipants(usersCount ?? 0);
      const counts = ((genreRows as { genre_id: number }[]) ?? []).reduce<Record<number, number>>(
        (acc, row) => {
          acc[row.genre_id] = (acc[row.genre_id] ?? 0) + 1;
          return acc;
        },
        {},
      );
      setGenreCounts(counts);
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchRecommendation = async () => {
      const { data } = await supabase
        .from("recommendations")
        .select("user_id,items,explanation,version")
        .eq("user_id", userId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRecommendation((data as RecommendationRow | null) ?? null);
    };

    void fetchRecommendation();

    const channel = supabase
      .channel("results-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "recommendations",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void fetchRecommendation();
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "user_genres" }, async () => {
        const { data } = await supabase.from("user_genres").select("genre_id");
        const counts = ((data as { genre_id: number }[]) ?? []).reduce<Record<number, number>>(
          (acc, row) => {
            acc[row.genre_id] = (acc[row.genre_id] ?? 0) + 1;
            return acc;
          },
          {},
        );
        setGenreCounts(counts);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users_temp" }, async () => {
        const { count } = await supabase
          .from("users_temp")
          .select("id", { count: "exact", head: true });
        setParticipants(count ?? 0);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const buildProvisional = async () => {
    if (!userId) return;

    const [{ data: users }, { data: genreRows }, { data: movieRows }] = await Promise.all([
      supabase.from("users_temp").select("id,name"),
      supabase.from("user_genres").select("user_id,genre_id"),
      supabase.from("user_movie_choices").select("user_id,movie_id"),
    ]);

    const choicesMap: Record<string, Choices> = {};
    ((users as User[]) ?? []).forEach((user) => {
      choicesMap[user.id] = { genres: [], movies: [] };
    });

    ((genreRows as { user_id: string; genre_id: number }[]) ?? []).forEach((row) => {
      if (!choicesMap[row.user_id]) {
        choicesMap[row.user_id] = { genres: [], movies: [] };
      }
      choicesMap[row.user_id].genres.push(row.genre_id);
    });

    ((movieRows as { user_id: string; movie_id: number }[]) ?? []).forEach((row) => {
      if (!choicesMap[row.user_id]) {
        choicesMap[row.user_id] = { genres: [], movies: [] };
      }
      choicesMap[row.user_id].movies.push(row.movie_id);
    });

    const generated = generateRecommendationsForAll((users as User[]) ?? [], movies, choicesMap, {
      minUsersForCF: Number(process.env.NEXT_PUBLIC_MIN_USERS_FOR_CF ?? 5),
      topK: Number(process.env.NEXT_PUBLIC_TOP_K ?? 5),
    });

    const mine = generated.find((entry) => entry.user_id === userId);
    if (!mine) return;
    setProvisional({ items: mine.items, explanation: mine.explanation });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-100 via-brand-50 to-white">
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-brand-900">Estado en vivo</h2>
          <p className="mt-2 text-brand-700">Participantes conectados: {participants}</p>
          <div className="mt-2 text-sm text-brand-700">
            {Object.entries(genreCounts).map(([genreId, count]) => (
              <p key={genreId}>
                Género {genreId}: {count} participantes
              </p>
            ))}
          </div>
          {!recommendation ? (
            <p className="mt-3 rounded-lg bg-brand-100 p-3 text-brand-800">
              Esperando a admin para generar recomendaciones.
            </p>
          ) : null}
        </section>

        <RecommendationsCard
          title="Recomendaciones oficiales"
          items={recommendation?.items ?? []}
          explanation={recommendation?.explanation ?? []}
          movies={movies}
        />

        <section className="rounded-2xl bg-white p-6 shadow-md">
          <button
            type="button"
            aria-label="Generar recomendación provisional"
            onClick={buildProvisional}
            className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800"
          >
            Ver recomendación provisional local (CB)
          </button>
          {provisional ? (
            <div className="mt-4">
              <RecommendationsCard
                title="Provisional local"
                items={provisional.items}
                explanation={provisional.explanation}
                movies={movies}
              />
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
}
