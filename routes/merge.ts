// ponytail: manual POST /merge route, not a UI — two users, rare op. Add UI if it becomes routine.
import { define } from "@/utils.ts";
import { db, type Lead } from "@/db/db.ts";

function redirect(leadId: string, msg: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/leads/${encodeURIComponent(leadId)}${
        msg ? `?ai_error=${encodeURIComponent(msg)}` : ""
      }`,
    },
  });
}

export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const dupeId = String(form.get("dupe_id") ?? "");
    const intoId = String(form.get("into_id") ?? "");
    if (!dupeId || !intoId || dupeId === intoId) {
      return redirect(intoId || "", "merge: need dupe_id and into_id");
    }
    const d = db();
    const [dupe] = [
      ...d.sql<Lead>`SELECT * FROM leads WHERE place_id = ${dupeId}`,
    ];
    const [into] = [
      ...d.sql<Lead>`SELECT * FROM leads WHERE place_id = ${intoId}`,
    ];
    if (!dupe || !into) return redirect(intoId, "merge: lead not found");
    if (
      dupe.name.trim().toLowerCase() !== into.name.trim().toLowerCase()
    ) {
      return redirect(intoId, "merge: names differ — confirm manually in DB");
    }
    // ponytail: fixed field-priority merge; extend list if fields matter later
    d.sql`UPDATE leads SET
      public_email = COALESCE(public_email, ${dupe.public_email}),
      website      = COALESCE(website, ${dupe.website}),
      phone        = COALESCE(phone, ${dupe.phone}),
      notes        = COALESCE(notes, ${dupe.notes}),
      next_action  = COALESCE(next_action, ${dupe.next_action}),
      last_contacted = COALESCE(last_contacted, ${dupe.last_contacted}),
      ai_summary   = COALESCE(ai_summary, ${dupe.ai_summary}),
      ai_score     = COALESCE(ai_score, ${dupe.ai_score}),
      ai_priority  = COALESCE(ai_priority, ${dupe.ai_priority}),
      ai_reason    = COALESCE(ai_reason, ${dupe.ai_reason}),
      review_count = MAX(COALESCE(review_count,0), COALESCE(${dupe.review_count},0)),
      last_seen    = MAX(last_seen, ${dupe.last_seen})
    WHERE place_id = ${intoId}`;
    d.sql`DELETE FROM leads WHERE place_id = ${dupeId}`;
    return redirect(intoId, `merged ${dupeId} into this lead`);
  },
});
