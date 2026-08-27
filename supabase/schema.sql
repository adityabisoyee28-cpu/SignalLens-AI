-- ============================================================
-- SIGNALENS AI — Database Schema
-- SIH26147 — Automated Analysis of .IQ and .WAV Files
--
-- Run this in the Supabase SQL Editor or via migrations.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. users
-- ────────────────────────────────────────────────────────────
-- Synced from Supabase Auth (auth.users).
-- This table holds app-specific profile data.

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    full_name   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a user row when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. files
-- ────────────────────────────────────────────────────────────
-- Records each uploaded signal file.

CREATE TABLE IF NOT EXISTS files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
    filename        TEXT NOT NULL,
    file_type       TEXT NOT NULL CHECK (file_type IN ('wav', 'iq')),
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    storage_path    TEXT,                   -- Supabase Storage path (future)
    sample_rate     DOUBLE PRECISION,       -- Hz, when known
    iq_dtype        TEXT DEFAULT 'float32', -- 'float32' | 'complex64'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 3. analyses
-- ────────────────────────────────────────────────────────────
-- One analysis per uploaded file. Tracks pipeline status.

CREATE TYPE analysis_status AS ENUM (
    'pending',
    'processing',
    'complete',
    'failed'
);

CREATE TABLE IF NOT EXISTS analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id         UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status          analysis_status NOT NULL DEFAULT 'pending',
    error_message   TEXT,                   -- populated on failure
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ            -- NULL until finished
);

CREATE INDEX IF NOT EXISTS idx_analyses_file_id ON analyses(file_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);

-- ────────────────────────────────────────────────────────────
-- 4. features
-- ────────────────────────────────────────────────────────────
-- DSP features extracted by the signal engine.

CREATE TABLE IF NOT EXISTS features (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id             UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,

    -- Time-domain metrics
    duration                DOUBLE PRECISION,  -- seconds
    sample_rate             DOUBLE PRECISION,  -- Hz
    n_samples               BIGINT,
    rms                     DOUBLE PRECISION,
    peak                    DOUBLE PRECISION,
    dominant_frequency      DOUBLE PRECISION,  -- Hz
    bandwidth               DOUBLE PRECISION,  -- Hz (3-dB)
    bandwidth_3db_hz        DOUBLE PRECISION,  -- explicit alias
    snr                     DOUBLE PRECISION,  -- dB (when available)
    zero_crossing_rate      DOUBLE PRECISION,
    mean                    DOUBLE PRECISION,
    variance                DOUBLE PRECISION,

    -- IQ-specific metrics (NULL for WAV)
    i_mean                  DOUBLE PRECISION,
    q_mean                  DOUBLE PRECISION,
    magnitude_rms           DOUBLE PRECISION,
    magnitude_peak          DOUBLE PRECISION,
    papr_db                 DOUBLE PRECISION,
    phase_std_rad           DOUBLE PRECISION,
    inst_freq_mean_hz       DOUBLE PRECISION,
    inst_freq_std_hz        DOUBLE PRECISION,

    -- Spectral features
    spectral_centroid_hz    DOUBLE PRECISION,

    -- Raw feature JSON (full dict from extract_features())
    raw_features            JSONB,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_features_analysis_id ON features(analysis_id);

-- ────────────────────────────────────────────────────────────
-- 5. predictions
-- ────────────────────────────────────────────────────────────
-- ML classification results.

CREATE TABLE IF NOT EXISTS predictions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id     UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    model_name      TEXT NOT NULL DEFAULT 'random_forest_v1',
    predicted_class TEXT NOT NULL,
    confidence      DOUBLE PRECISION,           -- 0–1
    probabilities   JSONB,                      -- {class: probability, ...}
    anomaly_score   DOUBLE PRECISION,           -- 0–1 (low confidence → high anomaly)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_analysis_id ON predictions(analysis_id);

-- ────────────────────────────────────────────────────────────
-- 6. reports
-- ────────────────────────────────────────────────────────────
-- Generated analysis reports.

CREATE TABLE IF NOT EXISTS reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id     UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    report_text     TEXT,                       -- full text report
    report_json     JSONB,                      -- structured report data
    storage_path    TEXT,                       -- Supabase Storage path (future)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_analysis_id ON reports(analysis_id);


-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
-- Enable RLS on all tables. Policies below enforce access.

ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE features    ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports     ENABLE ROW LEVEL SECURITY;

-- Users: can read/update only their own profile
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Files: users can read/insert their own files; service role can do all
CREATE POLICY "Users can read own files"
    ON files FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own files"
    ON files FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Analyses: users can read their own; service role can do all
CREATE POLICY "Users can read own analyses"
    ON analyses FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own analyses"
    ON analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own analyses"
    ON analyses FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Features: readable if you own the parent analysis
CREATE POLICY "Users can read own features"
    ON features FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = features.analysis_id
              AND (analyses.user_id = auth.uid() OR analyses.user_id IS NULL)
        )
    );

CREATE POLICY "Service can insert features"
    ON features FOR INSERT
    WITH CHECK (true);

-- Predictions: readable if you own the parent analysis
CREATE POLICY "Users can read own predictions"
    ON predictions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = predictions.analysis_id
              AND (analyses.user_id = auth.uid() OR analyses.user_id IS NULL)
        )
    );

CREATE POLICY "Service can insert predictions"
    ON predictions FOR INSERT
    WITH CHECK (true);

-- Reports: readable if you own the parent analysis
CREATE POLICY "Users can read own reports"
    ON reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = reports.analysis_id
              AND (analyses.user_id = auth.uid() OR analyses.user_id IS NULL)
        )
    );

CREATE POLICY "Service can insert reports"
    ON reports FOR INSERT
    WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- Cleanup: updated_at trigger for users
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
