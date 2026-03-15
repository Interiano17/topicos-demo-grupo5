import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/generate-recommendations";
import { createServiceRoleClient } from "@/lib/supabaseClient";

jest.mock("@/lib/supabaseClient", () => ({
  createServiceRoleClient: jest.fn(),
}));

function createMockRes() {
  const res = {} as NextApiResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("/api/generate-recommendations", () => {
  beforeEach(() => {
    process.env.ADMIN_KEY = "secret";
    process.env.MIN_USERS_FOR_CF = "2";
    process.env.CF_WEIGHT = "0.6";
    process.env.CB_WEIGHT = "0.3";
    process.env.POPULARITY_WEIGHT = "0.1";
    process.env.TOP_K_RECOMMEND = "3";
  });

  test("retorna 401 sin admin key", async () => {
    const req = { method: "POST", headers: {} } as NextApiRequest;
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("procesa y escribe recomendaciones", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });

    const fromMock = jest.fn((table: string) => {
      if (table === "users_temp") {
        return {
          select: jest.fn().mockResolvedValue({ data: [{ id: "u1", name: "Ana" }], error: null }),
        };
      }
      if (table === "user_genres") {
        return {
          select: jest
            .fn()
            .mockResolvedValue({ data: [{ user_id: "u1", genre_id: 1 }], error: null }),
        };
      }
      if (table === "user_movie_choices") {
        return {
          select: jest
            .fn()
            .mockResolvedValue({ data: [{ user_id: "u1", movie_id: 1 }], error: null }),
        };
      }
      if (table === "movies") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [
              { id: 1, title: "A", genre_id: 1, tags: ["accion"], popularity: 10 },
              { id: 2, title: "B", genre_id: 1, tags: ["accion"], popularity: 8 },
            ],
            error: null,
          }),
        };
      }
      if (table === "recommendations") {
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: [{ version: 2 }], error: null }),
            })),
          })),
          insert: insertMock,
        };
      }
      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    (createServiceRoleClient as jest.Mock).mockReturnValue({ from: fromMock });

    const req = {
      method: "POST",
      headers: { "x-admin-key": "secret" },
    } as unknown as NextApiRequest;
    const res = createMockRes();

    await handler(req, res);

    expect(insertMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
