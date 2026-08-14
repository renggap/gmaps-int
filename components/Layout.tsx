import type { ComponentChildren } from "preact";

export function Layout(props: { active: string; children: ComponentChildren }) {
  const link = (href: string, label: string) => (
    <a
      href={href}
      class={`px-3 py-1.5 rounded-md text-sm font-medium ${
        props.active === href
          ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
          : "text-[var(--color-ink-2)] hover:bg-[var(--color-accent-soft)]"
      }`}
    >
      {label}
    </a>
  );
  return (
    <div class="min-h-screen bg-[var(--color-paper)]">
      <nav class="bg-[var(--color-paper-2)] border-b border-[var(--color-rule)] px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-[var(--color-ink)] font-bold">
            GMaps Intelligence
          </span>
          {link("/", "Dashboard")}
          {link("/leads", "Leads")}
        </div>
        <form method="post" action="/logout">
          <button
            type="submit"
            class="text-[var(--color-ink-3)] hover:text-[var(--color-ink)] text-sm"
          >
            Sign out
          </button>
        </form>
      </nav>
      <main class="max-w-6xl mx-auto p-6">{props.children}</main>
    </div>
  );
}
