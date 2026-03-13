import "dotenv/config";

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
const retries = Number.parseInt(process.env.DB_CONNECT_RETRIES ?? "30", 10);
const delayMs = Number.parseInt(process.env.DB_CONNECT_DELAY_MS ?? "2000", 10);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (let attempt = 1; attempt <= retries; attempt += 1) {
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 1,
    connect_timeout: 10,
  });

  try {
    await sql`select 1`;
    await sql.end();
    console.log(`Database is ready after ${attempt} attempt(s).`);
    process.exit(0);
  } catch (error) {
    await sql.end({ timeout: 0 });

    if (attempt === retries) {
      console.error("Database connection failed.");
      throw error;
    }

    console.log(
      `Database not ready yet (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms.`,
    );
    await sleep(delayMs);
  }
}
