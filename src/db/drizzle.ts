import { config } from "dotenv";
import { drizzle } from 'drizzle-orm/neon-http';

// Only configure on server side
if (typeof window === 'undefined') {
  config({ path: ".env" });
}

// Only create db connection on server side
let db: ReturnType<typeof drizzle> | null = null;

if (typeof window === 'undefined' && process.env.DATABASE_URL) {
  db = drizzle(process.env.DATABASE_URL);
}

export { db };
