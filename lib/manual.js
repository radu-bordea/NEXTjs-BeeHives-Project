// lib/manual.js
import React from "react";

// this function will RECEIVE t() from context and return the array
export function buildManualSections(t) {
  return [
    {
      id: "data-sync",
      title: t("manual.dataSync.title"),
      content: (
        <>
          <p>{t("manual.dataSync.p1")}</p>
          <ul>
            <li>{t("manual.dataSync.li1")}</li>
            <li>{t("manual.dataSync.li2")}</li>
          </ul>
        </>
      ),
    },

    {
      id: "overview",
      title: t("manual.overview.title"),
      content: (
        <>
          <p>{t("manual.overview.p1")}</p>
          <ul>
            <li>{t("manual.overview.li1")}</li>
            <li>{t("manual.overview.li2")}</li>
            <li>{t("manual.overview.li3")}</li>
          </ul>
        </>
      ),
    },

    {
      id: "scales",
      title: t("manual.scales.title"),
      content: (
        <>
          <p>{t("manual.scales.p1")}</p>
          <ul>
            <li>{t("manual.scales.li1")}</li>
            <li>{t("manual.scales.li2")}</li>
            <li>{t("manual.scales.li3")}</li>
          </ul>
        </>
      ),
    },

    {
      id: "scale-detail",
      title: t("manual.scaleDetail.title"),
      content: (
        <>
          <p>{t("manual.scaleDetail.p1")}</p>
          <ul>
            <li>{t("manual.scaleDetail.li1")}</li>
            <li>{t("manual.scaleDetail.li2")}</li>
            <li>{t("manual.scaleDetail.li3")}</li>
            <li>{t("manual.scaleDetail.li4")}</li>
            <li>{t("manual.scaleDetail.li5")}</li>
          </ul>
        </>
      ),
    },

    {
      id: "weight-charts",
      title: t("manual.weightCharts.title"),
      content: (
        <>
          <p>{t("manual.weightCharts.p1")}</p>
          <ul>
            <li>{t("manual.weightCharts.li1")}</li>
            <li>{t("manual.weightCharts.li2")}</li>
            <li>{t("manual.weightCharts.li3")}</li>
          </ul>
        </>
      ),
    },

    {
      id: "maps",
      title: t("manual.maps.title"),
      content: (
        <>
          <p>{t("manual.maps.p1")}</p>
          <ul>
            <li>{t("manual.maps.li1")}</li>
            <li>{t("manual.maps.li2")}</li>
          </ul>
        </>
      ),
    },

    {
      id: "admin",
      title: t("manual.admin.title"),
      content: (
        <>
          <p>{t("manual.admin.p1")}</p>
          <ul>
            <li>{t("manual.admin.li1")}</li>
          </ul>
        </>
      ),
    },

    {
      id: "about",
      title: t("manual.about.title"),
      content: (
        <>
          <p>{t("manual.about.p1")}</p>
        </>
      ),
    },
  ];
}
