"use client";

import { useLang } from "./components/LanguageProvider";

export default function HomePage() {
  const { t } = useLang();

  return (
    <div className="flex-1 w-full flex items-start justify-center p-8 dark:text-gray-500">
      <div className="md:w-1/2 p-2 md:p-6 shadow-lg shadow-amber-200 rounded-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          {t("about.title1")}
        </h1>
        <p className="mb-2 md:mb-4">{t("about.p1")}</p>

        <h1 className="text-2xl md:text-xl font-bold mb-4">
          {t("about.title2")}
        </h1>
        <p className="mb-2 md:mb-4">{t("about.p2")}</p>

        <h1 className="text-2xl md:text-xl font-bold mb-4">
          {t("about.title3")}
        </h1>
        <p className="mb-2 md:mb-4">{t("about.p3")}</p>

        <h1 className="text-2xl md:text-xl font-bold mb-4">
          {t("about.title4")}
        </h1>
        <p className="mb-2 md:mb-4">{t("about.p4")}</p>

        <h1 className="text-2xl md:text-xl font-bold mb-4">
          {t("about.title5")}
        </h1>
        <p className="mb-2 md:mb-4">{t("about.p5")}</p>

        <h1 className="text-2xl md:text-xl font-bold mb-4">
          {t("about.title6")}
        </h1>
        <p className="mb-2 md:mb-4">{t("about.p6")}</p>
      </div>
    </div>
  );
}
