"""
SignalLens AI — Analysis Pipeline
===================================

Orchestrates the full signal analysis workflow:
  Load → Preprocess → Extract features → Compile results

Preserves the validated logic from Colab Cells 5–19 and 22.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from signalens.loaders import (
    LoadResult,
    load_signal,
    LoadError,
)
from signalens.preprocessing import preprocess_signal
from signalens.features import (
    TimeFeatures,
    IQMetrics,
    FFTResult,
    PSDResult,
    SpectrogramResult,
    calculate_time_features,
    calculate_fft,
    calculate_psd,
    calculate_spectrogram,
    calculate_iq_metrics,
    extract_features,
)


@dataclass
class AnalysisResult:
    """Complete analysis result for a signal file."""
    # File metadata
    filename: str
    file_size_bytes: int
    signal_type: str                # "wav" or "iq"
    sample_rate: float
    n_samples: int
    duration_s: float

    # Time-domain features
    time_features: TimeFeatures

    # IQ-specific metrics (None for WAV)
    iq_metrics: IQMetrics | None

    # Spectral data
    fft: FFTResult
    psd: PSDResult
    spectrogram: SpectrogramResult

    # Combined feature dictionary
    features: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a JSON-friendly dictionary."""
        result: dict[str, Any] = {
            "file": {
                "filename": self.filename,
                "size_bytes": self.file_size_bytes,
                "signal_type": self.signal_type,
                "sample_rate_Hz": self.sample_rate,
                "n_samples": self.n_samples,
                "duration_s": self.duration_s,
            },
            "metrics": self.time_features.to_dict(),
            "features": self.features,
        }
        if self.iq_metrics is not None:
            result["iq_metrics"] = self.iq_metrics.to_dict()
        return result


def analyze_signal(
    signal: np.ndarray,
    sample_rate: float,
    signal_type: str,
    filename: str = "<in-memory>",
    file_size_bytes: int = 0,
) -> AnalysisResult:
    """
    Analyze a preprocessed signal end-to-end.

    Args:
        signal: Raw loaded signal (before preprocessing).
        sample_rate: Sampling rate in Hz.
        signal_type: "wav" or "iq".
        filename: Original filename for reporting.
        file_size_bytes: Original file size for reporting.

    Returns:
        AnalysisResult with all computed features and spectral data.
    """
    # Step 1: Preprocess
    signal_pp = preprocess_signal(signal, signal_type)

    # Step 2: Time-domain features
    td = calculate_time_features(signal_pp, sample_rate)

    # Step 3: IQ-specific metrics
    iq = calculate_iq_metrics(signal_pp, sample_rate=sample_rate)

    # Step 4: Spectral analysis
    fft_result = calculate_fft(signal_pp, sample_rate)
    psd_result = calculate_psd(signal_pp, sample_rate)
    spec_result = calculate_spectrogram(signal_pp, sample_rate)

    # Step 5: Combined features
    features = extract_features(signal_pp, sample_rate)

    return AnalysisResult(
        filename=filename,
        file_size_bytes=file_size_bytes,
        signal_type=signal_type,
        sample_rate=sample_rate,
        n_samples=td.n_samples,
        duration_s=td.duration_s,
        time_features=td,
        iq_metrics=iq,
        fft=fft_result,
        psd=psd_result,
        spectrogram=spec_result,
        features=features,
    )


def analyze_file(
    source: str | bytes,
    filename: str | None = None,
    sample_rate: float | None = None,
    iq_dtype: str = "float32",
) -> AnalysisResult:
    """
    Full analysis pipeline: load a file and analyze it.

    This is the primary entry point for the backend API.

    Args:
        source: File path (str) or raw bytes.
        filename: Required when source is bytes.
        sample_rate: Override sample rate (especially for IQ files).
        iq_dtype: IQ data type assumption ("float32" or "complex64").

    Returns:
        AnalysisResult with all computed features and spectral data.

    Raises:
        LoadError: If the file cannot be loaded or validated.
    """
    # Load
    load_result = load_signal(
        source=source,
        filename=filename,
        sample_rate=sample_rate,
        iq_dtype=iq_dtype,
    )

    # Analyze
    return analyze_signal(
        signal=load_result.signal,
        sample_rate=load_result.sample_rate,
        signal_type=load_result.signal_type,
        filename=load_result.filename,
        file_size_bytes=load_result.file_size_bytes,
    )


def generate_report(result: AnalysisResult) -> str:
    """
    Generate a human-readable text report from an AnalysisResult.

    Preserves the report format from Colab Cell 22.
    """
    lines = [
        "=" * 60,
        "SIGNALENS AI — ANALYSIS REPORT",
        "=" * 60,
        f"File            : {result.filename}",
        f"Type            : {result.signal_type.upper()}",
        f"Size (bytes)    : {result.file_size_bytes}",
        f"Sample rate     : {result.sample_rate} Hz",
        f"Samples         : {result.n_samples}",
        f"Duration        : {result.duration_s:.6f} s",
        "-" * 60,
        "TIME-DOMAIN METRICS",
    ]
    for k, v in result.time_features.to_dict().items():
        lines.append(f"  {k}: {v}")

    if result.iq_metrics is not None:
        lines.append("-" * 60)
        lines.append("IQ-SPECIFIC METRICS")
        for k, v in result.iq_metrics.to_dict().items():
            lines.append(f"  {k}: {v}")

    lines.append("-" * 60)
    lines.append("SPECTRAL FEATURES")
    lines.append(
        f"  spectral_centroid_Hz : "
        f"{result.features.get('spectral_centroid_Hz')}"
    )
    lines.append(
        f"  bandwidth_3dB_Hz     : "
        f"{result.features.get('bandwidth_3dB_Hz')}"
    )

    lines.append("-" * 60)
    lines.append("NOTES")
    lines.append(
        "  • Sample rate for IQ files is an explicit assumption unless overridden."
    )
    lines.append("=" * 60)

    return "\n".join(lines)
