"use client"; 
// This file runs only on the client side — we use hooks like useState/useContext.

import { createContext, useContext, useState, useMemo } from "react";
import en from "@/locales/en.json"; // English translation file
import sv from "@/locales/sv.json"; // Swedish translation file

// Create a new React Context to hold language-related data.
// Context allows us to share "current language" and the "translate" function
// across all components in the app without passing props manually.
const LangContext = createContext(null);

// The main provider component — wraps your entire app in layout.jsx
// so all child components can use `useLang()` to get translations.
export function LanguageProvider({ children }) {
  // 1️⃣ Define the active language state
  // Default language is Swedish ("sv")
  const [lang, setLang] = useState("sv");

  // 2️⃣ Choose which translations file to use based on current language
  // If lang is "sv", we load Swedish messages; otherwise English.
  const messages = lang === "sv" ? sv : en;

  // 3️⃣ Create a memoized translator function `t(key)`
  // It looks up a translation key in the current messages object.
  // If a key is missing, it returns the key itself (useful for debugging).
  const t = useMemo(() => {
    return (key) => messages[key] ?? key;
  }, [messages]);

  // 4️⃣ Build the context value that will be available to all components
  // It includes:
  // - lang → current language ("sv" or "en")
  // - setLang → function to switch languages
  // - t → translator function
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  // 5️⃣ Provide the context to all child components
  // Everything inside <LanguageProvider> in your layout can now call useLang().
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

// Custom hook to access language functions anywhere in the app
// Example usage: const { t, lang, setLang } = useLang();
export function useLang() {
  const ctx = useContext(LangContext);

  // If a component tries to use `useLang()` outside of the provider,
  // throw a clear error to help the developer debug it.
  if (!ctx) {
    throw new Error("useLang must be used inside <LanguageProvider />");
  }

  return ctx;
}
