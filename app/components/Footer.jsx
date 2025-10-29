"use client";

import React from "react";
import { GiBee } from "react-icons/gi";
import { useLang } from "./LanguageProvider";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useLang();

  return (
    <footer className="bg-gray-800 text-gray-300 py-4 mt-12">
      <div className="container mx-auto flex items-center justify-center space-x-4">
        <GiBee className="text-yellow-400 text-4xl" />

        <p className="text-sm text-center">
          © {currentYear}{" "}
          <span className="font-semibold">BeeHives</span>.{" "}
          {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
