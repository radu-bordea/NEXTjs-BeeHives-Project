// app/layout.jsx
import "./globals.css";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import AuthProvider from "./components/AuthProvider";
import ManualPanel from "./components/ManualPanel";
import ThemeScript from "./components/ThemeScript";
import { manualSections } from "@/lib/manual";

export const metadata = {
  title: "BeeHives Project",
  keywords: "scales, production, measurements",
  description: "Check evolution of beehives data",
};

export default function MainLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        {/* Let browsers know we support both schemes */}
        <meta name="color-scheme" content="light dark" />
        {/* theme-color is set dynamically by ThemeScript too */}
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
      </body>
    </html>
  );
}
