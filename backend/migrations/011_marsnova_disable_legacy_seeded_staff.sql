-- =============================================================================
-- Migration 011: Disable legacy seeded staff accounts
-- Requires: CREATE TABLE IF NOT EXISTS users
-- =============================================================================
-- The old migration 010 inserted admin@, manager@ and editor@marsnova.in with fixed,
-- publicly documented passwords. This migration neutralizes those accounts, but only
-- while a row still carries one of the exact password hashes that migration shipped.
-- Any account whose password was changed, and every other user, is left untouched.
-- Re-running it is harmless: once the hashes are replaced nothing matches.
--
-- Accounts are suspended with an unguessable password hash and their sessions are
-- removed, rather than deleted, because users are referenced by projects, assignments,
-- notifications and audit logs.
--
-- If you bootstrap a new admin, use a different email from the suspended legacy ones
-- (a duplicate email is skipped), or rename/remove the old row yourself first.
--
-- A single statement keeps this atomic under psql -1 and when run by hand.

WITH legacy(password_hash) AS (
    VALUES
        ('sha256$a1b2c3d4e5f60718293a4b5c6d7e8f90$cab39170dd13a923435745e2792c9efa7b1a59693e1ff658a451a30881fd6dae'),
        ('sha256$b2c3d4e5f60718293a4b5c6d7e8f90a1$f02b8a4179bfda3062c570cb3871a58fe10c2ed0a4d0f28211a2f4e744236623'),
        ('sha256$c3d4e5f60718293a4b5c6d7e8f90a1b2$5211f49bede6f7788322cb151ac5116a28b7c026bef271b1f184fadad9bb3e1f')
),
disabled AS (
    UPDATE users u
    SET status = 'suspended',
        password_hash = '!disabled!' || md5(random()::text || clock_timestamp()::text || u.id::text),
        updated_at = CURRENT_TIMESTAMP
    FROM legacy l
    WHERE u.password_hash = l.password_hash
    RETURNING u.id
)
DELETE FROM sessions
WHERE user_id IN (SELECT id FROM disabled);
