"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGraph } from "@/components/AdminGraph";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";

type User = { id: string; name: string; created_at: string };
type GenreChoice = { user_id: string; genre_id: number };
type MovieChoice = { user_id: string; movie_id: number };

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [genreChoices, setGenreChoices] = useState<GenreChoice[]>([]);
  const [movieChoices, setMovieChoices] = useState<MovieChoice[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(
    Number(process.env.NEXT_PUBLIC_SIMILARITY_THRESHOLD ?? 0.3),
  );
  const [message, setMessage] = useState<string | null>(null);

  const userStats = useMemo(() => {
    return users.map((user) => ({
      ...user,
      genresCount: genreChoices.filter((entry) => entry.user_id === user.id).length,
      moviesCount: movieChoices.filter((entry) => entry.user_id === user.id).length,
    }));
  }, [users, genreChoices, movieChoices]);

  const loadData = async () => {
    const [{ data: userRows }, { data: genreRows }, { data: movieRows }] = await Promise.all([
      supabase
        .from("users_temp")
        .select("id,name,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_genres").select("user_id,genre_id"),
      supabase.from("user_movie_choices").select("user_id,movie_id"),
    ]);

    setUsers((userRows as User[]) ?? []);
    setGenreChoices((genreRows as GenreChoice[]) ?? []);
    setMovieChoices((movieRows as MovieChoice[]) ?? []);
  };

  useEffect(() => {
    void loadData();

    const channel = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users_temp" },
        () => void loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_genres" },
        () => void loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_movie_choices" },
        () => void loadData(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const callAdminEndpoint = async (path: string) => {
    setMessage(null);
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      message?: string;
      processed?: number;
      version?: number;
    };
    if (!response.ok) {
      setMessage(payload.message ?? "Acción fallida");
      return;
    }

    setMessage(
      payload.message ??
        (payload.version
          ? `Proceso completado. Versión ${payload.version} para ${payload.processed} usuarios.`
          : "Acción completada."),
    );
    void loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-100 via-brand-50 to-white">
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-brand-900">Panel de administración</h2>
          <p className="mt-2 text-brand-700">Ingresa la clave para ejecutar acciones protegidas.</p>
          <input
            type="password"
            aria-label="Clave de administrador"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            className="mt-3 w-full rounded-lg border border-brand-300 px-4 py-3 outline-none focus:border-brand-500"
            placeholder="ADMIN_KEY"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800"
              onClick={() => void callAdminEndpoint("/api/generate-recommendations")}
            >
              Generar recomendaciones
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
              onClick={() => void callAdminEndpoint("/api/admin-clear")}
            >
              Borrar datos
            </button>
            <button
              type="button"
              className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
              onClick={() => void callAdminEndpoint("/api/admin-load-demo")}
            >
              Cargar dataset demo
            </button>
          </div>

          {message ? (
            <p className="mt-3 rounded-lg bg-brand-100 p-3 text-brand-800">{message}</p>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h3 className="text-lg font-bold text-brand-900">Usuarios activos</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse">
              <thead>
                <tr className="text-left text-brand-800">
                  <th className="border-b border-brand-200 py-2">Usuario</th>
                  <th className="border-b border-brand-200 py-2">ID</th>
                  <th className="border-b border-brand-200 py-2">Géneros</th>
                  <th className="border-b border-brand-200 py-2">Películas</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((user) => (
                  <tr key={user.id} className="text-brand-700">
                    <td className="border-b border-brand-100 py-2">{user.name}</td>
                    <td className="border-b border-brand-100 py-2">{user.id.slice(0, 8)}</td>
                    <td className="border-b border-brand-100 py-2">{user.genresCount}</td>
                    <td className="border-b border-brand-100 py-2">{user.moviesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h3 className="text-lg font-bold text-brand-900">Grafo de similitud</h3>
          <div className="mt-2 flex items-center gap-3">
            <label htmlFor="threshold" className="text-sm text-brand-700">
              Threshold
            </label>
            <input
              id="threshold"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={similarityThreshold}
              onChange={(event) => setSimilarityThreshold(Number(event.target.value))}
              className="w-24 rounded border border-brand-300 px-2 py-1"
            />
          </div>
          <div className="mt-4">
            <AdminGraph
              users={users}
              choices={movieChoices}
              similarityThreshold={similarityThreshold}
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
