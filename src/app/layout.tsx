import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./aqwelia-figma.css";
import "./aqwelia-flows.css";
import "./aqwelia-pro.css";
import "./aqwelia-type-fix.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { PostHogProvider } from "@/app/posthog-provider";
import {
  OrganizationSchema,
  SoftwareApplicationSchema,
  FAQPageSchema,
} from "@/components/seo/structured-data";

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "https://aqwelia.app"
    ),
    title: t("layoutTitle"),
    description: t("layoutDescription"),
    keywords: [
      t("layoutKeywordPool"),
      t("layoutKeywordAI"),
      t("layoutKeywordMaintenance"),
      t("layoutKeywordWaterQuality"),
      t("layoutKeywordSmartAssistant"),
      "AQWELIA",
      "aqua",
      "well",
    ],
    authors: [{ name: "AQWELIA" }],
    alternates: { canonical: "/" },
    icons: {
      icon: "/icon.png",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title: t("layoutTitle"),
      description: t("layoutDescription"),
      url: "/",
      siteName: "AQWELIA",
      type: "website",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      site: "@aqwelia_app",
      creator: "@aqwelia_app",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("landing");

  // Build the FAQ JSON-LD from the same i18n keys used by the Faq component
  // (faq.tsx) so the rich-result schema stays in sync with the visible UI.
  const FAQ_KEYS = [
    "faqQ1", "faqQ2", "faqQ3", "faqQ4", "faqQ5",
    "faqQ6", "faqQ7", "faqQ8", "faqProReplace", "faqHowIA",
    "faqSpaManage", "faqSellProducts", "faqGreenWater",
    "faqAllYear", "faqProVersion",
  ] as const;
  const FAQ_ANSWER_KEYS = [
    "faqA1", "faqA2", "faqA3", "faqA4", "faqA5",
    "faqA6", "faqA7", "faqA8", "faqProReplaceA", "faqHowIAA",
    "faqSpaManageA", "faqSellProductsA", "faqGreenWaterA",
    "faqAllYearA", "faqProVersionA",
  ] as const;
  const faqs = FAQ_KEYS.map((qKey, i) => ({
    question: t(qKey),
    answer: t(FAQ_ANSWER_KEYS[i]),
  }));

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased bg-background text-foreground`}
      >
        {/* SEO structured data — global (Organization, SoftwareApplication, FAQ) */}
        <OrganizationSchema />
        <SoftwareApplicationSchema />
        <FAQPageSchema faqs={faqs} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PostHogProvider>
            <Providers>
              {children}
              <Toaster />
            </Providers>
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
