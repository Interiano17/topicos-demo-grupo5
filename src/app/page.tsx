import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JoinForm } from "@/components/JoinForm";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-100 via-brand-50 to-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="mb-6 rounded-2xl bg-white/80 p-6 shadow-md">
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
