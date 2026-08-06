import { schedules, logger } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";

// Daily lead sourcing via Google Places API (New). Capped at ~15/day on
// purpose: it matches the realistic outreach pace (10-15 contacts/day) a
// single founder can actually follow up on — importing 500 leads in one run
// just creates a backlog nobody will ever contact.
const DAILY_IMPORT_CAP = 15;

const SEARCH_QUERIES = [
  "cabinet comptable Casablanca",
  "expert comptable Casablanca",
  "fiduciaire Casablanca",
  "cabinet comptable Rabat",
  "expert comptable Rabat",
  "fiduciaire Marrakech",
  "cabinet comptable Tanger",
  "expert comptable Fes"
];

type PlaceResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
};

async function searchPlaces(query: string, apiKey: string): Promise<PlaceResult[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri"
    },
    body: JSON.stringify({ textQuery: query, languageCode: "fr" })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Places API request failed (${response.status}): ${detail}`);
  }
  const data = (await response.json()) as { places?: PlaceResult[] };
  return data.places || [];
}

export const sourceLeads = schedules.task({
  id: "source-leads",
  cron: { pattern: "0 6 * * *", timezone: "Africa/Casablanca" }, // 6h chaque matin
  run: async () => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      logger.error("GOOGLE_PLACES_API_KEY is not configured — skipping sourcing run.");
      return { imported: 0, skipped: 0 };
    }

    let imported = 0;
    let skipped = 0;

    for (const query of SEARCH_QUERIES) {
      if (imported >= DAILY_IMPORT_CAP) break;
      let results: PlaceResult[];
      try {
        results = await searchPlaces(query, apiKey);
      } catch (error) {
        logger.error("Places search failed", { query, error: error instanceof Error ? error.message : String(error) });
        continue;
      }

      for (const place of results) {
        if (imported >= DAILY_IMPORT_CAP) break;
        const phone = place.internationalPhoneNumber || place.nationalPhoneNumber;
        const name = place.displayName?.text;
        if (!phone || !name) {
          skipped++;
          continue;
        }

        const existing = await prisma.lead.findUnique({ where: { googlePlaceId: place.id } });
        if (existing) {
          skipped++;
          continue;
        }

        await prisma.lead.create({
          data: {
            googlePlaceId: place.id,
            name: "", // contact name unknown from Places data — filled in once someone talks to them
            firmName: name,
            phone,
            email: "",
            address: place.formattedAddress,
            website: place.websiteUri,
            leadSource: "AI_SOURCING",
            stage: "NEW"
          }
        });
        imported++;
      }
    }

    logger.info("Lead sourcing run complete", { imported, skipped });
    return { imported, skipped };
  }
});
