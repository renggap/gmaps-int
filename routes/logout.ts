import { define } from "@/utils.ts";
import { clearSessionCookie } from "@/lib/auth.ts";

export const handler = define.handlers({
  POST() {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login", "Set-Cookie": clearSessionCookie() },
    });
  },
});
