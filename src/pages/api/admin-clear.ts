import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceRoleClient } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, message: "No autorizado" });
  }

  try {
    const supabase = createServiceRoleClient();

    await supabase.from("recommendations").delete().gt("id", 0);
    await supabase.from("user_movie_choices").delete().gt("id", 0);
    await supabase.from("user_genres").delete().gt("id", 0);
    await supabase.from("users_temp").delete().not("id", "is", null);

    return res.status(200).json({ ok: true, message: "Datos eliminados para nueva demo" });
  } catch (error) {
    console.error("[admin-clear]", error);
    return res.status(500).json({ ok: false, message: "No se pudo limpiar" });
  }
}
