import {
  buildUserVectors,
  computeCFScore,
  cosineSimilarity,
  generateRecommendationsForAll,
  normalize,
  type Choices,
  type Movie,
  type User,
} from "@/lib/recommendationEngine";

const users: User[] = [
  { id: "u1", name: "Ana" },
  { id: "u2", name: "Luis" },
  { id: "u3", name: "Mia" },
  { id: "u4", name: "Ivan" },
  { id: "u5", name: "Nora" },
];

const movies: Movie[] = [
  { id: 1, title: "A", genre_id: 1, tags: ["accion"], popularity: 10 },
  { id: 2, title: "B", genre_id: 1, tags: ["accion", "espionaje"], popularity: 8 },
  { id: 3, title: "C", genre_id: 2, tags: ["ai"], popularity: 7 },
  { id: 4, title: "D", genre_id: 3, tags: ["comedia"], popularity: 9 },
  { id: 5, title: "E", genre_id: 2, tags: ["espacio"], popularity: 6 },
  { id: 6, title: "F", genre_id: 1, tags: ["accion", "thriller"], popularity: 9 },
];

const choicesMap: Record<string, Choices> = {
  u1: { genres: [1], movies: [1, 2] },
  u2: { genres: [1], movies: [1, 6] },
  u3: { genres: [2], movies: [3, 5] },
  u4: { genres: [1, 2], movies: [2, 3] },
  u5: { genres: [3], movies: [4] },
};

describe("recommendation engine", () => {
  test("cosineSimilarity maneja vectores nulos", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
  });

  test("buildUserVectors construye binarios correctos", () => {
    const vectors = buildUserVectors(users, movies, choicesMap);
    expect(vectors.u1).toEqual([1, 1, 0, 0, 0, 0]);
    expect(vectors.u5).toEqual([0, 0, 0, 1, 0, 0]);
  });

  test("computeCFScore suma votos ponderados por similitud", () => {
    const vectors = buildUserVectors(users, movies, choicesMap);
    const score = computeCFScore("u1", 6, vectors, { 6: 5 });
    expect(score).toBeGreaterThan(0);
  });

  test("normalize retorna rango 0..1", () => {
    expect(normalize([10, 20, 30])).toEqual([0, 0.5, 1]);
  });

  test("fallback por pocos usuarios genera razon explicativa", () => {
    const partialUsers = users.slice(0, 2);
    const partialChoices: Record<string, Choices> = { u1: choicesMap.u1, u2: choicesMap.u2 };
    const results = generateRecommendationsForAll(partialUsers, movies, partialChoices, {
      minUsersForCF: 5,
      topK: 3,
    });

    expect(results).toHaveLength(2);
    const first = results[0];
    expect(first.explanation[0]?.reasons.some((r) => r.type === "fallback_content_based")).toBe(
      true,
    );
  });

  test("generateRecommendationsForAll produce formato esperado", () => {
    const results = generateRecommendationsForAll(users, movies, choicesMap, {
      minUsersForCF: 3,
      topK: 3,
    });

    expect(results[0].items).toHaveLength(3);
    expect(results[0].explanation[0]).toEqual(
      expect.objectContaining({
        movie_id: expect.any(Number),
        score: expect.any(Number),
      }),
    );
  });
});
