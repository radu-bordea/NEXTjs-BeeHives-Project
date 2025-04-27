"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4 bg-white shadow-md">
      {/* Left side navigation  */}
      <div className="flex items-center space-x-6">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Home
        </Link>
        <Link href="/scales" className="hover:text-blue-600">
          Scales
        </Link>
        <Link href="/analytics" className="hover:text-blue-500">
          Analytics
        </Link>
        <Link href="/about" className="hover:text-blue-600">
          About
        </Link>
      </div>

      {/* Right side navigation  */}
      <div className="flex items-center space-x-4">
        {/* Later replace with NextAuth session info  */}
        <Link href="/login" className="text-blue-600 hover:text-blue-800">
          Login
        </Link>
      </div>
    </nav>
  );
}
