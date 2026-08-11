import { schedules, logger } from "@trigger.dev/sdk";
import { prisma } from "../lib/prisma";

// Daily lead sourcing via OpenStreetMap's Overpass API — free, no API key,
// no billing account or card required (unlike Google Places). Coverage is
// less complete than Google's since it depends on volunteer-mapped data,
// but it costs nothing and needs no signup at all.
//
// Capped at ~15/day on purpose: it matches the realistic outreach pace
// (10-15 contacts/day) a single founder can actually follow up on —
// importing 500 leads in one run just creates a backlog nobody will ever
// contact.
const DAILY_IMPORT_CAP = 15;
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_METERS = 15000;

const CITY_SEARCH_AREAS = [
  { city: "Casablanca", lat: 33.5731, lon: -7.5898 },
  { city: "Rabat", lat: 34.0209, lon: -6.8416 },
  { city: "Marrakech", lat: 31.6295, lon: -7.9811 },
  { city: "Tanger", lat: 35.7595, lon: -5.834 },
  { city: "Fes", lat: 34.0331, lon: -5.0003 }
];

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
};

async function searchAccountants(lat: number, lon: number): Promise<OverpassElement[]> {
  const query = `[out:json][timeout:25];
(
  nwr["office"="accountant"](around:${SEARCH_RADIUS_METERS},${lat},${lon});
  nwr["office"="tax_advisor"](around:${SEARCH_RADIUS_METERS},${lat},${lon});
);
out center tags;`;

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Overpass API request failed (${response.status}): ${detail}`);
  }
  const data = (await response.json()) as { elements?: OverpassElement[] };
  return data.elements || [];
}

function addressFromTags(tags: Record<string, string>) {
  const parts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const sourceLeads = schedules.task({
  id: "source-leads",
  cron: { pattern: "0 6 * * *", timezone: "Africa/Casablanca" }, // 6h chaque matin
  run: async () => {
    let imported = 0;
    let skipped = 0;

    for (const area of CITY_SEARCH_AREAS) {
      if (imported >= DAILY_IMPORT_CAP) break;
      let elements: OverpassElement[];
      try {
        elements = await searchAccountants(area.lat, area.lon);
      } catch (error) {
        logger.error("Overpass search failed", { city: area.city, error: error instanceof Error ? error.message : String(error) });
        continue;
      }

      for (const element of elements) {
        if (imported >= DAILY_IMPORT_CAP) break;
        const tags = element.tags || {};
        const name = tags.name;
        const phone = tags.phone || tags["contact:phone"];
        if (!phone || !name) {
          skipped++;
          continue;
        }

        // OSM's type+id is the canonical global identifier (id alone repeats
        // across node/way/relation), reused as the dedup key.
        const sourceId = `${element.type}/${element.id}`;
        const existing = await prisma.lead.findUnique({ where: { googlePlaceId: sourceId } });
        if (existing) {
          skipped++;
          continue;
        }

        await prisma.lead.create({
          data: {
            // Not actually a Google Place ID anymore — kept as the column
            // name to avoid a migration; it's just the dedup key now.
            googlePlaceId: sourceId,
            name: "", // contact name unknown from OSM data — filled in once someone talks to them
            firmName: name,
            phone,
            email: "",
            address: addressFromTags(tags),
            website: tags.website || tags["contact:website"],
            leadSource: "AI_SOURCING",
            stage: "NEW"
          }
        });
        imported++;
      }

      // Be a good citizen on Overpass's shared public instance.
      await sleep(1000);
    }

    logger.info("Lead sourcing run complete", { imported, skipped });
    return { imported, skipped };
  }
});
