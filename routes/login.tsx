import { page } from "fresh";
import { define } from "@/utils.ts";
import { Layout } from "../components/Layout.tsx";
import { Head } from "fresh/runtime";
import { rateLimited } from "@/lib/ratelimit.ts";
import { db, type User } from "@/db/db.ts";
import { sessionCookie, signSession, verifyPassword } from "@/lib/auth.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (ctx.state.userId) return ctx.redirect("/");
    return page({ error: ctx.url.searchParams.get("error") });
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    const ip = ctx.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";

    if (rateLimited(`${ip}:${username}`, 5, 15 * 60 * 1000)) {
      return ctx.redirect("/login?error=rate");
    }

    const [user] = [
      ...db().sql<User>`SELECT * FROM users WHERE username = ${username}`,
    ];

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return ctx.redirect("/login?error=1");
    }

    const token = await signSession(
      user.id,
      Deno.env.get("SESSION_SECRET") ?? "",
    );
    return new Response(null, {
      status: 302,
      headers: { Location: "/", "Set-Cookie": sessionCookie(token) },
    });
  },
});

export default define.page<typeof handler>(function Login({ data }) {
  const error = data.error;
  const input =
    "w-full mb-4 px-3 py-2 border border-[var(--color-rule-strong)] rounded-md bg-[var(--color-paper-2)]";
  return (
    <main class="min-h-screen flex items-center justify-center bg-[var(--color-paper)] p-4">
      <form
        method="post"
        action="/login"
        class="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-lg w-full max-w-sm p-8"
      >
        <Head>
          <title>Sign in — GMaps Intelligence</title>
        </Head>
        <h1 class="text-xl font-bold mb-6 text-[var(--color-ink)]">
          GMaps Intelligence
        </h1>
        {error && (
          <p class="mb-4 text-sm text-[var(--color-hot)] bg-[var(--color-paper)] p-2 rounded border border-[var(--color-hot)]">
            {error === "1"
              ? "Invalid username or password"
              : error === "rate"
              ? "Too many attempts. Try again in 15 minutes."
              : "Please log in"}
          </p>
        )}
        <label class="block text-sm font-medium text-[var(--color-ink-2)] mb-1">
          Username
        </label>
        <input
          type="text"
          name="username"
          required
          autofocus
          class={input}
        />
        <label class="block text-sm font-medium text-[var(--color-ink-2)] mb-1">
          Password
        </label>
        <input
          type="password"
          name="password"
          required
          class={input + " mb-6"}
        />
        <button
          type="submit"
          class="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-[var(--color-accent-ink)] font-medium py-2 rounded-md"
        >
          Sign in
        </button>
      </form>
    </main>
  );
});
