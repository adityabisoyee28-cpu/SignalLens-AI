"""
SignalLens AI — File Loaders
==============================

Handles loading WAV audio files and IQ/raw binary captures.

WAV: Standard PCM format. Sample rate, channels, and bit depth are read
     from the file header via soundfile.

IQ:  Binary file containing interleaved I/Q samples.
     Supported dtype assumptions:
       - "float32"  → interleaved float32 (I0, Q0, I1, Q1, ...)
       - "complex64" → native complex64 samples
     Sample rate is NOT stored in most raw IQ dumps, so a user-supplied
     or default sample rate is required.

Assumptions preserved from validated Colab prototype.
"""

from __future__ import annotations

import io
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Union

import numpy as np

# ─── Configuration ─────────────────────────────────────────────────────

DEFAULT_IQ_SAMPLE_RATE: float = 1_000_000.0  # 1 Msps — used only when fs unknown
DEFAULT_IQ_DTYPE: str = "float32"             # "float32" (interleaved) or "complex64"

WAV_EXTENSIONS = {".wav"}
IQ_EXTENSIONS = {".iq", ".bin", ".dat", ".raw"}


# ─── Data classes ──────────────────────────────────────────────────────

@dataclass
class LoadResult:
    """Result of loading a signal file."""
    signal: np.ndarray
    sample_rate: float
    signal_type: str               # "wav" or "iq"
    filename: str
    file_size_bytes: int
    validation_info: dict          # raw validation details


class LoadError(Exception):
    """Raised when a signal file cannot be loaded or validated."""
    pass


# ─── Validation ────────────────────────────────────────────────────────

def validate_file(filename: str, data: bytes) -> dict:
    """
    Validate a signal file by extension and size.

    Returns a dict with keys: filename, size_bytes, extension, is_wav,
    is_iq, valid, message.

    Preserves the validated logic from Colab Cell 5.
    """
    info: dict = {
        "filename": filename,
        "size_bytes": len(data),
        "extension": os.path.splitext(filename)[1].lower(),
        "is_wav": False,
        "is_iq": False,
        "valid": False,
        "message": "",
    }

    if info["size_bytes"] == 0:
        info["message"] = "Empty file"
        return info

    if info["extension"] in WAV_EXTENSIONS:
        info["is_wav"] = True
        info["valid"] = True
        info["message"] = "WAV file detected"
    elif info["extension"] in IQ_EXTENSIONS:
        info["is_iq"] = True
        info["valid"] = True
        info["message"] = "IQ/raw binary file detected"
    else:
        info["message"] = f"Unsupported extension: {info['extension']}"

    return info


# ─── WAV Loader ────────────────────────────────────────────────────────

def load_wav(data: bytes) -> tuple[np.ndarray, float]:
    """
    Load a WAV file from raw bytes.

    Returns:
        (signal, sample_rate) where signal is float64 with shape (samples,)
        or (samples, channels).

    Preserves the validated logic from Colab Cell 5.
    """
    import soundfile as sf

    try:
        audio, fs = sf.read(io.BytesIO(data), always_2d=True)
    except Exception as e:
        raise LoadError(f"Failed to read WAV data: {e}") from e

    signal = audio.astype(np.float64)
    return signal, float(fs)


# ─── IQ Loader ─────────────────────────────────────────────────────────

def load_iq(
    data: bytes,
    sample_rate: float | None = None,
    dtype: str = DEFAULT_IQ_DTYPE,
) -> tuple[np.ndarray, float]:
    """
    Load an IQ/raw binary file from raw bytes.

    For "float32" dtype: reads interleaved uint8, normalizes to [-1, 1],
    and produces complex samples as I + jQ.

    For "complex64" dtype: reads native complex64 samples directly.

    Args:
        data: Raw file bytes.
        sample_rate: Sampling rate in Hz. Falls back to DEFAULT_IQ_SAMPLE_RATE.
        dtype: "float32" (interleaved) or "complex64".

    Returns:
        (complex_signal, sample_rate) where signal is complex128.

    Preserves the validated logic from Colab Cell 5 (RTL-SDR style loading).
    """
    fs = sample_rate if sample_rate is not None else DEFAULT_IQ_SAMPLE_RATE

    if dtype == "complex64":
        iq = np.frombuffer(data, dtype=np.complex64).astype(np.complex128)
    elif dtype == "float32":
        # RTL-SDR style: uint8 interleaved → normalize → complex
        raw = np.frombuffer(data, dtype=np.uint8).astype(np.float32)
        raw = (raw - 127.5) / 127.5
        iq = raw[0::2] + 1j * raw[1::2]
    else:
        raise LoadError(f"Unsupported IQ dtype: {dtype!r}. Use 'float32' or 'complex64'.")

    if len(iq) == 0:
        raise LoadError("IQ file produced zero samples after parsing.")

    return iq, float(fs)


# ─── Unified Loader ────────────────────────────────────────────────────

def load_signal(
    source: Union[str, Path, bytes],
    filename: str | None = None,
    sample_rate: float | None = None,
    iq_dtype: str = DEFAULT_IQ_DTYPE,
) -> LoadResult:
    """
    Load a signal file (WAV or IQ) from a path or raw bytes.

    Automatically detects format from extension.

    Args:
        source: File path (str/Path) or raw bytes.
        filename: Required when source is bytes. Used for extension detection.
        sample_rate: Override sample rate (especially for IQ files).
        iq_dtype: IQ data type assumption ("float32" or "complex64").

    Returns:
        LoadResult with signal array, metadata, and validation info.
    """
    # Resolve bytes and filename
    if isinstance(source, (str, Path)):
        path = Path(source)
        if not path.exists():
            raise LoadError(f"File not found: {path}")
        data = path.read_bytes()
        fname = path.name
    elif isinstance(source, bytes):
        if filename is None:
            raise LoadError("filename is required when source is bytes.")
        data = source
        fname = filename
    else:
        raise LoadError(f"Unsupported source type: {type(source).__name__}")

    # Validate
    info = validate_file(fname, data)
    if not info["valid"]:
        raise LoadError(info["message"])

    # Load by type
    if info["is_wav"]:
        signal, fs = load_wav(data)
        sig_type = "wav"
    elif info["is_iq"]:
        signal, fs = load_iq(data, sample_rate=sample_rate, dtype=iq_dtype)
        sig_type = "iq"
    else:
        raise LoadError(f"Cannot determine signal type for: {fname}")

    return LoadResult(
        signal=signal,
        sample_rate=fs,
        signal_type=sig_type,
        filename=fname,
        file_size_bytes=len(data),
        validation_info=info,
    )
