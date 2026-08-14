import type { LeadData } from "./places.ts";

export type Scored = { fit_score: number; priority: "HOT" | "WARM" | "SKIP" };

// rule-based fit score 1-10: rating(0-3) + review volume(0-4) + web presence(0-2) + contact(0-1)
export function scoreLead(
  lead: Pick<LeadData, "rating" | "review_count" | "website" | "phone">,
): Scored {
  let pts = 0;

  if (lead.rating != null) {
    if (lead.rating >= 4.5) pts += 3;
    else if (lead.rating >= 4.0) pts += 2;
    else if (lead.rating >= 3.0) pts += 1;
  }

  const rc = lead.review_count ?? 0;
  if (rc >= 500) pts += 4;
  else if (rc >= 100) pts += 3;
  else if (rc >= 20) pts += 2;
  else if (rc >= 5) pts += 1;

  if (lead.website) pts += 2;
  if (lead.phone) pts += 1;

  const fit_score = Math.max(1, Math.min(10, pts));
  const priority = fit_score >= 8 ? "HOT" : fit_score >= 5 ? "WARM" : "SKIP";
  return { fit_score, priority };
}
