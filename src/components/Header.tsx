export function Header() {
  return (
    <header className="border-b border-brand-200/80 bg-brand-100/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <h1 className="text-xl font-bold tracking-tight text-brand-900">
          Simulador de Recomendaciones
        </h1>
        <span className="text-sm text-brand-700">Demo educativa en tiempo real</span>
      </div>
    </header>
  );
}
