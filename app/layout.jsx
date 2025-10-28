"use client";

import "./globals.css";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import AuthProvider from "./components/AuthProvider";
import ManualPanel from "./components/ManualPanel";
import ThemeScript from "./components/ThemeScript";
import { manualSections } from "@/lib/manual";
import { LanguageProvider, useLang } from "./components/LanguageProvider";
import Head from "next/head";

// ✅ A small internal component to use translations in <head>
function LocalizedHead() {
  const { t, lang } = useLang();

  return (
    <Head>
      <title>{t("layout.title")}</title>
      <meta name="description" content={t("layout.description")} />
      <meta name="keywords" content={t("layout.keywords")} />
      <meta name="color-scheme" content="light dark" />
      <meta
        name="theme-color"
        content="#ffffff"
        media="(prefers-color-scheme: light)"
      />
      <meta
        name="theme-color"
        content="#0a0a0a"
        media="(prefers-color-scheme: dark)"
      />
      <meta name="language" content={lang} />
    </Head>
  );
}

export default function MainLayout({ children }) {
  return (
    <html lang="sv" className="overflow-x-hidden" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen overflow-x-hidden bg-[color:var(--background)] text-[color:var(--foreground)]">
        <LanguageProvider>
          <LocalizedHead /> {/* ✅ dynamic metadata */}
          <AuthProvider>
            <Navbar />
            <ManualPanel
              side="right"
              title="Beehives Manual"
              sections={manualSections}
            />
            <main className="flex-grow">{children}</main>
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
