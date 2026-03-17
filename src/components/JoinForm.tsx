"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

const schema = z.object({
  name: z.string().trim().min(2, "Ingresa al menos 2 caracteres").max(40, "Máximo 40 caracteres"),
});

export function JoinForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = schema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Nombre inválido.");
      return;
    }

    setLoading(true);
    const { data, error: insertError } = await supabase
      .from("users_temp")
      .insert({ name: parsed.data.name })
      .select("id")
      .single();

    setLoading(false);

    if (insertError || !data?.id) {
      setError("No fue posible crear tu usuario temporal.");
      return;
    }

    localStorage.setItem("sim_user_id", data.id);
    localStorage.setItem("sim_user_name", parsed.data.name);
    router.push("/select");
  };

  return (
    <form
      className="surface reveal-up w-full space-y-4 rounded-2xl p-6 shadow-2xl shadow-black/25"
      onSubmit={handleSubmit}
    >
      <label className="block text-sm font-semibold text-brand-800" htmlFor="name">
        Nombre
      </label>
      <input
        id="name"
        aria-label="Nombre del participante"
        className="w-full rounded-xl border border-brand-300 bg-brand-100/70 px-4 py-3 text-brand-900 outline-none placeholder:text-brand-600 focus:border-primary-500"
        placeholder="Ejemplo: Ana"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        aria-label="Entrar a la demo"
        type="submit"
        disabled={loading}
        className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition disabled:opacity-70"
      >
        {loading ? (
          <>
            <Spinner size="sm" />
            Creando usuario...
          </>
        ) : (
          "Entrar"
        )}
      </button>
    </form>
  );
}
