-- =============================================================================
-- Migration 010: No built-in staff accounts
-- Requires: CREATE TABLE IF NOT EXISTS schema_migrations
-- =============================================================================
-- This version used to seed admin, manager and editor accounts with fixed passwords
-- that were published in the repository. MarsNova no longer ships any default staff
-- credentials:
--
--   * The first super_admin is created at backend startup from the
--     MARSNOVA_BOOTSTRAP_ADMIN_EMAIL / MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD environment
--     variables, only when no active super_admin exists (see DEPLOYMENT.md,
--     "First admin account").
--   * A database that already ran the old 010 is cleaned up by migration 011.
--
-- The version number stays so numbering is contiguous. The migration runner
-- (docker/scripts/migrate.sh) records applied versions in schema_migrations itself, so
-- migration files must not insert into that table.

SELECT 1;
