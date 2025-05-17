"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiHamburgerMenu } from "react-icons/gi";
import { AiOutlineClose } from "react-icons/ai";
import DarkModeToggle from "./DarkModeToggle";

// Reusable nav items array
const navItems = [
  { label: "Home", path: "/" },
  { label: "Scales", path: "/scales" },
  { label: "Analytics", path: "/analytics" },
  { label: "About", path: "/about" },
  { label: "Admin", path: "/admin" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine if a link matches the current route
  const isActive = (path) => pathname === path;

  // Toggle mobile menu visibility
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Close menu (used in multiple places)
  const closeMenu = () => setIsMobileMenuOpen(false);

  // Listen for ESC key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }

    // Cleanup on unmount
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className=" shadow-md p-4 relative z-50">
      <div className="flex items-center justify-between">
        {/* Left: Logo and dark mode toggle */}
        <div className="flex items-center space-x-4">
          <DarkModeToggle />
          <Link href="/" className="text-xl font-semibold text-gray-500">
            Logo
          </Link>
        </div>

        {/* Mobile: Hamburger toggle button */}
        <div className="md:hidden">
          <button
            onClick={toggleMobileMenu}
            className="text-gray-500 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <AiOutlineClose size={24} />
            ) : (
              <GiHamburgerMenu size={24} />
            )}
          </button>
        </div>

        {/* Desktop: Navigation links */}
        <div className="hidden md:flex space-x-6 items-center">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              href={path}
              className={`hover:text-blue-600 ${
                isActive(path)
                  ? "text-blue-600"
                  : "text-gray-800 dark:text-gray-500"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className={`hover:text-blue-600 ${
              isActive("/login")
                ? "text-blue-600"
                : "text-gray-800 dark:text-gray-500"
            }`}
          >
            Login
          </Link>
        </div>
      </div>

      {/* Mobile: Sliding drawer menu */}
      <div
        className={`fixed top-0 right-0 h-full w-2/3 max-w-xs dark:bg-black shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col p-4 space-y-4">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              href={path}
              className={`text-lg hover:text-blue-600 ${
                isActive(path) ? "text-blue-600" : "text-gray-500"
              }`}
              onClick={closeMenu}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className={`hover:text-blue-600 ${
              isActive("/login")
                ? "text-blue-600"
                : "text-gray-800 dark:text-gray-500"
            }`}
            onClick={closeMenu}
          >
            Login
          </Link>
        </div>
      </div>

      {/* Mobile: Click-outside overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0  dark:bg-black opacity-30 z-30"
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
