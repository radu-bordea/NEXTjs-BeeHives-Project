// lib/manual.js

export const manualSections = [
  // ===================== DATA & SYNC =====================
  {
    id: "data-sync",
    title: "Data & Sync",
    content: (
      <>
        <p>
          Data is saved on a schedule via cron jobs that pull from the API into
          the database for <strong>daily</strong> and <strong>hourly</strong>{" "}
          aggregates.
        </p>
        <ul>
          <li>Charts and lists read from these stored aggregates.</li>
          <li>
            If a time window looks empty, the device may have been offline or
            the job delayed — try a refresh and check device status.
          </li>
        </ul>
      </>
    ),
  },

  // ===================== OVERVIEW =====================
  {
    id: "overview",
    title: "Overview",
    content: (
      <>
        <p>
          This manual explains each page in the Beehives app and where to find
          controls for time ranges, metrics, downloads, and navigation.
        </p>
        <ul>
          <li>Works on mobile & desktop</li>
          <li>Open/close via the “Manual” button (or ESC)</li>
          <li>Use the search box to jump to any section</li>
        </ul>
      </>
    ),
  },

  // ===================== SCALES (LIST) =====================
  {
    id: "scales",
    title: "Scales (List)",
    content: (
      <>
        <p>
          The Scales page lists every scale. Use the buttons on each card to
          quickly view aggregated data or jump to charts.
        </p>
        <ul>
          <li>
            <strong>Daily / Hourly buttons:</strong> open views showing daily or
            hourly data (aggregations).
          </li>
          <li>
            <strong>Go to Charts:</strong> opens the specific scale’s chart
            view, focused on that scale.
          </li>
          <li>
            <strong>Downloads (Admin only):</strong> if you’re logged in as an
            admin, you’ll see a button to download <code>.csv</code> for all
            data.
          </li>
        </ul>
      </>
    ),
  },

  // ===================== SPECIFIC SCALE – CHART VIEW =====================
  {
    id: "scale-detail",
    title: "Scale – Chart View",
    content: (
      <>
        <p>
          Visualize data for a single scale with full control over metric and
          time range. Ideal for deep dives.
        </p>
        <ul>
          <li>
            <strong>Metric picker:</strong> choose the metric (e.g., weight,
            temperature, etc.).
          </li>
          <li>
            <strong>Scale picker:</strong> switch to another scale without
            leaving the page.
          </li>
          <li>
            <strong>Date range controls:</strong> pick exact dates or use quick
            ranges (24h / 7d / 30d / weekly / monthly).
          </li>
          <li>
            <strong>Rapid navigation:</strong> jump backward/forward by the
            current window size (e.g., ±1 week or ±1 month).
          </li>
          <li>
            <strong>Download (signed-in users):</strong> export a{" "}
            <code>.csv</code> of <em>the current chart view</em> (respects
            selected scale, metric, and time window).
          </li>
        </ul>
      </>
    ),
  },

  // ===================== WEIGHT-CHARTS (MULTI) =====================
  {
    id: "weight-charts",
    title: "Weight-Charts (Multi)",
    content: (
      <>
        <p>
          Compare multiple scales in one place with flexible layouts and quick
          time filters.
        </p>
        <ul>
          <li>
            <strong>Control panel:</strong> choose scales, time range, and
            preset time buttons (7d / 30d / 90d, etc.).
          </li>
          <li>
            <strong>Layout:</strong> toggle between <em>one multi-chart</em>{" "}
            (overlaid series) or <em>small multiples</em> (one chart per scale).
          </li>
          <li>
            <strong>Legend:</strong> click legend items to show/hide individual
            series.
          </li>
        </ul>
      </>
    ),
  },

  // ===================== MAPS =====================
  {
    id: "maps",
    title: "Maps",
    content: (
      <>
        <p>
          See each scale on the map. Click a marker to preview the last day’s
          key data and navigate quickly.
        </p>
        <ul>
          <li>
            <strong>Marker popup:</strong> shows last-day data for that scale.
          </li>
          <li>
            <strong>Links:</strong> <em>“Go to Scale”</em> (opens the scale
            page) and <em>“Open Current Chart”</em> (opens the chart view
            focused on that scale & time).
          </li>
        </ul>
      </>
    ),
  },

  // ===================== ADMIN =====================
  {
    id: "admin",
    title: "Admin",
    content: (
      <>
        <p>
          Available only to admin users. Manage scales and data directly from
          the database utilities.
        </p>
        <ul>
          <li>
            <strong>Data controls:</strong> tools for reviewing, importing,
            fixing, or deleting records (where exposed by the UI).
          </li>
        </ul>
      </>
    ),
  },
];
