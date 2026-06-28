-- ============================================================
-- NAZAHA-GRAPH — Graph Database Schema v2
-- INPPLC Anti-Corruption Intelligence Platform
-- Moroccan Public Procurement (Décret n°2-22-431)
-- ============================================================
-- Execution order:
--   1. schema.sql   (this file — tables + views)
--   2. seed.sql     (mock data — realistic Moroccan scenario)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CLEAN SLATE (safe to re-run)
-- ============================================================
DROP VIEW  IF EXISTS graph_edges          CASCADE;
DROP VIEW  IF EXISTS graph_nodes          CASCADE;
DROP TABLE IF EXISTS bid_participations   CASCADE;
DROP TABLE IF EXISTS allocations          CASCADE;
DROP TABLE IF EXISTS family_links         CASCADE;
DROP TABLE IF EXISTS professional_links   CASCADE;
DROP TABLE IF EXISTS public_links         CASCADE;
DROP TABLE IF EXISTS tenders              CASCADE;
DROP TABLE IF EXISTS companies            CASCADE;
DROP TABLE IF EXISTS persons              CASCADE;
DROP TABLE IF EXISTS agencies             CASCADE;
DROP TABLE IF EXISTS reports              CASCADE;
DROP TABLE IF EXISTS ocds_releases        CASCADE;

