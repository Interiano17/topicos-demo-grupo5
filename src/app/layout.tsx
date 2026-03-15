import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "simulador-recs",
  description: "Demo educativa para simular recomendaciones CF + CB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
