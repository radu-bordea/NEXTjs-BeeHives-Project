import "./globals.css";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import AuthProvider from "./components/AuthProvider";
import ManualPanel from "./components/ManualPanel";
import { manualSections } from "@/lib/manual"; // ✅ Import the array

export const metadata = {
  title: "BeeHives Project",
  keywords: "scales, production, measurements",
  description: "Check evolution of beehives data",
};

export default function MainLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="flex flex-col min-h-screen overflow-x-hidden">
        <AuthProvider>
          <Navbar />
          {/* ✅ Manual panel using imported sections */}
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
