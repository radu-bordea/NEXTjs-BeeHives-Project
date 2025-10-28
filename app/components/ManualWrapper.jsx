// app/components/ManualWrapper.jsx
"use client";

import { useLang } from "./LanguageProvider";
import ManualPanel from "./ManualPanel";
import { buildManualSections } from "@/lib/manual";

export default function ManualWrapper() {
  const { t } = useLang();

  const sections = buildManualSections(t);

  return (
    <ManualPanel
      side="right"
      title={t("manual.panelTitle")}
      sections={sections}
    />
  );
}
