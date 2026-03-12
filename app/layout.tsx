import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const montserrat = Montserrat({
  subsets:  ["latin"],
  variable: "--font-montserrat",
  display:  "swap",
  weight:   ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  display:  "swap",
  weight:   ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Festival de Salsa y Timba · Chancay 2026 | Perion Entertainment",
  description:
    "Primer Festival de Salsa y Timba en Chancay — 29 de Marzo 2026. Compra tus entradas online: Platinum, Super VIP, VIP y General. Malecón del Puerto de Chancay.",
  keywords:
    "festival salsa, timba, chancay, concierto, perion entertainment, música cubana, evento, entradas",
};

// Posiciones determinísticas (evita hydration mismatch con Math.random())
const STARS = Array.from({ length: 55 }, (_, i) => ({
  top:   `${((i * 31 + 17) % 97).toFixed(2)}%`,
  left:  `${((i * 53 + 11) % 97).toFixed(2)}%`,
  delay: `${((i * 7  +  3) % 40) / 10}s`,
  size:  i % 7 === 0 ? 3 : 2,
}));

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        {/* Fondo de estrellas */}
        <div className="stars-bg" aria-hidden="true">
          {STARS.map((s, i) => (
            <div
              key={i}
              className="star"
              style={{
                top:            s.top,
                left:           s.left,
                width:          `${s.size}px`,
                height:         `${s.size}px`,
                animationDelay: s.delay,
              }}
            />
          ))}
        </div>
        {children}
        {/* Culqi.js — tokenización de tarjetas y Yape */}
        <Script
          src="https://checkout.culqi.com/js/v4"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
