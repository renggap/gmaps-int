import { assertEquals } from "@std/assert";
import { csvEscape } from "../routes/leads/export.csv.tsx";

Deno.test("csvEscape", () => {
  assertEquals(csvEscape(null), "");
  assertEquals(csvEscape("plain"), "plain");
  assertEquals(csvEscape('say "hi"'), '"say ""hi"""');
  assertEquals(csvEscape("a,b"), '"a,b"');
  assertEquals(csvEscape("line\nbreak"), '"line\nbreak"');
});
