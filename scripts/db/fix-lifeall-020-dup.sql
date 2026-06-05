-- ============================================================================
-- Fix: remove an English `lifeall` row misfiled under nation='k', num='020'.
--
-- The 1.0→2.0 content copy (scripts/db/copy-table.mjs) carried over a row whose
-- English text (byte-identical to the e/020 row) was stored with nation='k'.
-- That made (num='020', nation='k') return 2 rows, so the API's maybeSingle()
-- got null and fell back to '000' — Korean num-020 users never saw their real
-- 020 reading. Deleting the misfiled English duplicate restores it.
--
-- Idempotent + id-independent: keyed on content, not on a serial id. After the
-- delete nothing matches, so re-running is a no-op. The legit Korean 020 row is
-- untouched (its text ≠ the English text).
--
-- Run AFTER copy-table.mjs (the dup lives in the legacy source, so a re-copy
-- reintroduces it). NOT a migration: migrations run before the content copy.
--   node scripts/db/run-sql.mjs scripts/db/fix-lifeall-020-dup.sql
-- ============================================================================
delete from public.lifeall k
where k.nation = 'k' and k.num = '020'
  and exists (
    select 1 from public.lifeall e
    where e.nation = 'e' and e.num = '020' and e.sajuwoon = k.sajuwoon
  );
