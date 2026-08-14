import { createDefine } from "fresh";

export interface State {
  userId?: number;
}

export const define = createDefine<State>();

// SQLite UTC "YYYY-MM-DD HH:MM:SS" → "14 Aug 11:43" Asia/Jakarta
export function fmtTs(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return ts;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d);
}
