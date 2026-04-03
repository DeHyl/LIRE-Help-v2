// Run: DATABASE_URL=<your-url> npx tsx scripts/seed-superadmin.ts

import postgres from "postgres";
import bcrypt from "bcrypt";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const email = "mune100g@gmail.com";
  const password = "LIREhelp2026";
  const name = "Alejandro Dominguez";
  const role = "superadmin";

  const passwordHash = await bcrypt.hash(password, 12);

  // Create staff_users table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS staff_users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'readonly',
      tenant_id VARCHAR,
      property_id VARCHAR,
      is_active BOOLEAN NOT NULL DEFAULT true,
      whatsapp_number TEXT,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;

  // Upsert superadmin
  const [user] = await sql`
    INSERT INTO staff_users (email, password_hash, name, role)
    VALUES (${email}, ${passwordHash}, ${name}, ${role})
    ON CONFLICT (email) DO UPDATE SET
      password_hash = ${passwordHash},
      role = ${role},
      is_active = true,
      updated_at = now()
    RETURNING id, email, role
  `;

  console.log("Superadmin created:", user);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
