"""
SignalLens AI — API Schemas
=============================

Pydantic models for request/response validation.
These match the frontend TypeScript types in src/types/signal.ts exactly.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ─── Request Schemas ───────────────────────────────────────────────────

class AnalyzeFormData(BaseModel):
    """Metadata fields sent alongside the file upload."""

    sample_rate: Optional[float] = Field(
        None,
        description="Override sample rate in Hz. Required for IQ files when "
                    "the file does not contain it. Defaults to 1 MHz for IQ.",
    )
    iq_dtype: Optional[str] = Field(
        "float32",
        description="IQ data type: 'float32' (interleaved uint8) or 'complex64'.",
    )


# ─── Response Schemas (matching src/types/signal.ts) ───────────────────

class SignalFileInfo(BaseModel):
    """Matches SignalFile in the frontend."""
    id: str = ""
    name: str = ""
    format: str = ""            # "WAV" | "IQ"
    size: int = 0               # bytes
    uploaded_at: str = Field(default="", alias="uploadedAt")  # ISO 8601
    status: str = "complete"    # "pending" | "analyzing" | "complete" | "error"

    model_config = {"populate_by_name": True}


class SignalMetrics(BaseModel):
    """Matches SignalMetrics in the frontend."""
    duration: float = 0         # seconds
    sample_rate: float = Field(default=0, alias="sampleRate")      # Hz
    rms: float = 0
    peak: float = 0
    dominant_frequency: float = Field(default=0, alias="dominantFrequency")  # Hz
    bandwidth: float = 0            # Hz
    snr: Optional[float] = None     # dB — only when available

    model_config = {"populate_by_name": True}


class ClassificationResult(BaseModel):
    """Matches ClassificationResult in the frontend."""
    type: str = "Unknown"           # e.g. "FM Broadcast Signal"
    confidence: float = 0           # 0–1
    characteristics: list[str] = Field(default_factory=list)


class AIAnalysis(BaseModel):
    """Matches AIAnalysis in the frontend."""
    classification: ClassificationResult = Field(
        default_factory=ClassificationResult
    )
    anomaly_score: Optional[float] = Field(
        None, alias="anomalyScore"
    )
    detected_characteristics: list[str] = Field(
        default_factory=list, alias="detectedCharacteristics"
    )
    raw_output: Optional[str] = Field(
        None, alias="rawOutput"
    )

    model_config = {"populate_by_name": True}


class WaveformData(BaseModel):
    """Matches { time: number[]; amplitude: number[] }."""
    time: list[float] = Field(default_factory=list)
    amplitude: list[float] = Field(default_factory=list)


class FFTData(BaseModel):
    """Matches { frequency: number[]; magnitude: number[] }."""
    frequency: list[float] = Field(default_factory=list)
    magnitude: list[float] = Field(default_factory=list)


class PSDData(BaseModel):
    """Matches { frequency: number[]; power: number[] }."""
    frequency: list[float] = Field(default_factory=list)
    power: list[float] = Field(default_factory=list)


class ConstellationData(BaseModel):
    """Matches { i: number[]; q: number[] }."""
    i: list[float] = Field(default_factory=list)
    q: list[float] = Field(default_factory=list)


class VisualizationData(BaseModel):
    """
    Matches VisualizationData in the frontend.
    Spectrogram is 2D: number[][] [time][frequency].
    """
    waveform: WaveformData = Field(default_factory=WaveformData)
    fft: FFTData = Field(default_factory=FFTData)
    psd: PSDData = Field(default_factory=PSDData)
    spectrogram: list[list[float]] = Field(default_factory=list)
    constellation: Optional[ConstellationData] = None


class AnalysisResponse(BaseModel):
    """
    Matches AnalysisResult in the frontend (src/types/signal.ts).
    This is the primary response from POST /analyze.
    """
    file: SignalFileInfo = Field(default_factory=SignalFileInfo)
    metrics: SignalMetrics = Field(default_factory=SignalMetrics)
    ai_analysis: AIAnalysis = Field(
        default_factory=AIAnalysis, alias="aiAnalysis"
    )
    visualization: VisualizationData = Field(
        default_factory=VisualizationData
    )
    analyzed_at: str = Field(default="", alias="analyzedAt")

    model_config = {"populate_by_name": True}


class ErrorResponse(BaseModel):
    """Error response body."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "0.1.0"
    engine: str = "signalens"