-- ============================================================
-- NODE TABLE 1 — AGENCIES (Autorités Contractantes)
-- ============================================================
CREATE TABLE agencies (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name_fr            TEXT        NOT NULL,
    name_ar            TEXT,
    -- SIGB = Système Intégré de Gestion Budgétaire (official budget code)
    code_sigb          TEXT        UNIQUE,
    type               TEXT        NOT NULL
                                   CHECK (type IN (
                                     'ministere',
                                     'collectivite',
                                     'EPA',          -- Établissement Public Administratif
                                     'EEP',          -- Entreprise & Établissement Public
                                     'commune'
                                   )),
    region             TEXT,
    city               TEXT,
    budget_annuel_mad  NUMERIC(15,2),
    website            TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NODE TABLE 2 — PERSONS (Personnes Physiques)
-- Covers both public officials AND private individuals.
-- The same CIN links a person across their public and private roles
-- which is exactly what enables pantouflage detection.
-- ============================================================
CREATE TABLE persons (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name_fr        TEXT        NOT NULL,
    full_name_ar        TEXT,
    -- CIN stored as a hash in production; plain for dev/seed
    cin                 TEXT        UNIQUE,
    role                TEXT        NOT NULL
                                    CHECK (role IN (
                                      'ordonnateur',
                                      'president_commission',
                                      'membre_commission',
                                      'directeur',
                                      'gerant',
                                      'directeur_general',
                                      'actionnaire',
                                      'consultant',
                                      'autre'
                                    )),
    is_public_official  BOOLEAN     DEFAULT FALSE,
    date_debut_fonction DATE,
    -- NULL = still in post; populated when person leaves → pantouflage detection
    date_fin_mandat     DATE,
    -- Denormalized shortcut to their main agency (also expressed via public_links)
    agency_id           UUID        REFERENCES agencies(id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NODE TABLE 3 — COMPANIES (Entreprises — OMPIC registry)
-- ICE = Identifiant Commun de l'Entreprise (15-digit, mandatory)
-- RC  = Registre du Commerce
-- ============================================================
CREATE TABLE companies (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT        NOT NULL,
    name_ar            TEXT,
    ice                TEXT        UNIQUE NOT NULL,
    rc                 TEXT,
    legal_form         TEXT        CHECK (legal_form IN (
                                     'SA', 'SARL', 'SNC', 'SCS', 'SCA',
                                     'auto_entrepreneur', 'groupement', 'succursale'
                                   )),
    capital_mad        NUMERIC(15,2),
    city               TEXT,
    date_creation      DATE,
    is_active          BOOLEAN     DEFAULT TRUE,
    -- Risk enrichment from INPPLC legal registry (updated by backend job)
    inpplc_risk_level  TEXT        DEFAULT 'low'
                                   CHECK (inpplc_risk_level IN ('low', 'medium', 'high')),
    inpplc_notes       TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NODE TABLE 4 — TENDERS (Marchés Publics)
-- Central node: the procurement event that ties all other nodes.
-- Types follow Décret n°2-22-431 (Moroccan procurement decree).
-- ============================================================
CREATE TABLE tenders (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- OCDS = Open Contracting Data Standard identifier
    ocid                 TEXT        UNIQUE,
    reference_dossier    TEXT        NOT NULL,
    title                TEXT        NOT NULL,
    object_marche        TEXT,
    type                 TEXT        NOT NULL
                                     CHECK (type IN (
                                       'appel_offres_ouvert',
                                       'appel_offres_restreint',
                                       'marche_negocie',
                                       'concours',
                                       'bon_de_commande'
                                     )),
    agency_id            UUID        NOT NULL REFERENCES agencies(id)  ON DELETE CASCADE,
    estimated_value_mad  NUMERIC(15,2),
    awarded_value_mad    NUMERIC(15,2),
    winning_company_id   UUID        REFERENCES companies(id) ON DELETE SET NULL,
    status               TEXT        DEFAULT 'ouvert'
                                     CHECK (status IN (
                                       'ouvert', 'attribue', 'annule',
                                       'contentieux', 'resilie', 'en_cours'
                                     )),
    date_publication     DATE,
    date_ouverture_plis  DATE,
    date_attribution     DATE,
    -- ── Automatic fraud flags ──────────────────────────────
    -- single_bidder: only 1 offer received on an open tender → marché fictif signal
    single_bidder        BOOLEAN     DEFAULT FALSE,
    -- fractionnement_flag: split below seuil de passation to avoid open competition
    fractionnement_flag  BOOLEAN     DEFAULT FALSE,
    -- fraud_score: 0-100 computed by NetworkX backend
    fraud_score          INTEGER     DEFAULT 0
                                     CHECK (fraud_score BETWEEN 0 AND 100),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EDGE TABLE 1 — PUBLIC_LINKS (Person → Agency)
-- Captures the official role a person holds inside a public body.
-- "until" being NULL means the person is still active in this role.
-- ============================================================
CREATE TABLE public_links (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id   UUID    NOT NULL REFERENCES persons(id)  ON DELETE CASCADE,
    agency_id   UUID    NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    relation    TEXT    NOT NULL
                        CHECK (relation IN (
                          'ordonnateur',
                          'president_commission',
                          'membre_commission',
                          'responsable_marche',
                          'directeur'
                        )),
    since       DATE,
    until       DATE,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (person_id, agency_id, relation)
);

-- ============================================================
-- EDGE TABLE 2 — PROFESSIONAL_LINKS (Person → Company)
-- Captures ownership / management roles in private companies.
-- share_percentage feeds the UBO (Ultimate Beneficial Owner) analysis.
-- ============================================================
CREATE TABLE professional_links (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id        UUID    NOT NULL REFERENCES persons(id)   ON DELETE CASCADE,
    company_id       UUID    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    relation         TEXT    NOT NULL
                             CHECK (relation IN (
                               'gerant',
                               'directeur_general',
                               'associe',
                               'actionnaire_majoritaire',
                               'actionnaire_minoritaire',
                               'administrateur',
                               'consultant'
                             )),
    share_percentage NUMERIC(5,2),
    since            DATE,
    until            DATE,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (person_id, company_id, relation)
);

-- ============================================================
-- EDGE TABLE 3 — FAMILY_LINKS (Person ↔ Person)   ★ CRITICAL
-- This edge is what closes indirect conflict-of-interest cycles.
-- Example: official presides commission → her husband owns winning company.
-- Without this edge, NetworkX cannot detect that 2-hop relationship.
-- ============================================================
CREATE TABLE family_links (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    person_a_id  UUID    NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    person_b_id  UUID    NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    relation     TEXT    NOT NULL
                         CHECK (relation IN (
                           'conjoint',                -- spouse
                           'frere_soeur',             -- sibling
                           'pere_mere',               -- parent → child direction
                           'fils_fille',              -- child → parent direction
                           'beau_frere_belle_soeur',  -- in-law
                           'oncle_tante',
                           'cousin'
                         )),
    verified     BOOLEAN DEFAULT FALSE,
    source       TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    CHECK (person_a_id <> person_b_id),
    UNIQUE (person_a_id, person_b_id, relation)
);

-- ============================================================
-- EDGE TABLE 4 — ALLOCATIONS (Agency → Tender ← Company)
-- One row per tender award.  Exactly one winner per tender (UNIQUE).
-- ============================================================
CREATE TABLE allocations (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id           UUID    NOT NULL REFERENCES agencies(id)  ON DELETE CASCADE,
    tender_id           UUID    NOT NULL REFERENCES tenders(id)   ON DELETE CASCADE,
    winning_company_id  UUID    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    award_amount_mad    NUMERIC(15,2),
    award_date          DATE,
    procedure_type      TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tender_id)
);

-- ============================================================
-- EDGE TABLE 5 — BID_PARTICIPATIONS (Company → Tender)
-- Tracks ALL bidders including losers.
-- Critical for detecting collusion rings:
--   the same 3 companies rotating as winner + decoy bidders.
-- ============================================================
CREATE TABLE bid_participations (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tender_id               UUID    NOT NULL REFERENCES tenders(id)   ON DELETE CASCADE,
    bid_amount_mad          NUMERIC(15,2),
    rank                    INTEGER,      -- 1 = winner, 2+ = loser
    is_winner               BOOLEAN DEFAULT FALSE,
    disqualified            BOOLEAN DEFAULT FALSE,
    disqualification_reason TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, tender_id)
);

-- ============================================================
-- WHISTLEBLOWER REPORTS
-- Zero-PII design: identifier stored as bcrypt hash only.
-- ============================================================
CREATE TABLE reports (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title                     TEXT        NOT NULL,
    description               TEXT        DEFAULT '',
    urgency                   TEXT        DEFAULT 'medium'
                                          CHECK (urgency IN ('low', 'medium', 'high')),
    status                    TEXT        DEFAULT 'pending',
    is_anonymous              BOOLEAN     DEFAULT TRUE,
    anonymous_identifier_hash TEXT,
    anonymous_password_hash   TEXT,
    anonymous_token           TEXT,
    -- Optional soft links to graph nodes (added after INPPLC triage)
    related_tender_id         UUID        REFERENCES tenders(id)   ON DELETE SET NULL,
    related_company_id        UUID        REFERENCES companies(id) ON DELETE SET NULL,
    created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OCDS RAW RELEASES (kept for future OCDS import pipeline)
-- After parsing, the structured data goes into the node/edge tables.
-- ============================================================
CREATE TABLE ocds_releases (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ocid       TEXT,
    -- Linked to the parsed tender once the import job runs
    tender_id  UUID        REFERENCES tenders(id) ON DELETE SET NULL,
    payload    JSONB       NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES — optimised for graph traversal queries
-- ============================================================
CREATE INDEX idx_ocds_releases_ocid         ON ocds_releases(ocid);

CREATE INDEX idx_public_links_person        ON public_links(person_id);
CREATE INDEX idx_public_links_agency        ON public_links(agency_id);

CREATE INDEX idx_professional_links_person  ON professional_links(person_id);
CREATE INDEX idx_professional_links_company ON professional_links(company_id);

CREATE INDEX idx_family_links_person_a      ON family_links(person_a_id);
CREATE INDEX idx_family_links_person_b      ON family_links(person_b_id);

CREATE INDEX idx_allocations_agency         ON allocations(agency_id);
CREATE INDEX idx_allocations_tender         ON allocations(tender_id);
CREATE INDEX idx_allocations_company        ON allocations(winning_company_id);

CREATE INDEX idx_bid_participations_company ON bid_participations(company_id);
CREATE INDEX idx_bid_participations_tender  ON bid_participations(tender_id);

CREATE INDEX idx_tenders_agency             ON tenders(agency_id);
CREATE INDEX idx_tenders_fraud_score        ON tenders(fraud_score DESC);
CREATE INDEX idx_tenders_fraud_flags        ON tenders(single_bidder, fractionnement_flag);

-- ============================================================
-- UNIFIED VIEW — graph_nodes
-- Collapses all 4 node tables into a single adjacency-list feed.
-- The backend loads this once → builds the NetworkX graph directly.
-- ============================================================
CREATE VIEW graph_nodes AS
    SELECT
        id,
        'agency'            AS node_type,
        name_fr             AS label,
        type                AS subtype,
        NULL::TEXT          AS cin,
        NULL::TEXT          AS ice,
        region              AS location,
        NULL::BOOLEAN       AS is_public_official,
        NULL::TEXT          AS inpplc_risk_level
    FROM agencies
  UNION ALL
    SELECT
        id,
        'person'            AS node_type,
        full_name_fr        AS label,
        role                AS subtype,
        cin,
        NULL::TEXT          AS ice,
        NULL::TEXT          AS location,
        is_public_official,
        NULL::TEXT          AS inpplc_risk_level
    FROM persons
  UNION ALL
    SELECT
        id,
        'company'           AS node_type,
        name                AS label,
        legal_form          AS subtype,
        NULL::TEXT          AS cin,
        ice,
        city                AS location,
        FALSE               AS is_public_official,
        inpplc_risk_level
    FROM companies
  UNION ALL
    SELECT
        id,
        'tender'            AS node_type,
        title               AS label,
        type                AS subtype,
        NULL::TEXT          AS cin,
        NULL::TEXT          AS ice,
        NULL::TEXT          AS location,
        NULL::BOOLEAN       AS is_public_official,
        CASE
            WHEN fraud_score >= 70 THEN 'high'
            WHEN fraud_score >= 40 THEN 'medium'
            ELSE 'low'
        END                 AS inpplc_risk_level
    FROM tenders;

-- ============================================================
-- UNIFIED VIEW — graph_edges
-- Collapses all 5 edge tables into a single directed adjacency list.
-- allocation is split into two directed edges:
--   Agency → Tender  (awards)
--   Tender → Company (won_by)
-- ============================================================
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
    -- family_links A → B  (forward direction)
    SELECT
        (id::TEXT || '-fwd')   AS id,
        'family_links'      AS edge_type,
        person_a_id::TEXT   AS source_id,
        person_b_id::TEXT   AS target_id,
        relation            AS label,
        TRUE                AS is_active,
        NULL::DATE          AS since,
        NULL::DATE          AS until
    FROM family_links
  UNION ALL
    -- family_links B → A  (reverse direction — family ties are symmetric,
    -- so NetworkX can traverse the conflict cycle from EITHER person)
    SELECT
        (id::TEXT || '-rev')   AS id,
        'family_links'      AS edge_type,
        person_b_id::TEXT   AS source_id,
        person_a_id::TEXT   AS target_id,
        relation            AS label,
        TRUE                AS is_active,
        NULL::DATE          AS since,
        NULL::DATE          AS until
    FROM family_links
  UNION ALL
    -- Agency → Tender (awards direction)
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
    -- Tender → Company (won_by direction)
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

-- ============================================================
-- ROW LEVEL SECURITY  (fix #4)
-- ------------------------------------------------------------
-- IMPORTANT operational note:
--   The FastAPI backend MUST connect with the SUPABASE SERVICE_ROLE key.
--   service_role bypasses RLS, so the backend keeps full access.
--   The PUBLIC (anon) key — exposed to browsers — is what these
--   policies lock down.
--
-- Threat model for an anti-corruption tool:
--   The graph holds CINs and family ties of public officials.
--   That is CONFIDENTIAL investigative data, NOT open data.
--   It must never be readable through the public anon API key.
--   Whistleblower reports must be write-only from the public:
--   a citizen can SUBMIT, but no one can READ reports via the anon key.
-- ============================================================

-- Enable RLS on every table (default-deny once enabled)
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

-- ── REPORTS: the ONLY thing the public may do is SUBMIT a report ──
-- Anonymous citizen can INSERT a report...
CREATE POLICY reports_anon_insert
    ON reports FOR INSERT
    TO anon
    WITH CHECK (true);

-- ...but there is intentionally NO anon SELECT/UPDATE/DELETE policy,
-- so whistleblower submissions are unreadable via the public key.
-- Only the backend (service_role) can read them for triage.

-- ── Everything else has NO anon policy at all ──
-- With RLS enabled and no permissive policy, the anon key gets zero
-- rows from the graph tables. All graph reads go through the backend,
-- which uses service_role and bypasses RLS.
--
-- (If later you want the *non-sensitive* contract list to be public
--  open-data, add a narrow SELECT policy on a dedicated public view
--  that excludes persons.cin and family_links — not on the base tables.)
