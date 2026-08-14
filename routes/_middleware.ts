import { define } from "@/utils.ts";
import { verifySession } from "@/lib/auth.ts";

// auth guard: everything requires a valid session except /login + static-ish
export default define.middleware(async (ctx) => {
  const { pathname } = ctx.url;
  const isPublic = pathname === "/login" || pathname.startsWith("/_frsh") ||
    pathname.startsWith("/static") || pathname === "/favicon.ico";

  if (isPublic) return await ctx.next();

  const token = ctx.req.headers.get("cookie")
    ?.match(/gmaps_session=([^;]+)/)?.[1];

  const userId = await verifySession(
    token,
    Deno.env.get("SESSION_SECRET") ?? "",
  );
  if (!userId) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }
  ctx.state.userId = userId;
  return await ctx.next();
});
