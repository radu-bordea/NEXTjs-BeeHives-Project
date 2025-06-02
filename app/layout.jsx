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
        <body className="flex flex-col h-screen overflow-hidden">
          <Navbar />
          <main className="flex-grow overflow-hidden">{children}</main>
          <Footer />
        </body>
      </html>
    </AuthProvider>
  );
};

export default MainLayout;
