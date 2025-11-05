"use client";

import React from "react";
import { GiBee } from "react-icons/gi";
import { useLang } from "./LanguageProvider";
import Image from "next/image";
import barabi from "@/public/assets/images/barabi.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useLang();

  return (
    <footer className="bg-gray-800 text-gray-300 py-4">
      <div className="container mx-auto flex items-center justify-center space-x-4">
        <Image
          src={barabi}
          alt="BiData logo"
          width={30}
          height={30}
          className="object-contain"
        />

        <p className="text-sm text-center">
          © {currentYear} <span className="font-semibold">BeeHives</span>.{" "}
          {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
