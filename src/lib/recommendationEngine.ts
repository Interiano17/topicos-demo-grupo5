export type User = { id: string; name: string };
export type Movie = {
  id: number;
  title: string;
  genre_id: number;
  tags: string[];
  popularity?: number;
};
export type Choices = { genres: number[]; movies: number[] };
export type ExplanationReason = { type: string; detail: string };
export type ExplanationItem = {
  movie_id: number;
  reasons: ExplanationReason[];
  score: number;
};
export type RecommendationResult = {
  user_id: string;
  items: number[];
  explanation: ExplanationItem[];
};

export type RecommendationOptions = {
  minUsersForCF?: number;
  cfWeight?: number;
  cbWeight?: number;
  popularityWeight?: number;
  topK?: number;
};

export type UserProfile = {
  genres: Set<number>;
  tags: Set<string>;
  chosenMovies: Set<number>;
};

/**
 * Construye vectores binarios por usuario sobre el catálogo de películas.
 */
export function buildUserVectors(
  users: User[],
  movies: Movie[],
  choicesMap: Record<string, Choices>,
): Record<string, number[]> {
  return users.reduce<Record<string, number[]>>((acc, user) => {
    const selected = new Set(choicesMap[user.id]?.movies ?? []);
    acc[user.id] = movies.map((movie) => (selected.has(movie.id) ? 1 : 0));
    return acc;
  }, {});
}

/**
 * Calcula similitud coseno entre dos vectores.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Suma ponderada de similitudes de usuarios que eligieron la película.
 * movieId es índice 1-based del vector (no el id real de tabla).
 */
export function computeCFScore(
  userId: string,
  movieId: number,
  userVectors: Record<string, number[]>,
  movieIndexMap?: Record<number, number>,
): number {
  const users = Object.keys(userVectors);
  const target = userVectors[userId];
  if (!target || movieId <= 0) {
    return 0;
  }

  const index = movieIndexMap?.[movieId] ?? movieId - 1;
  if (index < 0) {
    return 0;
  }
  let score = 0;

  for (const otherId of users) {
    if (otherId === userId) continue;
    const other = userVectors[otherId];
    if (!other || other[index] !== 1) continue;
    const sim = cosineSimilarity(target, other);
    if (sim > 0) {
      score += sim;
    }
  }

  return score;
}

/**
 * Calcula score content-based por overlap de tags y match de género.
 */
export function computeCBScore(userId: string, movie: Movie, userProfile: UserProfile): number {
  void userId;
  const movieTags = new Set(movie.tags ?? []);

  const intersection = [...movieTags].filter((tag) => userProfile.tags.has(tag)).length;
  const union = new Set([...movieTags, ...userProfile.tags]).size;
  const jaccard = union === 0 ? 0 : intersection / union;
  const genreBonus = userProfile.genres.has(movie.genre_id) ? 0.3 : 0;

  return Math.min(1, jaccard + genreBonus);
}

/**
 * Normaliza un arreglo de scores al rango [0,1].
 */
export function normalize(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) {
    return scores.map(() => 0);
  }
  return scores.map((score) => (score - min) / (max - min));
}

function buildUserProfile(
  userId: string,
  movies: Movie[],
  choicesMap: Record<string, Choices>,
): UserProfile {
  const choices = choicesMap[userId] ?? { genres: [], movies: [] };
  const chosenMovies = new Set(choices.movies);
  const tags = new Set<string>();

  for (const movie of movies) {
    if (!chosenMovies.has(movie.id)) continue;
    for (const tag of movie.tags ?? []) {
      tags.add(tag);
    }
  }

  return {
    genres: new Set(choices.genres),
    tags,
    chosenMovies,
  };
}

function computePopularityMap(movies: Movie[]): Record<number, number> {
  const values = movies.map((movie) => movie.popularity ?? 0);
  const normalized = normalize(values);
  const out: Record<number, number> = {};
  movies.forEach((movie, idx) => {
    out[movie.id] = normalized[idx] ?? 0;
  });
  return out;
}

function buildSimilarityMap(
  userVectors: Record<string, number[]>,
): Record<string, Record<string, number>> {
  const users = Object.keys(userVectors);
  const similarity: Record<string, Record<string, number>> = {};

  for (const userId of users) {
    similarity[userId] = {};
    for (const otherId of users) {
      if (userId === otherId) continue;
      similarity[userId][otherId] = cosineSimilarity(userVectors[userId], userVectors[otherId]);
    }
  }

  return similarity;
}

