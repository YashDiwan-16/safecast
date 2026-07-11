import { z } from "zod";

import type { LiveDataResult } from "../maps/geocoding";
import { available, unavailable } from "../maps/geocoding";

const gdeltSchema = z.object({
  articles: z
    .array(
      z.object({
        title: z.string().optional(),
        url: z.string().optional(),
        sourceCountry: z.string().optional(),
        source: z.string().optional(),
        seendate: z.string().optional(),
        socialimage: z.string().optional(),
        domain: z.string().optional(),
        language: z.string().optional(),
      }),
    )
    .optional(),
});

export type LiveUpdateArticle = {
  title: string;
  url: string;
  source?: string;
  domain?: string;
  seenAt?: string;
  language?: string;
};

function buildSafetyQuery(location: string, topic: string) {
  const safeLocation = location.trim().replace(/[^\p{L}\p{N}\s,.-]/gu, " ");
  const safeTopic = topic.trim().replace(/[^\p{L}\p{N}\s,.-]/gu, " ");
  return `(${safeTopic || "monsoon flood rainfall landslide cyclone"}) (${safeLocation})`;
}

export async function searchLiveUpdates({
  location,
  topic = "monsoon OR flood OR rainfall OR landslide OR cyclone OR waterlogging",
  limit = 8,
}: {
  location: string;
  topic?: string;
  limit?: number;
}): Promise<LiveDataResult<LiveUpdateArticle[]>> {
  if (!location.trim()) {
    return unavailable("GDELT", "Enter a location to search live public updates.");
  }

  try {
    const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
    url.searchParams.set("query", buildSafetyQuery(location, topic));
    url.searchParams.set("mode", "ArtList");
    url.searchParams.set("format", "json");
    url.searchParams.set("sort", "hybridrel");
    url.searchParams.set("maxrecords", String(Math.min(Math.max(limit, 1), 20)));

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return unavailable("GDELT", `Live update search failed with ${response.status}.`);
    }

    const parsed = gdeltSchema.parse(await response.json());
    const articles = (parsed.articles ?? [])
      .filter((article): article is typeof article & { title: string; url: string } =>
        Boolean(article.title && article.url),
      )
      .map((article) => ({
        title: article.title,
        url: article.url,
        source: article.source,
        domain: article.domain,
        seenAt: article.seendate,
        language: article.language,
      }));

    if (articles.length === 0) {
      return unavailable("GDELT", "No live public updates matched this location and topic.");
    }

    return available("GDELT", articles);
  } catch (error) {
    return unavailable("GDELT", error instanceof Error ? error.message : "Live updates are unavailable.");
  }
}
