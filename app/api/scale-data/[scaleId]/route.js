import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import cleanAndFilter from "@/utils/cleanAndFilter";

// ---- tiny CSV helpers (JS) ----

// Escape a value so it's safe for CSV:
// - If null/undefined -> empty string
// - If contains comma, quote, or newline -> wrap in quotes and double-up any quotes
//   Example: He said "hi"  ->  "He said ""hi"""
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s)       // check if it has characters that require quoting
    ? `"${s.replace(/"/g, '""')}"` // wrap in quotes + escape quotes
    : s;                         // safe to return as-is
}

// Convert a date-like value into an ISO string without milliseconds:
// - Example: "2025-10-03T12:34:56.789Z" -> "2025-10-03T12:34:56Z"
// - This is nicer for spreadsheets (Excel/Sheets don’t like millisecond precision)
// - If date is invalid, return empty string
function toIsoNoMs(dateLike) {
  try {
    const iso = new Date(dateLike).toISOString();
    return iso.replace(/\.\d{3}Z$/, "Z"); // strip the ".123" milliseconds
  } catch {
    return ""; // invalid date fallback
  }
}


export async function POST(_req, context) {
  const { scaleId } = context.params;
  console.log("🚀 POST scaleId:", scaleId);

  try {
    const client = await clientPromise;
    const db = client.db();

    const timeStart = Math.floor(
      new Date("2025-03-07T00:00:00Z").getTime() / 1000
    );
    const timeEnd = Math.floor(Date.now() / 1000);

    const resolutions = ["hourly", "daily"];

    for (const resolution of resolutions) {
      const payload = {
        scale: scaleId,
        time_start: timeStart,
        time_end: timeEnd,
        time_resolution: resolution,
        format: "json",
      };

      console.log(`📤 Fetching ${resolution.toUpperCase()} data...`);

      const res = await fetch(`${process.env.API_BASE_URL}/user/scale/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error(`❌ ${resolution} fetch error:`, error);
        return NextResponse.json(
          { error: `Failed to fetch ${resolution} data` },
          { status: 500 }
        );
      }

      const { data } = await res.json();
      console.log(`📥 ${resolution} data received:`, data?.length || 0);

      if (Array.isArray(data) && data.length > 0) {
        const cleanedData = data
          .map((item) => cleanAndFilter(item, scaleId))
          .filter(Boolean); // Remove nulls (meaningless items)

        console.log(
          `${resolution.toUpperCase()}: kept ${cleanedData.length} of ${
            data.length
          }`
        );

        const collectionName =
          resolution === "daily" ? "scale_data_daily" : "scale_data_hourly";
        const collection = db.collection(collectionName);

        await collection.deleteMany({ scale_id: scaleId });

        if (cleanedData.length > 0) {
          const inserted = await collection.insertMany(cleanedData);
          console.log(
            `✅ ${resolution.toUpperCase()} data saved: ${
              inserted.insertedCount
            } documents`
          );
        } else {
          console.warn(`⚠️ No meaningful ${resolution} records to save`);
        }
      } else {
        console.warn(`⚠️ No ${resolution.toUpperCase()} data received`);
      }
    }

    return NextResponse.json(
      { message: "✅ Hourly and Daily data saved!" },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error saving scale data:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Read scale data from MongoDB
// - By default returns JSON
// - If the query param ?format=csv is passed, returns a CSV download
export async function GET(req, context) {
  // Extract the scaleId from the dynamic route (/api/scale-data/[scaleId])
  const { scaleId } = context.params;

  // Parse query params (?resolution=daily&start=...&end=...&format=csv)
  const url = new URL(req.url);
  const resolution = url.searchParams.get("resolution") || "hourly"; // default hourly
  const start = url.searchParams.get("start"); // optional ISO date
  const end = url.searchParams.get("end");     // optional ISO date
  const format = (url.searchParams.get("format") || "json").toLowerCase(); // default json

  console.log(`🔍 GET scaleId: ${scaleId}, resolution: ${resolution}`);
  console.log(`⏱️ Time range: ${start || "any"} → ${end || "any"}`);

  try {
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();

    // Validate resolution (only allow daily or hourly)
    const allowedResolutions = ["hourly", "daily"];
    if (!allowedResolutions.includes(resolution)) {
      return NextResponse.json(
        { error: "Invalid resolution; must be 'hourly' or 'daily'" },
        { status: 400 }
      );
    }

    // Pick the right collection depending on resolution
    const collectionName =
      resolution === "daily" ? "scale_data_daily" : "scale_data_hourly";
    const collection = db.collection(collectionName);

    // Build query filter (always filter by scale_id)
    const filter = { scale_id: scaleId };

    // If both start and end dates are provided, filter by time range
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      // If dates are invalid → error
      if (isNaN(startDate) || isNaN(endDate)) {
        return NextResponse.json(
          { error: "Invalid start or end date" },
          { status: 400 }
        );
      }

      // If start >= end → error
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: "'start' date must be before 'end' date" },
          { status: 400 }
        );
      }

      // Add time range filter (stored in Mongo as ISO strings)
      filter.time = {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      };
    }

    // Fetch records from Mongo, sorted oldest → newest
    const scaleData = await collection.find(filter).sort({ time: 1 }).toArray();
    console.log(
      `📦 Fetched ${scaleData.length} records from ${collectionName}`
    );

    // --- CSV response branch (DYNAMIC HEADERS) ---
    if (format === "csv") {
      // 1) Discover all unique keys across the fetched docs.
      //    This auto-picks up any new measurements you add later (e.g., co2, pollen).
      const keySet = new Set();
      for (const row of scaleData) {
        for (const k of Object.keys(row)) {
          if (k !== "_id") keySet.add(k); // skip Mongo's _id unless you want it in CSV
        }
      }

      // 2) Ensure a stable/clean column order:
      //    - Always start with 'scale_id' and 'time'
      //    - Then include every other key alphabetically for predictability
      const rest = [...keySet]
        .filter((k) => k !== "scale_id" && k !== "time")
        .sort();
      const columns = ["scale_id", "time", ...rest];

      // 3) Build header row
      const header = columns.map(csvEscape).join(",") + "\n";

      // 4) Convert each document to a CSV row using the dynamic columns
      const lines = scaleData.map((row) => {
        const vals = columns.map((col) => {
          const val = row[col];

          // Format 'time' as ISO without milliseconds (better for spreadsheets)
          if (col === "time" && val) return toIsoNoMs(val);

          // Round numeric values to 2 decimals (tweak if you need full precision)
          if (typeof val === "number") return Math.round(val * 100) / 100;

          // Keep strings as-is; null/undefined -> empty string
          return val ?? "";
        });

        // Escape each cell to be CSV-safe (quotes, commas, newlines)
        return vals.map(csvEscape).join(",");
      });

      // 5) Final CSV string (header + rows)
      const csv = header + lines.join("\n") + (lines.length ? "\n" : "");

      // 6) Keep your existing simple filename logic
      const niceName =
        `${scaleId}-${resolution}` +
        (start ? `-${new Date(start).toISOString().slice(0, 10)}` : "") +
        (end ? `_to_${new Date(end).toISOString().slice(0, 10)}` : "") +
        `.csv`;

      // Return as file download
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${niceName}"`, // tells browser to download
          "Cache-Control": "no-store", // don’t cache, always fresh
        },
      });
    }

    // --- Default JSON branch ---
    return NextResponse.json(scaleData);
  } catch (err) {
    console.error("❌ Error fetching scale data:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
