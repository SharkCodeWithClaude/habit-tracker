import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.js";
import { DATABASE_URL } from "./env.js";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const client = postgres(DATABASE_URL);
    db = drizzle(client, { schema });
  }
  return db;
}

export type Database = ReturnType<typeof getDb>;
