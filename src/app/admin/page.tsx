"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGraph } from "@/components/AdminGraph";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Spinner } from "@/components/Spinner";
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
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const userStats = useMemo(() => {
    return users.map((user) => ({
      ...user,
      genresCount: genreChoices.filter((entry) => entry.user_id === user.id).length,
      moviesCount: movieChoices.filter((entry) => entry.user_id === user.id).length,
    }));
  }, [users, genreChoices, movieChoices]);

  const loadData = async () => {
    setLoadingData(true);
    try {
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
    } finally {
      setLoadingData(false);
    }
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
    setActionLoading(path);
    try {
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
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="surface reveal-up rounded-2xl p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-bold text-brand-900">Panel de administración</h2>
          <p className="mt-2 text-brand-700">Clave para ejecutar acciones protegidas.</p>
          <input
            type="password"
            aria-label="Clave de administrador"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            className="mt-3 w-full rounded-xl border border-brand-300 bg-brand-100/70 px-4 py-3 text-brand-900 outline-none focus:border-primary-500"
            placeholder="ADMIN_KEY"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={actionLoading !== null}
              className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition disabled:opacity-70"
              onClick={() => void callAdminEndpoint("/api/generate-recommendations")}
            >
              {actionLoading === "/api/generate-recommendations" ? (
                <>
                  <Spinner size="sm" /> Procesando...
                </>
              ) : (
                "Generar recomendaciones"
              )}
            </button>
            <button
              type="button"
              disabled={actionLoading !== null}
              className="btn-danger flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition disabled:opacity-70"
              onClick={() => void callAdminEndpoint("/api/admin-clear")}
            >
              {actionLoading === "/api/admin-clear" ? (
                <>
                  <Spinner size="sm" /> Borrando...
                </>
              ) : (
                "Borrar datos"
              )}
            </button>
            <button
              type="button"
              disabled={actionLoading !== null}
              className="btn-info flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition disabled:opacity-70"
              onClick={() => void callAdminEndpoint("/api/admin-load-demo")}
            >
              {actionLoading === "/api/admin-load-demo" ? (
                <>
                  <Spinner size="sm" /> Cargando...
                </>
              ) : (
                "Cargar dataset demo"
              )}
            </button>
          </div>

          {message ? (
            <p className="mt-3 rounded-lg border border-primary-500/45 bg-primary-700/18 p-3 text-brand-900">
              {message}
            </p>
          ) : null}
        </section>

        <section className="surface rounded-2xl p-6 shadow-2xl shadow-black/20">
          <h3 className="text-lg font-bold text-brand-900">Usuarios activos</h3>
          {loadingData ? (
            <p className="mt-3 flex items-center gap-2 text-brand-700">
              <Spinner size="sm" /> Cargando usuarios y selecciones...
            </p>
          ) : null}
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
                    <td className="border-b border-brand-200 py-2">{user.name}</td>
                    <td className="border-b border-brand-200 py-2">{user.id.slice(0, 8)}</td>
                    <td className="border-b border-brand-200 py-2">{user.genresCount}</td>
                    <td className="border-b border-brand-200 py-2">{user.moviesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface rounded-2xl p-6 shadow-2xl shadow-black/20">
          <h3 className="text-lg font-bold text-brand-900">Grafo de similitud</h3>
          <div className="mt-2 flex items-center gap-3">
            <label htmlFor="threshold" className="text-sm text-brand-700">
              Umbral
            </label>
            <input
              id="threshold"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={similarityThreshold}
              onChange={(event) => setSimilarityThreshold(Number(event.target.value))}
              className="w-24 rounded border border-brand-300 bg-brand-100/65 px-2 py-1 text-brand-900 outline-none focus:border-primary-500"
            />
          </div>
          <div className="mt-4">
            {loadingData ? (
              <div className="flex h-[340px] items-center justify-center rounded-xl border border-brand-300 bg-brand-100/50 text-brand-700">
                <span className="flex items-center gap-2">
                  <Spinner /> Preparando grafo...
                </span>
              </div>
            ) : (
              <AdminGraph
                users={users}
                choices={movieChoices}
                similarityThreshold={similarityThreshold}
              />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