function interleaveByGenre(
  sortedCandidates: { movie: Movie; score: number; explanation: ExplanationItem }[],
  choices: Choices,
  moviesById: Map<number, Movie>,
  topK: number,
): { movie: Movie; score: number; explanation: ExplanationItem }[] {
  if (choices.genres.length <= 1) {
    return sortedCandidates.slice(0, topK);
  }

  const perGenreCount = new Map<number, number>();
  for (const movieId of choices.movies) {
    const genreId = moviesById.get(movieId)?.genre_id;
    if (genreId) {
      perGenreCount.set(genreId, (perGenreCount.get(genreId) ?? 0) + 1);
    }
  }

  const grouped = new Map<
    number,
    { movie: Movie; score: number; explanation: ExplanationItem }[]
  >();
  for (const candidate of sortedCandidates) {
    const arr = grouped.get(candidate.movie.genre_id) ?? [];
    arr.push(candidate);
    grouped.set(candidate.movie.genre_id, arr);
  }

  const priorityGenres = [...choices.genres].sort(
    (a, b) => (perGenreCount.get(b) ?? 1) - (perGenreCount.get(a) ?? 1),
  );

  const selected: { movie: Movie; score: number; explanation: ExplanationItem }[] = [];
  while (selected.length < topK) {
    let addedRound = false;
    for (const genreId of priorityGenres) {
      const list = grouped.get(genreId);
      if (!list || list.length === 0) continue;
      selected.push(list.shift()!);
      addedRound = true;
      if (selected.length === topK) break;
    }
    if (!addedRound) break;
  }

  if (selected.length < topK) {
    const leftovers = [...grouped.values()].flat();
    selected.push(...leftovers.slice(0, topK - selected.length));
  }

  return selected.slice(0, topK);
}

/**
 * Orquesta generación de recomendaciones CF + CB + popularidad con fallback robusto.
 */
export function generateRecommendationsForAll(
  users: User[],
  movies: Movie[],
  choicesMap: Record<string, Choices>,
  options: RecommendationOptions = {},
): RecommendationResult[] {
  const minUsersForCF = options.minUsersForCF ?? 5;
  const cfWeight = options.cfWeight ?? 0.7;
  const cbWeight = options.cbWeight ?? 0.25;
  const popularityWeight = options.popularityWeight ?? 0.05;
  const topK = options.topK ?? 5;

  if (users.length === 0 || movies.length === 0) {
    return [];
  }

  const vectors = buildUserVectors(users, movies, choicesMap);
  const similarityMap = buildSimilarityMap(vectors);
  const popularityMap = computePopularityMap(movies);
  const movieIndexMap = movies.reduce<Record<number, number>>((acc, movie, index) => {
    acc[movie.id] = index;
    return acc;
  }, {});
  const moviesById = new Map<number, Movie>(movies.map((movie) => [movie.id, movie]));

  return users.map((user) => {
    const profile = buildUserProfile(user.id, movies, choicesMap);
    const userChoices = choicesMap[user.id] ?? { genres: [], movies: [] };
    const alreadyChosen = profile.chosenMovies;

    const candidates = movies.filter((movie) => !alreadyChosen.has(movie.id));
    const cfRaw: number[] = [];
    const cbRaw: number[] = [];
    const popRaw: number[] = [];

    const canUseCF =
      users.length >= minUsersForCF && Object.keys(similarityMap[user.id] ?? {}).length > 0;

    candidates.forEach((movie, idx) => {
      cfRaw[idx] = canUseCF ? computeCFScore(user.id, movie.id, vectors, movieIndexMap) : 0;
      cbRaw[idx] = computeCBScore(user.id, movie, profile);
      popRaw[idx] = popularityMap[movie.id] ?? 0;
    });

    const cfNorm = normalize(cfRaw);
    const cbNorm = normalize(cbRaw);
    const popNorm = normalize(popRaw);

    const scored = candidates.map((movie, idx) => {
      const cf = cfNorm[idx] ?? 0;
      const cb = cbNorm[idx] ?? 0;
      const pop = popNorm[idx] ?? 0;
      const finalScore = cfWeight * cf + cbWeight * cb + popularityWeight * pop;

      const reasons: ExplanationReason[] = [];

      if (!canUseCF) {
        reasons.push({
          type: "fallback_content_based",
          detail: "Se usó recomendación por contenido porque aún hay pocos participantes.",
        });
      } else if (cf > cb) {
        const similarUsers = Object.entries(similarityMap[user.id] ?? {})
          .filter(([, value]) => value > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([id]) => users.find((u) => u.id === id)?.name ?? "participante");
        reasons.push({
          type: "similar_users",
          detail: `Usuarios con gustos parecidos (${similarUsers.join(", ") || "grupo"}) eligieron títulos relacionados.`,
        });
      }

      if (profile.genres.has(movie.genre_id)) {
        reasons.push({
          type: "genre_match",
          detail: "Coincide con uno de tus géneros seleccionados.",
        });
      }

      const matchedTags = movie.tags.filter((tag) => profile.tags.has(tag)).slice(0, 2);
      if (matchedTags.length > 0) {
        reasons.push({
          type: "tag_overlap",
          detail: `Comparte etiquetas con tus elecciones: ${matchedTags.join(", ")}.`,
        });
      }

      if (pop > 0.6) {
        reasons.push({
          type: "popularity",
          detail: "Esta película es popular entre el grupo de la clase.",
        });
      }

      const explanation: ExplanationItem = {
        movie_id: movie.id,
        reasons: reasons.slice(0, 3),
        score: Number(finalScore.toFixed(4)),
      };

      return { movie, score: finalScore, explanation };
    });

    const ordered = scored.sort((a, b) => b.score - a.score);
    const selected = interleaveByGenre(ordered, userChoices, moviesById, topK);

    return {
      user_id: user.id,
      items: selected.map((entry) => entry.movie.id),
      explanation: selected.map((entry) => entry.explanation),
    };
  });
}
