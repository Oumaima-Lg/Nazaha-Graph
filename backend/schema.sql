-- Schéma Supabase pour Nazaha-Graph (à exécuter dans l'éditeur SQL Supabase)

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'pending',
    is_anonymous BOOLEAN DEFAULT TRUE,
    anonymous_identifier_hash TEXT,
    anonymous_password_hash TEXT,
    anonymous_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ocds_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ocid TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocds_releases_ocid ON ocds_releases(ocid);
