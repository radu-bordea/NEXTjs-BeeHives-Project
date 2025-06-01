import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import AuthProvider from "./components/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "BeeHives Project",
  keywords: "scales, production, measurements",
  description: "Check evolution of beehives data",
};

const MainLayout = ({ children }) => {
  return (
    <AuthProvider>
      <html lang="en" className="overflow-x-hidden">
        <body className="flex flex-col min-h-screen overflow-x-hidden">
          <Navbar />
          <main className="flex-grow">{children}</main>
          <Footer />
        </body>
      </html>
    </AuthProvider>
  );
};

export default MainLayout;
