// app/layout.jsx
import "./globals.css";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import AuthProvider from "./components/AuthProvider";
import ThemeScript from "./components/ThemeScript";
import { LanguageProvider } from "./components/LanguageProvider";
import ManualWrapper from "./components/ManualWrapper";

export const metadata = {
  title: "BeeHives Project",
  keywords: "scales, production, measurements",
  description: "Check evolution of beehives data",
};

export default function MainLayout({ children }) {
  return (
    <html lang="sv" className="overflow-x-hidden" suppressHydrationWarning>
      <head>
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
        <ThemeScript />
      </head>

      <body className="flex flex-col min-h-screen overflow-x-hidden bg-[color:var(--background)] text-[color:var(--foreground)]">
        <LanguageProvider>
          <AuthProvider>
            <Navbar />

            {/* this now uses t() and translated sections */}
            <ManualWrapper />

            <main className="flex-grow">{children}</main>
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
