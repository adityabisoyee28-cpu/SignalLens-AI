/**
 * SignalLens AI — Supabase Storage Service
 *
 * Uses the official @supabase/supabase-js Storage API.
 * Authentication is handled by the Supabase client (apikey header only,
 * no Authorization Bearer for publishable keys).
 */

import { supabase } from "./supabase";

const BUCKET = "signal-files";

export interface StorageUploadResult {
  path: string;
  url: string | null;
}

export interface StorageUploadError {
  message: string;
  code?: string;
}

/**
 * Generate a unique storage path to prevent filename collisions.
 * Format: public/{timestamp}_{random}_{filename}
 */
function uniqueStoragePath(filename: string): string {
  const ts = Date.now();
  const rand = crypto.randomUUID().slice(0, 8);
  const safe = filename.replace(/[/\\]/g, "_").replace(/\s+/g, "_");
  return `public/${ts}_${rand}_${safe}`;
}

/**
 * Upload a signal file to Supabase Storage.
 *
 * Uses the official SDK: supabase.storage.from().upload().
 * The SDK sends the `apikey` header (publishable key) but does NOT
 * add an Authorization Bearer header (configured via accessToken: "").
 */
export async function uploadSignalFile(
  file: File,
): Promise<{ path: string | null; error: StorageUploadError | null }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return {
      path: null,
      error: {
        message: "Supabase is not configured. File was analyzed but not stored.",
        code: "NOT_CONFIGURED",
      },
    };
  }

  const storagePath = uniqueStoragePath(file.name);

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      let msg = error.message;
      if (
        msg.includes("row-level security") ||
        msg.includes("policy")
      ) {
        msg =
          "Storage access denied. The 'signal-files' bucket may need RLS policies configured in Supabase.";
      } else if (
        msg.includes("Bucket not found") ||
        msg.includes("bucket")
      ) {
        msg =
          "Storage bucket 'signal-files' not found. Please create it in your Supabase dashboard.";
      }
      console.error("[Storage] Upload failed:", error);
      return {
        path: null,
        error: { message: msg, code: error.message },
      };
    }

    return {
      path: data?.path ?? storagePath,
      error: null,
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Unknown storage error";
    console.error("[Storage] Upload exception:", err);
    return {
      path: null,
      error: { message: `Storage upload failed: ${msg}` },
    };
  }
}

/**
 * Get a temporary signed URL for a stored file (1 hour expiry).
 */
export async function getSignedUrl(
  path: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    if (error) {
      return { url: null, error: error.message };
    }
    return { url: data?.signedUrl ?? null, error: null };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Failed to get signed URL",
    };
  }
}
