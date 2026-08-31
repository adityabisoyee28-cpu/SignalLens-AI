-- ============================================================
-- SIGNALENS AI — Supabase Storage
-- SIH26147 — Automated Analysis of .IQ and .WAV Files
--
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- Creates the 'signal-files' bucket and access policies.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Create storage bucket
-- ────────────────────────────────────────────────────────────

-- Insert bucket (idempotent — skips if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'signal-files',
    'signal-files',
    FALSE,                                  -- private by default
    104857600,                              -- 100 MB max file size
    ARRAY[
        'audio/wav',
        'audio/x-wav',
        'audio/wave',
        'audio/ogg',
        'audio/vorbis',
        'application/octet-stream',         -- IQ/raw binary
        'application/x-iq',
        'text/plain'                        -- IQ text captures
    ]
)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2. Storage RLS Policies
-- ────────────────────────────────────────────────────────────
-- These policies control who can upload/download/delete files
-- in the 'signal-files' bucket.

-- Service role can do everything (backend uploads via service key)
-- No explicit policy needed — service_role bypasses RLS.

-- Authenticated users: upload to their own folder (/{user_id}/...)
CREATE POLICY "Authenticated users can upload to own folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'signal-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Authenticated users: read their own files
CREATE POLICY "Authenticated users can read own files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'signal-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Anonymous users: upload to a shared 'public' folder (for demo/dev)
CREATE POLICY "Anonymous users can upload to public folder"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (
        bucket_id = 'signal-files'
        AND (storage.foldername(name))[1] = 'public'
    );

-- Anonymous users: read from the public folder
CREATE POLICY "Anonymous users can read public files"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (
        bucket_id = 'signal-files'
        AND (storage.foldername(name))[1] = 'public'
    );

-- ────────────────────────────────────────────────────────────
-- 3. Notes
-- ────────────────────────────────────────────────────────────
-- Storage path convention:
--   signal-files/{user_id}/{timestamp}_{filename}
--   signal-files/public/{timestamp}_{filename}  (for anonymous/dev)
--
-- The backend uses the service_role key, which bypasses RLS,
-- so it can always upload/download regardless of folder.
--
-- Frontend anon key can only access the 'public' folder.
