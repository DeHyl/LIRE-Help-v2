-- Invite-only signup. Admins create rows here; /api/auth/signup consumes the
-- token and creates a staff_users row with the role/scope baked in by the
-- inviter (so the recipient cannot escalate their own scope).
--
-- Apply manually against prod/test as needed while drizzle-kit push remains
-- unsafe for live environments. Statements are idempotent and additive only.
--
-- Usage:
--   DB_URL="$(railway variables get DATABASE_PUBLIC_URL)" \
--     psql "$DB_URL" -f migrations/manual/2026-04-20-invitations.sql

BEGIN;

CREATE TABLE IF NOT EXISTS invitations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL,
  tenant_id varchar REFERENCES tenants(id),
  property_id varchar REFERENCES properties(id),
  token text NOT NULL,
  invited_by_staff_id varchar REFERENCES staff_users(id) ON DELETE SET NULL,
  expires_at timestamp NOT NULL,
  claimed_at timestamp,
  claimed_by_staff_id varchar REFERENCES staff_users(id) ON DELETE SET NULL,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_uq ON invitations (token);
CREATE INDEX IF NOT EXISTS invitations_tenant_email_idx ON invitations (tenant_id, email);

COMMIT;
