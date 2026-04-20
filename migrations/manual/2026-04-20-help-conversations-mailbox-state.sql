-- Add mailbox-state columns to help_conversations for inbox visibility/actions.
-- Matches shared/schema.ts, where these fields are already modeled and used by
-- the inbox code paths. This manual migration is additive + idempotent only.
--
-- Apply manually against prod/test as needed while drizzle-kit push remains
-- unsafe for live environments.
--
-- Usage:
--   DB_URL="$(railway variables get DATABASE_PUBLIC_URL)" \
--     psql "$DB_URL" -f migrations/manual/2026-04-20-help-conversations-mailbox-state.sql
--
-- Verify afterwards:
--   psql "$DB_URL" -c "\d help_conversations"

BEGIN;

ALTER TABLE help_conversations
  ADD COLUMN IF NOT EXISTS assignment_state TEXT NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS visibility_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS previous_visibility_status TEXT,
  ADD COLUMN IF NOT EXISTS visibility_changed_at timestamp,
  ADD COLUMN IF NOT EXISTS visibility_changed_by_staff_id varchar,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp,
  ADD COLUMN IF NOT EXISTS deleted_by_staff_id varchar,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamp,
  ADD COLUMN IF NOT EXISTS snoozed_by_staff_id varchar;

COMMIT;
