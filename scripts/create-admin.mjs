import "dotenv/config";

import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const databaseUrl = process.env.DATABASE_URL;
const email = readArg("--email");
const password = readArg("--password");
const name = readArg("--name") ?? "Admin";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!email || !password) {
  throw new Error(
    "Usage: npm run auth:create-admin -- --email you@example.com --password your-password --name Wayne",
  );
}

const sql = postgres(databaseUrl);
const passwordHash = await hashPassword(password);
const now = new Date();

try {
  await sql.begin(async (tx) => {
    const users = await tx`
      insert into users (email, name, image, email_verified, created_at, updated_at)
      values (${email.toLowerCase()}, ${name}, null, true, ${now}, ${now})
      on conflict (email)
      do update set
        name = excluded.name,
        email_verified = true,
        updated_at = excluded.updated_at
      returning id
    `;

    const userId = users[0]?.id;

    if (!userId) {
      throw new Error("Failed to create or update user.");
    }

    await tx`
      insert into accounts (
        account_id,
        provider_id,
        user_id,
        password,
        created_at,
        updated_at
      )
      values (${userId}, 'credential', ${userId}, ${passwordHash}, ${now}, ${now})
      on conflict (provider_id, account_id)
      do update set
        password = excluded.password,
        updated_at = excluded.updated_at
    `;
  });

  console.log(`Admin user ready: ${email.toLowerCase()}`);
} finally {
  await sql.end();
}
