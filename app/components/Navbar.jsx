"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiHamburgerMenu } from "react-icons/gi";
import { AiOutlineDown, AiOutlineUp, AiOutlineClose } from "react-icons/ai";
import DarkModeToggle from "./DarkModeToggle";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";

// Define all navigation items (admin is protected)
const fullNavItems = [
  { label: "Home", path: "/" },
  { label: "Scales", path: "/scales" },
  { label: "Weight-Charts", path: "/weight-charts" },
  { label: "Analytics", path: "/analytics" },
  { label: "Maps", path: "/maps" },
  { label: "Admin", path: "/admin", protected: true },
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const isActive = (path) => pathname === path;
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  // ✅ Only include protected items for admins
  const navItems = useMemo(() => {
    return fullNavItems.filter((item) => {
      if (item.protected) return session?.user?.isAdmin === true;
      return true;
    });
  }, [session]);

  return (
    <nav className="shadow-md p-4 relative z-50">
      <div className="flex items-center justify-between">
        {/* Left: logo + toggle */}
        <div className="flex items-center space-x-4">
          <DarkModeToggle isDark={isDark} setIsDark={setIsDark} />
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative w-10 h-10">
              <Image
                src="/assets/images/eulogo.png"
                alt="Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative w-6 h-6">
              <Image
                src="/assets/images/halogo.png"
                alt="Logo"
                fill
                className={`object-contain ${!isDark ? "dark:invert" : ""}`}
                priority
              />
            </div>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden">
          <button
            onClick={toggleMobileMenu}
            className="text-gray-400 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <AiOutlineClose size={24} />
            ) : (
              <GiHamburgerMenu size={24} />
            )}
          </button>
        </div>

        {/* Desktop nav items */}
        <div className="hidden md:flex space-x-6 items-center">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              href={path}
              className={`hover:text-blue-400 ${
                isActive(path) ? "text-blue-400" : "text-gray-400"
              }`}
            >
              {label}
            </Link>
          ))}

          {!session ? (
            <button
              onClick={() => signIn("google")}
              className="text-gray-400 hover:text-blue-400"
            >
              Login
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full border border-gray-300"
                  />
                )}
                {session.user.name && (
                  <span className="text-gray-400 text-sm">
                    {session.user.name}
                  </span>
                )}
                {isDropdownOpen ? (
                  <AiOutlineUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <AiOutlineDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-6 w-20 bg-gray-700 rounded shadow-lg z-50">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="block w-full text-left px-4 py-2 text-sm cursor-pointer text-red-200"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-2/3 max-w-xs bg-white dark:bg-black shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col p-4 space-y-4">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              href={path}
              className={`text-lg hover:text-blue-400 ${
                isActive(path)
                  ? "text-blue-400"
                  : "text-gray-800 dark:text-gray-300"
              }`}
              onClick={closeMenu}
            >
              {label}
            </Link>
          ))}

          {!session ? (
            <button
              onClick={() => {
                signIn("google");
                closeMenu();
              }}
              className="text-lg text-gray-800 dark:text-gray-300 hover:text-blue-400 text-left"
            >
              Login
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full border border-gray-300"
                />
              )}
              {session.user.name && (
                <span className="text-gray-400 text-sm">
                  {session.user.name}
                </span>
              )}
              <button
                onClick={() => {
                  signOut({ callbackUrl: "/" });
                  closeMenu();
                }}
                className="text-lg text-red-400 hover:text-red-400 text-left cursor-pointer"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0 bg-black/50 dark:bg-white/10 z-30"
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
