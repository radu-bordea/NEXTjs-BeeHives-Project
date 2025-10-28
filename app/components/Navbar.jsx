"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiHamburgerMenu } from "react-icons/gi";
import { AiOutlineDown, AiOutlineUp, AiOutlineClose } from "react-icons/ai";
import ThemeToggle from "./ThemeToggle";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { ManualButton } from "./ManualButton";

// 👇 import translations
import { useLang } from "./LanguageProvider";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // translation context
  const { t, lang, setLang } = useLang();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const isActive = (path) => pathname === path;
  const toggleMobileMenu = () => setIsMobileMenuOpen((p) => !p);
  const closeMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    if (isMobileMenuOpen) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [isMobileMenuOpen]);

  // nav items now use translation keys
  const fullNavItems = [
    { labelKey: "nav.home", path: "/" },
    { labelKey: "nav.scales", path: "/scales" },
    { labelKey: "nav.weightCharts", path: "/weight-charts" },
    { labelKey: "nav.maps", path: "/maps" },
    { labelKey: "nav.admin", path: "/admin", protected: true },
  ];

  const navItems = useMemo(
    () =>
      fullNavItems.filter((i) =>
        i.protected ? session?.user?.isAdmin === true : true
      ),
    [session]
  );

  return (
    <nav
      className="
        relative z-50 p-4 shadow-md border-b
        bg-[color:var(--background)]
        text-[color:var(--foreground)]
        border-[color:var(--border)]
      "
    >
      <div className="flex items-center justify-between">
        {/* Left: theme + logos */}
        <div className="flex items-center gap-4">
          <ThemeToggle />

          <Link href="/" className="flex items-center gap-2">
            <span className="relative w-10 h-10">
              <Image
                src="/assets/images/eulogo.png"
                alt="EU Logo"
                fill
                className="object-contain"
                priority
              />
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 border-1 bg-black rounded-full p-0.5"
          >
            <span className="relative w-5 h-5">
              <Image
                src="/assets/images/halogo.png"
                alt="HA Logo"
                fill
                className="object-contain"
                priority
              />
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map(({ path, labelKey }) => (
            <Link
              key={path}
              href={path}
              className={`
                transition
                ${
                  isActive(path)
                    ? "text-blue-600 dark:text-blue-400"
                    : "opacity-80 supports-[hover:hover]:hover:opacity-100"
                }
              `}
            >
              {t(labelKey)}
            </Link>
          ))}

          {/* Manual button text also translated */}
          <ManualButton label={t("nav.manual")} />

          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen((p) => !p)}
              className="flex items-center gap-2 text-sm px-2 py-1 rounded border border-[color:var(--border)] opacity-80 supports-[hover:hover]:hover:opacity-100"
            >
              {lang === "sv" ? "SV" : "EN"}
              {isLangMenuOpen ? (
                <AiOutlineUp className="w-4 h-4" />
              ) : (
                <AiOutlineDown className="w-4 h-4" />
              )}
            </button>

            {isLangMenuOpen && (
              <div
                className="
                  absolute right-0 mt-2 w-32 rounded-lg shadow-lg z-50
                  bg-[color:var(--card)]
                  border border-[color:var(--border)]
                "
              >
                <button
                  onClick={() => {
                    setLang("sv");
                    setIsLangMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm supports-[hover:hover]:hover:opacity-90 ${
                    lang === "sv" ? "font-semibold" : ""
                  }`}
                >
                  {t("navbar.lang.sv")}
                </button>
                <button
                  onClick={() => {
                    setLang("en");
                    setIsLangMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm supports-[hover:hover]:hover:opacity-90 ${
                    lang === "en" ? "font-semibold" : ""
                  }`}
                >
                  {t("navbar.lang.en")}
                </button>
              </div>
            )}
          </div>

          {/* Auth: login/logout */}
          {!session ? (
            <button
              onClick={() => signIn("google")}
              className="transition opacity-80 supports-[hover:hover]:hover:opacity-100"
            >
              {t("nav.login")}
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen((p) => !p)}
                className="flex items-center gap-2 focus:outline-none transition opacity-80 supports-[hover:hover]:hover:opacity-100"
              >
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full border border-[color:var(--border)]"
                  />
                )}
                {session.user.name && (
                  <span className="text-sm">{session.user.name}</span>
                )}
                {isDropdownOpen ? (
                  <AiOutlineUp className="w-4 h-4" />
                ) : (
                  <AiOutlineDown className="w-4 h-4" />
                )}
              </button>

              {isDropdownOpen && (
                <div
                  className="
                    absolute right-0 mt-2 w-28 rounded-lg shadow-lg z-50
                    bg-[color:var(--card)]
                    border border-[color:var(--border)]
                  "
                >
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-500 supports-[hover:hover]:hover:opacity-90"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile: Manual + Hamburger */}
        <div className="md:hidden flex items-center gap-3">
          <ManualButton label={t("nav.manual")} />
          <button
            onClick={toggleMobileMenu}
            className="opacity-70 supports-[hover:hover]:hover:opacity-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <AiOutlineClose size={24} />
            ) : (
              <GiHamburgerMenu size={24} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-2/3 max-w-xs z-40
          shadow-lg transform transition-transform duration-300 ease-in-out
          bg-[color:var(--card)] text-[color:var(--foreground)] border-l border-[color:var(--border)]
          ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex flex-col p-4 gap-4">
          {/* language picker at top for mobile */}
          <div className="flex gap-2 items-center">
            <span className="text-xs uppercase opacity-60">
              {t("nav.language")}
            </span>
            <button
              onClick={() => setLang("sv")}
              className={`px-2 py-1 rounded border text-sm ${
                lang === "sv"
                  ? "font-semibold border-blue-500 text-blue-500"
                  : "opacity-80 border-[color:var(--border)]"
              }`}
            >
              {t("navbar.lang.sv")}
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-1 rounded border text-sm ${
                lang === "en"
                  ? "font-semibold border-blue-500 text-blue-500"
                  : "opacity-80 border-[color:var(--border)]"
              }`}
            >
              {t("navbar.lang.en")}
            </button>
          </div>

          {navItems.map(({ path, labelKey }) => (
            <Link
              key={path}
              href={path}
              className={`
                text-lg transition
                ${
                  isActive(path)
                    ? "text-blue-600 dark:text-blue-400"
                    : "opacity-90 supports-[hover:hover]:hover:opacity-100"
                }
              `}
              onClick={closeMenu}
            >
              {t(labelKey)}
            </Link>
          ))}

          {!session ? (
            <button
              onClick={() => {
                signIn("google");
                closeMenu();
              }}
              className="text-lg text-left transition opacity-90 supports-[hover:hover]:hover:opacity-100"
            >
              {t("nav.login")}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full border border-[color:var(--border)]"
                />
              )}
              {session.user.name && (
                <span className="text-sm opacity-80">{session.user.name}</span>
              )}
              <button
                onClick={() => {
                  signOut({ callbackUrl: "/" });
                  closeMenu();
                }}
                className="text-lg text-left text-red-500 supports-[hover:hover]:hover:opacity-90"
              >
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0 bg-black/40 z-30"
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
