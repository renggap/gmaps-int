import { assertEquals } from "@std/assert";
import { parsePlaces } from "./places.ts";

const fixture = {
  places: [
    {
      id: "place-1",
      displayName: { text: "Cafe Alpha", languageCode: "en" },
      primaryTypeDisplayName: { text: "Coffee shop" },
      formattedAddress: "123 Main St, Berlin",
      location: { latitude: 52.52, longitude: 13.4 },
      rating: 4.7,
      userRatingCount: 312,
      websiteUri: "https://cafe-alpha.example",
      nationalPhoneNumber: "030 123456",
    },
    {
      id: "place-2",
      displayName: { text: "Minimal Bar" },
      // no category/address/rating/website/phone
    },
  ],
};

Deno.test("parsePlaces maps fields", () => {
  const leads = parsePlaces(fixture);
  assertEquals(leads.length, 2);
  assertEquals(leads[0], {
    place_id: "place-1",
    name: "Cafe Alpha",
    category: "Coffee shop",
    address: "123 Main St, Berlin",
    lat: 52.52,
    lng: 13.4,
    rating: 4.7,
    review_count: 312,
    website: "https://cafe-alpha.example",
    phone: "030 123456",
  });
});

Deno.test("parsePlaces null-safe on missing fields", () => {
  const [l2] = parsePlaces(fixture).slice(1);
  assertEquals(l2.place_id, "place-2");
  assertEquals(l2.category, null);
  assertEquals(l2.address, null);
  assertEquals(l2.rating, null);
  assertEquals(l2.review_count, null);
  assertEquals(l2.website, null);
  assertEquals(l2.phone, null);
});

Deno.test("parsePlaces drops entries without id/name", () => {
  const leads = parsePlaces({
    places: [{ id: "", displayName: { text: "No id" } }, {
      id: "x",
      displayName: {},
    }],
  });
  assertEquals(leads.length, 0);
});

Deno.test("parsePlaces empty input", () => {
  assertEquals(parsePlaces({}), []);
  assertEquals(parsePlaces({ places: [] }), []);
});
