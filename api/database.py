"""
SignalLens AI — Supabase Database Layer
=========================================

Provides Supabase client initialization and CRUD operations for:
  - files, analyses, features, predictions, reports

All credentials are read from environment variables.
When SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set, the module
operates in "passthrough" mode — all writes return None, and the API
continues to function without persistence.

Environment variables (set in Supabase Dashboard → Settings → Environment):
  SUPABASE_URL              — Project URL (e.g. https://xxx.supabase.co)
  SUPABASE_SERVICE_ROLE_KEY — Service role key (server-only, never expose to frontend)
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from supabase import Client, create_client

logger = logging.getLogger("signalens.db")

# ─── Storage constants ────────────────────────────────────────────────

STORAGE_BUCKET = "signal-files"

# ─── Client singleton ───────────────────────────────────────────────────

_client: Optional[Client] = None
_configured: bool = False


def get_client() -> Optional[Client]:
    """
    Return the Supabase client, creating it lazily on first call.

    Returns None if env vars are missing (passthrough mode).
    """
    global _client, _configured

    if _client is not None:
        return _client

    if _configured:
        # Already checked — env vars missing
        return None

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url or not key:
        logger.info(
            "Supabase not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing). "
            "Running in passthrough mode — analysis results are not persisted."
        )
        _configured = True
        return None

    try:
        _client = create_client(url, key)
        logger.info("Supabase client connected to %s", url[:40])
        _configured = True
        return _client
    except Exception as e:
        logger.error("Failed to connect to Supabase: %s", e)
        _configured = True
        return None


def is_configured() -> bool:
    """Check if Supabase credentials are available."""
    client = get_client()
    return client is not None


# ─── Storage: upload / download ────────────────────────────────────────

def upload_file_to_storage(
    file_bytes: bytes,
    filename: str,
    content_type: str = "application/octet-stream",
    folder: str = "public",
) -> Optional[str]:
    """
    Upload a file to the 'signal-files' Supabase Storage bucket.

    Args:
        file_bytes: Raw file content.
        filename: Original filename (used in the storage path).
        content_type: MIME type.
        folder: Subfolder (e.g. user_id or 'public' for anonymous).

    Returns:
        The storage path (e.g. 'public/1700000000_capture.iq') or None.
    """
    client = get_client()
    if client is None:
        return None

    # Build storage path: {folder}/{timestamp}_{filename}
    ts = int(datetime.now(timezone.utc).timestamp())
    # Sanitize filename (remove path separators)
    safe_name = filename.replace("/", "_").replace("\\", "_")
    storage_path = f"{folder}/{ts}_{safe_name}"

    try:
        client.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type},
        )
        logger.info("Uploaded to storage: %s (%d bytes)", storage_path, len(file_bytes))
        return storage_path
    except Exception as e:
        logger.error("Storage upload failed: %s", e)
        return None


def download_file_from_storage(storage_path: str) -> Optional[bytes]:
    """
    Download a file from the 'signal-files' bucket.

    Args:
        storage_path: The path returned by upload_file_to_storage.

    Returns:
        Raw file bytes, or None on failure.
    """
    client = get_client()
    if client is None:
        return None

    try:
        data = client.storage.from_(STORAGE_BUCKET).download(storage_path)
        logger.info("Downloaded from storage: %s (%d bytes)", storage_path, len(data))
        return data
    except Exception as e:
        logger.error("Storage download failed for %s: %s", storage_path, e)
        return None


def delete_file_from_storage(storage_path: str) -> bool:
    """
    Delete a file from the 'signal-files' bucket.
    """
    client = get_client()
    if client is None:
        return False

    try:
        client.storage.from_(STORAGE_BUCKET).remove([storage_path])
        logger.info("Deleted from storage: %s", storage_path)
        return True
    except Exception as e:
        logger.error("Storage delete failed for %s: %s", storage_path, e)
        return False


def get_storage_url(storage_path: str) -> Optional[str]:
    """
    Get the public URL for a stored file.
    Returns None if the bucket is private (which it is).
    For private buckets, use create_signed_url instead.
    """
    client = get_client()
    if client is None:
        return None

    try:
        # For private buckets, create a signed URL (1 hour expiry)
        resp = client.storage.from_(STORAGE_BUCKET).create_signed_url(
            storage_path, 3600
        )
        return resp.get("signedURL") if isinstance(resp, dict) else str(resp)
    except Exception as e:
        logger.warning("Failed to create signed URL for %s: %s", storage_path, e)
        return None


# ─── CRUD: files ────────────────────────────────────────────────────────

def insert_file(
    filename: str,
    file_type: str,
    file_size_bytes: int,
    sample_rate: Optional[float] = None,
    iq_dtype: str = "float32",
    user_id: Optional[str] = None,
    storage_path: Optional[str] = None,
) -> Optional[str]:
    """Insert a file record. Returns the file ID or None."""
    client = get_client()
    if client is None:
        return None

    row = {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "file_type": file_type,
        "file_size_bytes": file_size_bytes,
        "sample_rate": sample_rate,
        "iq_dtype": iq_dtype,
        "user_id": user_id,
        "storage_path": storage_path,
    }

    try:
        resp = client.table("files").insert(row).execute()
        file_id = resp.data[0]["id"] if resp.data else row["id"]
        logger.info("Inserted file record: %s (storage: %s)", file_id, storage_path)
        return file_id
    except Exception as e:
        logger.error("Failed to insert file: %s", e)
        return None


# ─── CRUD: analyses ─────────────────────────────────────────────────────

def insert_analysis(
    file_id: str,
    status: str = "pending",
    user_id: Optional[str] = None,
) -> Optional[str]:
    """Insert an analysis record. Returns the analysis ID or None."""
    client = get_client()
    if client is None:
        return None

    row = {
        "id": str(uuid.uuid4()),
        "file_id": file_id,
        "status": status,
        "user_id": user_id,
    }

    try:
        resp = client.table("analyses").insert(row).execute()
        analysis_id = resp.data[0]["id"] if resp.data else row["id"]
        logger.info("Inserted analysis record: %s", analysis_id)
        return analysis_id
    except Exception as e:
        logger.error("Failed to insert analysis: %s", e)
        return None


def update_analysis_status(
    analysis_id: str,
    status: str,
    error_message: Optional[str] = None,
) -> bool:
    """Update analysis status. Returns True on success."""
    client = get_client()
    if client is None:
        return False

    update: dict[str, Any] = {"status": status}
    if status == "complete":
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    if error_message is not None:
        update["error_message"] = error_message

    try:
        client.table("analyses").update(update).eq("id", analysis_id).execute()
        logger.info("Updated analysis %s → %s", analysis_id, status)
        return True
    except Exception as e:
        logger.error("Failed to update analysis: %s", e)
        return False


# ─── CRUD: features ─────────────────────────────────────────────────────

def insert_features(
    analysis_id: str,
    metrics: dict[str, Any],
    features: dict[str, Any],
) -> Optional[str]:
    """
    Insert feature extraction results.

    Args:
        analysis_id: Parent analysis ID.
        metrics: The SignalMetrics dict from the API response.
        features: The raw feature dict from signalens.extract_features().
    """
    client = get_client()
    if client is None:
        return None

    row = {
        "id": str(uuid.uuid4()),
        "analysis_id": analysis_id,
        # Time-domain from metrics
        "duration": metrics.get("duration"),
        "sample_rate": metrics.get("sampleRate"),
        "rms": metrics.get("rms"),
        "peak": metrics.get("peak"),
        "dominant_frequency": metrics.get("dominantFrequency"),
        "bandwidth": metrics.get("bandwidth"),
        "bandwidth_3db_hz": features.get("bandwidth_3dB_Hz"),
        "snr": metrics.get("snr"),
        "zero_crossing_rate": features.get("zero_crossing_rate"),
        "mean": features.get("mean"),
        "variance": features.get("variance"),
        "n_samples": features.get("n_samples"),
        # IQ-specific
        "i_mean": features.get("I_mean"),
        "q_mean": features.get("Q_mean"),
        "magnitude_rms": features.get("magnitude_rms"),
        "magnitude_peak": features.get("magnitude_peak"),
        "papr_db": features.get("PAPR_dB"),
        "phase_std_rad": features.get("phase_std_rad"),
        "inst_freq_mean_hz": features.get("inst_freq_mean_Hz"),
        "inst_freq_std_hz": features.get("inst_freq_std_Hz"),
        # Spectral
        "spectral_centroid_hz": features.get("spectral_centroid_Hz"),
        # Full feature dump
        "raw_features": json.dumps(features),
    }

    try:
        resp = client.table("features").insert(row).execute()
        feat_id = resp.data[0]["id"] if resp.data else row["id"]
        logger.info("Inserted features record: %s", feat_id)
        return feat_id
    except Exception as e:
        logger.error("Failed to insert features: %s", e)
        return None


# ─── CRUD: predictions ──────────────────────────────────────────────────

def insert_prediction(
    analysis_id: str,
    prediction: dict[str, Any],
) -> Optional[str]:
    """
    Insert an ML prediction result.

    Args:
        analysis_id: Parent analysis ID.
        prediction: Dict with 'class', 'confidence', 'probabilities'.
    """
    client = get_client()
    if client is None:
        return None

    confidence = prediction.get("confidence")
    anomaly_score = None
    if confidence is not None and confidence < 0.5:
        anomaly_score = 1.0 - confidence

    row = {
        "id": str(uuid.uuid4()),
        "analysis_id": analysis_id,
        "model_name": "random_forest_v1",
        "predicted_class": prediction.get("class", "Unknown"),
        "confidence": confidence,
        "probabilities": json.dumps(prediction.get("probabilities", {})),
        "anomaly_score": anomaly_score,
    }

    try:
        resp = client.table("predictions").insert(row).execute()
        pred_id = resp.data[0]["id"] if resp.data else row["id"]
        logger.info("Inserted prediction record: %s", pred_id)
        return pred_id
    except Exception as e:
        logger.error("Failed to insert prediction: %s", e)
        return None


# ─── CRUD: reports ──────────────────────────────────────────────────────

def insert_report(
    analysis_id: str,
    report_text: str,
    report_data: Optional[dict[str, Any]] = None,
) -> Optional[str]:
    """Insert a generated report."""
    client = get_client()
    if client is None:
        return None

    row = {
        "id": str(uuid.uuid4()),
        "analysis_id": analysis_id,
        "report_text": report_text,
        "report_json": json.dumps(report_data) if report_data else None,
    }

    try:
        resp = client.table("reports").insert(row).execute()
        report_id = resp.data[0]["id"] if resp.data else row["id"]
        logger.info("Inserted report record: %s", report_id)
        return report_id
    except Exception as e:
        logger.error("Failed to insert report: %s", e)
        return None


# ─── High-level: persist full analysis result ───────────────────────────

def persist_analysis_result(
    filename: str,
    file_type: str,
    file_size_bytes: int,
    metrics: dict[str, Any],
    features: dict[str, Any],
    prediction: Optional[dict[str, Any]],
    report_text: str,
    sample_rate: Optional[float] = None,
    iq_dtype: str = "float32",
    user_id: Optional[str] = None,
    storage_path: Optional[str] = None,
) -> Optional[str]:
    """
    Persist a complete analysis result across all tables.

    Returns the analysis_id on success, None if Supabase is not configured
    or any insert fails.
    """
    client = get_client()
    if client is None:
        return None

    # 1. Insert file (with storage path)
    file_id = insert_file(
        filename=filename,
        file_type=file_type,
        file_size_bytes=file_size_bytes,
        sample_rate=sample_rate,
        iq_dtype=iq_dtype,
        user_id=user_id,
        storage_path=storage_path,
    )
    if file_id is None:
        return None

    # 2. Insert analysis (starts as processing, we'll update to complete)
    analysis_id = insert_analysis(
        file_id=file_id,
        status="processing",
        user_id=user_id,
    )
    if analysis_id is None:
        return None

    # 3. Insert features
    insert_features(
        analysis_id=analysis_id,
        metrics=metrics,
        features=features,
    )

    # 4. Insert prediction (if available)
    if prediction is not None:
        insert_prediction(
            analysis_id=analysis_id,
            prediction=prediction,
        )

    # 5. Insert report
    insert_report(
        analysis_id=analysis_id,
        report_text=report_text,
        report_data={"metrics": metrics, "prediction": prediction},
    )

    # 6. Mark complete
    update_analysis_status(analysis_id, "complete")

    logger.info("Persisted full analysis result: analysis_id=%s", analysis_id)
    return analysis_id
