import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env";
import { schema } from "@/lib/db/schema";

declare global {
  var __webmonitorSql: postgres.Sql | undefined;
}

const connectionString = getServerEnv().DATABASE_URL;

const client =
  globalThis.__webmonitorSql ??
  postgres(connectionString, {
    max: 1,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__webmonitorSql = client;
}

export const db = drizzle(client, { schema });
export type Db = typeof db;
