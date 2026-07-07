import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "AQWELIA — Copilote Intelligent pour Piscine",
  description: "AQWELIA — l'application révolutionnaire de gestion de piscine propulsée par l'IA : assistant expert, analyse visuelle de l'eau, plan d'action déterministe et plus encore.",
  keywords: ["piscine", "IA", "entretien", "qualité eau", "assistant intelligent", "AQWELIA", "aqua", "well"],
  authors: [{ name: "AQWELIA" }],
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the locale + message bundle on the server. Falls back to the
  // default locale (`fr`) configured in `src/i18n/config.ts`.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased bg-background text-foreground`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </NextIntlClientProvider>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
