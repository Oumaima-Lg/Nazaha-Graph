-- ============================================================
-- NAZAHA-GRAPH — Migration 01: Hardening
-- ------------------------------------------------------------
-- Apply this ON TOP of an already-seeded database.
-- It does NOT touch the base tables, so your data is preserved.
--
-- Covers:
--   #1  family_links → bidirectional in graph_edges
--   #3  unique edge ids in graph_edges
--   #4  Row Level Security
--
-- Safe to re-run.
-- ============================================================

-- ── Fix #1 + #3 : rebuild graph_edges only (data-safe) ──────
DROP VIEW IF EXISTS graph_edges;

CREATE VIEW graph_edges AS
    SELECT
        id::TEXT            AS id,
        'public_links'      AS edge_type,
        person_id::TEXT     AS source_id,
        agency_id::TEXT     AS target_id,
        relation            AS label,
        is_active,
        since,
        until
    FROM public_links
  UNION ALL
    SELECT
        id::TEXT             AS id,
        'professional_links' AS edge_type,
        person_id::TEXT      AS source_id,
        company_id::TEXT     AS target_id,
        relation             AS label,
        is_active,
        since,
        until
    FROM professional_links
  UNION ALL
    -- family A → B (forward)
    SELECT
        (id::TEXT || '-fwd') AS id,
        'family_links'      AS edge_type,
        person_a_id::TEXT   AS source_id,
        person_b_id::TEXT   AS target_id,
        relation            AS label,
        TRUE                AS is_active,
        NULL::DATE          AS since,
        NULL::DATE          AS until
    FROM family_links
  UNION ALL
    -- family B → A (reverse — symmetric ties, traversable from either side)
    SELECT
        (id::TEXT || '-rev') AS id,
        'family_links'      AS edge_type,
        person_b_id::TEXT   AS source_id,
        person_a_id::TEXT   AS target_id,
        relation            AS label,
        TRUE                AS is_active,
        NULL::DATE          AS since,
        NULL::DATE          AS until
    FROM family_links
  UNION ALL
    SELECT
        (id::TEXT || '-award') AS id,
        'allocation'        AS edge_type,
        agency_id::TEXT     AS source_id,
        tender_id::TEXT     AS target_id,
        'awards'            AS label,
        TRUE                AS is_active,
        award_date          AS since,
        NULL::DATE          AS until
    FROM allocations
  UNION ALL
    SELECT
        (id::TEXT || '-win') AS id,
        'allocation_winner' AS edge_type,
        tender_id::TEXT     AS source_id,
        winning_company_id::TEXT AS target_id,
        'won_by'            AS label,
        TRUE                AS is_active,
        award_date          AS since,
        NULL::DATE          AS until
    FROM allocations
  UNION ALL
    SELECT
        id::TEXT            AS id,
        'bid_participation' AS edge_type,
        company_id::TEXT    AS source_id,
        tender_id::TEXT     AS target_id,
        CASE WHEN is_winner THEN 'won' ELSE 'bid_on' END AS label,
        TRUE                AS is_active,
        NULL::DATE          AS since,
        NULL::DATE          AS until
    FROM bid_participations;

-- ── Fix #4 : Row Level Security ─────────────────────────────
-- Backend must use the SERVICE_ROLE key (bypasses RLS).
-- The public anon key is what gets locked down.

ALTER TABLE agencies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocds_releases      ENABLE ROW LEVEL SECURITY;

-- Whistleblower: public may SUBMIT a report, but never READ reports.
DROP POLICY IF EXISTS reports_anon_insert ON reports;
CREATE POLICY reports_anon_insert
    ON reports FOR INSERT
    TO anon
    WITH CHECK (true);

-- No other anon policies → graph data (CINs, family ties) is
-- unreachable through the public key. All reads go via the backend.
