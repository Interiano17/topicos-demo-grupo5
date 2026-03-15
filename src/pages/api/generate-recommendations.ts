import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateRecommendationsForAll,
  type Choices,
  type Movie,
  type User,
} from "@/lib/recommendationEngine";
import { createServiceRoleClient } from "@/lib/supabaseClient";

type ResponseData = {
  ok: boolean;
  processed?: number;
  version?: number;
  message?: string;
};

export function buildChoicesMap(
  users: User[],
  genreRows: Array<{ user_id: string; genre_id: number }>,
  movieRows: Array<{ user_id: string; movie_id: number }>,
): Record<string, Choices> {
  const out: Record<string, Choices> = {};

  users.forEach((user) => {
    out[user.id] = { genres: [], movies: [] };
  });

  genreRows.forEach((row) => {
    if (!out[row.user_id]) {
      out[row.user_id] = { genres: [], movies: [] };
    }
    out[row.user_id].genres.push(row.genre_id);
  });

  movieRows.forEach((row) => {
    if (!out[row.user_id]) {
      out[row.user_id] = { genres: [], movies: [] };
    }
    out[row.user_id].movies.push(row.movie_id);
  });

  return out;
}

function readConfig() {
  return {
    minUsersForCF: Number(process.env.MIN_USERS_FOR_CF ?? 5),
    cfWeight: Number(process.env.CF_WEIGHT ?? 0.7),
    cbWeight: Number(process.env.CB_WEIGHT ?? 0.25),
    popularityWeight: Number(process.env.POPULARITY_WEIGHT ?? 0.05),
    topK: Number(process.env.TOP_K_RECOMMEND ?? 5),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  const adminKey = req.headers["x-admin-key"];
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, message: "No autorizado" });
  }

  try {
    const supabase = createServiceRoleClient();

    const [usersResp, genresResp, moviesChoicesResp, moviesResp, versionResp] = await Promise.all([
      supabase.from("users_temp").select("id,name"),
      supabase.from("user_genres").select("user_id,genre_id"),
      supabase.from("user_movie_choices").select("user_id,movie_id"),
      supabase.from("movies").select("id,title,genre_id,tags,popularity"),
      supabase
        .from("recommendations")
        .select("version")
        .order("version", { ascending: false })
        .limit(1),
    ]);

    if (
      usersResp.error ||
      genresResp.error ||
      moviesChoicesResp.error ||
      moviesResp.error ||
      versionResp.error
    ) {
      console.error("[generate-recommendations] error consulta", {
        users: usersResp.error?.message,
        genres: genresResp.error?.message,
        choices: moviesChoicesResp.error?.message,
        movies: moviesResp.error?.message,
        version: versionResp.error?.message,
      });
      return res.status(500).json({ ok: false, message: "No se pudo leer la base de datos" });
    }

    const users = (usersResp.data ?? []) as User[];
    const genreRows = (genresResp.data ?? []) as Array<{ user_id: string; genre_id: number }>;
    const movieRows = (moviesChoicesResp.data ?? []) as Array<{
      user_id: string;
      movie_id: number;
    }>;
    const movies = (moviesResp.data ?? []) as Movie[];

    const choicesMap = buildChoicesMap(users, genreRows, movieRows);

    const generated = generateRecommendationsForAll(users, movies, choicesMap, readConfig());
    const currentVersion = versionResp.data?.[0]?.version ?? 0;
    const nextVersion = currentVersion + 1;

    const payload = generated.map((entry) => ({
      user_id: entry.user_id,
      items: entry.items,
      explanation: entry.explanation,
      version: nextVersion,
    }));

    if (payload.length > 0) {
      const { error: insertError } = await supabase.from("recommendations").insert(payload);
      if (insertError) {
        console.error("[generate-recommendations] error insert", insertError.message);
        return res
          .status(500)
          .json({ ok: false, message: "No se pudieron guardar recomendaciones" });
      }
    }

    console.info("[generate-recommendations] completado", {
      users: users.length,
      processed: payload.length,
      version: nextVersion,
    });

    return res.status(200).json({ ok: true, processed: payload.length, version: nextVersion });
  } catch (error) {
    console.error("[generate-recommendations] excepción", error);
    return res.status(500).json({ ok: false, message: "Error interno" });
  }
}
