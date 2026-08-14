import { openDb, type User } from "./db.ts";
import { hashPassword } from "../lib/auth.ts";

const [username, password] = Deno.args;
if (!username || !password) {
  console.error("usage: deno task seed <username> <password>");
  Deno.exit(1);
}

const db = openDb(`${Deno.env.get("DATA_DIR") ?? "data"}/gmaps.db`);
const existing = [
  ...db.sql<User>`SELECT * FROM users WHERE username = ${username}`,
];
if (existing.length > 0) {
  db.sql`UPDATE users SET password_hash = ${await hashPassword(
    password,
  )} WHERE username = ${username}`;
  console.log(`updated password for ${username}`);
} else {
  db.sql`INSERT INTO users (username, password_hash) VALUES (${username}, ${await hashPassword(
    password,
  )})`;
  console.log(`created ${username}`);
}
db.close();
