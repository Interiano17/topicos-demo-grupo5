"use client";

import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { Spinner } from "@/components/Spinner";
import { type ExplanationItem, type Movie } from "@/lib/recommendationEngine";
import { supabase } from "@/lib/supabaseClient";

type RecommendationRow = {
  user_id: string;
  items: number[];
  explanation: ExplanationItem[];
  version: number;
};

type Genre = { id: number; name: string };

export default function ResultsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [participants, setParticipants] = useState(0);
  const [genreCounts, setGenreCounts] = useState<Record<number, number>>({});
  const [genreNames, setGenreNames] = useState<Record<number, string>>({});
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationRow | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem("sim_user_id"));
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoadingOverview(true);
      try {
        const [{ data: movieRows }, { count: usersCount }, { data: genreRows }] = await Promise.all(
          [
            supabase
              .from("movies")
              .select("id,title,genre_id,tags,popularity,image_url")
              .order("id", { ascending: true }),
            supabase.from("users_temp").select("id", { count: "exact", head: true }),
            supabase.from("user_genres").select("genre_id"),
          ],
        );

        const { data: genreCatalogRows } = await supabase
          .from("genres")
          .select("id,name")
          .order("id", { ascending: true });

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
        const names = ((genreCatalogRows as Genre[]) ?? []).reduce<Record<number, string>>(
          (acc, row) => {
            acc[row.id] = row.name;
            return acc;
          },
          {},
        );
        setGenreNames(names);
      } finally {
        setLoadingOverview(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchRecommendation = async () => {
      setLoadingRecommendation(true);
      try {
        const { data } = await supabase
          .from("recommendations")
          .select("user_id,items,explanation,version")
          .eq("user_id", userId)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        setRecommendation((data as RecommendationRow | null) ?? null);
      } finally {
        setLoadingRecommendation(false);
      }
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

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <section className="surface reveal-up rounded-2xl p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-bold text-brand-900">Estado en vivo</h2>
          {loadingOverview ? (
            <p className="mt-2 flex items-center gap-2 text-brand-700">
              <Spinner size="sm" /> Cargando estado en vivo...
            </p>
          ) : (
            <p className="mt-2 text-brand-700">Participantes conectados: {participants}</p>
          )}
          <div className="mt-2 text-sm text-brand-700">
            {Object.entries(genreCounts).map(([genreId, count]) => (
              <p key={genreId}>
                {genreNames[Number(genreId)] ?? `Género ${genreId}`}: {count} participantes
              </p>
            ))}
          </div>
          {!recommendation && !loadingRecommendation ? (
            <p className="mt-3 rounded-lg bg-brand-100 p-3 text-brand-800">
              Esperando a admin para generar recomendaciones.
            </p>
          ) : null}
          {loadingRecommendation ? (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-brand-100 p-3 text-brand-800">
              <Spinner size="sm" /> Actualizando recomendaciones...
            </p>
          ) : null}
        </section>

        <RecommendationsCard
          title="Recomendaciones oficiales"
          items={recommendation?.items ?? []}
          explanation={recommendation?.explanation ?? []}
          movies={movies}
        />
      </main>
      <Footer />
    </div>
  );
}
