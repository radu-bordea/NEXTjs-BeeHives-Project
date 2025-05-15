"use client";
import Link from "next/link";
import { usePathname } from "next/navigation"; // Use usePathname instead of useRouter
import DarkModeToggle from "./DarkModeToggle";

export default function Navbar() {
  const pathname = usePathname(); // Get the current path using usePathname

  // Helper function to check if the link is active
  const isActive = (path) => pathname === path;

  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow-md">
      {/* Left side navigation */}
      <div className="flex items-center space-x-6">
      <DarkModeToggle/>
        <Link
          href="/"
          className={` ${isActive("/") ? "text-blue-600" : "text-gray-800"}`}
        >
          Home
        </Link>
        <Link
          href="/scales"
          className={`hover:text-blue-600 ${
            isActive("/scales") ? "text-blue-600" : "text-gray-800"
          }`}
        >
          Scales
        </Link>
        <Link
          href="/analytics"
          className={`hover:text-blue-500 ${
            isActive("/analytics") ? "text-blue-600" : "text-gray-800"
          }`}
        >
          Analytics
        </Link>
        <Link
          href="/about"
          className={`hover:text-blue-600 ${
            isActive("/about") ? "text-blue-600" : "text-gray-800"
          }`}
        >
          About
        </Link>
        <Link
          href="/admin"
          className={`hover:text-blue-600 ${
            isActive("/admin") ? "text-blue-600" : "text-gray-800"
          }`}
        >
          Admin
        </Link>
      </div>

      {/* Right side navigation */}
      <div className="flex items-center space-x-4">
        {/* Later replace with NextAuth session info */}
        <Link href="/login" className="text-blue-600 hover:text-blue-800">
          Login
        </Link>
      </div>
    </nav>
  );
}
