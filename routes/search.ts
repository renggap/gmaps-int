import { define } from "@/utils.ts";
import { searchPlaces } from "@/lib/places.ts";
import { runSearch } from "@/lib/leads.ts";
import { db } from "@/db/db.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const keyword = String(form.get("keyword") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    if (!keyword || !location) {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }

    const apiKey = Deno.env.get("PLACES_API_KEY") ?? "";
    if (!apiKey) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/leads?error=${
            encodeURIComponent("PLACES_API_KEY not configured")
          }`,
        },
      });
    }

    try {
      const datas = await searchPlaces(apiKey, keyword, location);
      const { job } = runSearch(
        db(),
        keyword,
        location,
        ctx.state.userId!,
        datas,
      );
      return new Response(null, {
        status: 302,
        headers: { Location: `/leads?job=${job.id}` },
      });
    } catch (e) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/?error=${
            encodeURIComponent(e instanceof Error ? e.message : "search failed")
          }`,
        },
      });
    }
  },
});
