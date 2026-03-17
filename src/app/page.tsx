import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JoinForm } from "@/components/JoinForm";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <section className="surface reveal-up mb-6 rounded-2xl p-6 shadow-2xl shadow-black/25">
          <h2 className="text-2xl font-bold text-brand-900">Únete a la simulación</h2>
          <p className="mt-2 text-brand-700">
            Ingresa tu nombre para crear un usuario temporal y comenzar con la selección de
            preferencias.
          </p>
        </section>
        <JoinForm />
      </main>
      <Footer />
    </div>
  );
}
