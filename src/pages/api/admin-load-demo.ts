import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceRoleClient } from "@/lib/supabaseClient";

const DEMO_NAMES = ["Ana", "Bruno", "Carla", "Diego", "Elena", "Fabio"];
type DemoUserRow = { id: string; name: string };
type DemoMovieRow = { id: number; genre_id: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, message: "No autorizado" });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: usersData, error: usersError } = await supabase
      .from("users_temp")
      .insert(DEMO_NAMES.map((name) => ({ name })))
      .select("id,name");

    const users: DemoUserRow[] = (usersData ?? []) as DemoUserRow[];

    if (usersError) {
      return res.status(500).json({ ok: false, message: usersError.message });
    }

    const { data: moviesData, error: moviesError } = await supabase
      .from("movies")
      .select("id,genre_id")
      .limit(60);
    const movies: DemoMovieRow[] = (moviesData ?? []) as DemoMovieRow[];
    if (moviesError || !movies || movies.length === 0) {
      return res.status(500).json({ ok: false, message: "No hay catálogo para crear demo" });
    }

    const genreRows: Array<{ user_id: string; genre_id: number }> = [];
    const movieRows: Array<{ user_id: string; movie_id: number }> = [];

    for (const user of users ?? []) {
      const preferred = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      const uniquePreferred = [...new Set(preferred)];
      uniquePreferred.forEach((genreId) => genreRows.push({ user_id: user.id, genre_id: genreId }));

      for (const genreId of uniquePreferred) {
        const candidates = movies.filter((movie) => movie.genre_id === genreId).slice(0, 10);
        const picks = candidates.sort(() => 0.5 - Math.random()).slice(0, 3);
        picks.forEach((movie) => movieRows.push({ user_id: user.id, movie_id: movie.id }));
      }
    }

    if (genreRows.length > 0) {
      await supabase.from("user_genres").insert(genreRows);
    }
    if (movieRows.length > 0) {
      await supabase.from("user_movie_choices").insert(movieRows);
    }

    return res.status(200).json({ ok: true, message: "Dataset demo cargado" });
  } catch (error) {
    console.error("[admin-load-demo]", error);
    return res.status(500).json({ ok: false, message: "No se pudo crear dataset demo" });
  }
}
