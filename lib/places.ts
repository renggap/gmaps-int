// Google Places API (New) — places:searchText
export type LeadData = {
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  phone: string | null;
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryTypeDisplayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "nextPageToken",
].join(",");

type FetchLike = typeof fetch;

export async function searchPlaces(
  apiKey: string,
  keyword: string,
  location: string,
  fetchFn: FetchLike = fetch,
  maxPages = 3,
): Promise<LeadData[]> {
  const query = `${keyword} in ${location}`;
  const out: LeadData[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const res = await fetchFn(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({ textQuery: query, pageToken }),
      },
    );
    if (!res.ok) {
      throw new Error(`Places API ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    out.push(...parsePlaces(json));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export function parsePlaces(json: unknown): LeadData[] {
  const obj = json as {
    places?: Array<Record<string, unknown>>;
  };
  return (obj.places ?? []).map((p) => {
    const loc = p.location as
      | { latitude?: number; longitude?: number }
      | undefined;
    const type = p.primaryTypeDisplayName as
      | { text?: string }
      | undefined;
    return {
      place_id: String(p.id ?? ""),
      name: String(
        (p.displayName as { text?: string } | undefined)?.text ?? "",
      ),
      category: type?.text ?? null,
      address: (p.formattedAddress as string | undefined) ?? null,
      lat: loc?.latitude ?? null,
      lng: loc?.longitude ?? null,
      rating: (p.rating as number | undefined) ?? null,
      review_count: (p.userRatingCount as number | undefined) ?? null,
      website: (p.websiteUri as string | undefined) ?? null,
      phone: (p.nationalPhoneNumber as string | undefined) ?? null,
    };
  }).filter((l) => l.place_id && l.name);
}
