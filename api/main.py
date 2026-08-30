"""
SignalLens AI — FastAPI Application
=====================================

Main entry point for the analysis API.

Endpoints:
    GET  /           — Health check
    GET  /health     — Health check (alias)
    POST /analyze    — Full signal analysis pipeline

Usage:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
    # or
    python -m api.main
"""

from __future__ import annotations

import io
import logging
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from signalens.analysis import AnalysisResult, analyze_signal
from signalens.classifier import (
    load_model,
    predict_signal,
)
from signalens.loaders import LoadError, load_iq, load_wav, validate_file
from signalens.preprocessing import preprocess_signal

from api.schemas import (
    AIAnalysis,
    AnalysisResponse,
    ClassificationResult,
    ConstellationData,
    ErrorResponse,
    FFTData,
    HealthResponse,
    PSDData,
    SignalFileInfo,
    SignalMetrics,
    VisualizationData,
    WaveformData,
)
from api.database import (
    is_configured,
    persist_analysis_result,
    upload_file_to_storage,
    download_file_from_storage,
    get_storage_url,
)

# ─── Logging ───────────────────────────────────────────────────────────

logger = logging.getLogger("signalens.api")

# ─── ML Model (trained on startup) ────────────────────────────────────

_ml_model = None
_ml_scaler = None


def _load_ml_model():
    """Load the pre-trained ML classifier from disk."""
    global _ml_model, _ml_scaler
    try:
        model_path = Path(__file__).resolve().parent.parent / "signalens_model.joblib"
        scaler_path = Path(__file__).resolve().parent.parent / "signalens_scaler.joblib"
        if model_path.exists() and scaler_path.exists():
            logger.info("Loading pre-trained ML classifier...")
            _ml_model, _ml_scaler = load_model(model_path, scaler_path)
            logger.info("ML classifier loaded from disk.")
        else:
            logger.info("No pre-trained model found — ML predictions disabled.")
            _ml_model = None
            _ml_scaler = None
    except Exception as e:
        logger.warning("ML classifier loading failed: %s", e)
        _ml_model = None
        _ml_scaler = None


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Lifespan context manager: loads ML model on startup."""
    _load_ml_model()
    # Log Supabase status on startup
    if is_configured():
        logger.info("Supabase database connected — analysis results will be persisted.")
    else:
        logger.info("Supabase not configured — running without database persistence.")
    yield
    # cleanup on shutdown if needed


# ─── App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="SignalLens AI API",
    description="Automated analysis of .IQ and .WAV signal files — SIH26147",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ──────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ───────────────────────────────────────────────────────────

def _result_to_response(
    result: AnalysisResult,
    file_id: str,
    prediction: Optional[dict] = None,
) -> dict:
    """
    Convert a signalens AnalysisResult into the frontend-compatible
    AnalysisResponse dict.

    This maps between the Python engine's output shape and the
    TypeScript AnalysisResult type defined in src/types/signal.ts.
    """
    now = datetime.now(timezone.utc).isoformat()

    # ── File info ──
    fmt = "WAV" if result.signal_type == "wav" else "IQ"
    file_info = SignalFileInfo(
        id=file_id,
        name=result.filename,
        format=fmt,
        size=result.file_size_bytes,
        uploaded_at=now,
        status="complete",
    )

    # ── Metrics ──
    td = result.time_features
    bandwidth = result.features.get("bandwidth_3dB_Hz", 0.0)

    metrics = SignalMetrics(
        duration=td.duration_s,
        sample_rate=td.sample_rate_hz,
        rms=td.rms,
        peak=td.peak,
        dominant_frequency=td.dominant_frequency_hz,
        bandwidth=bandwidth,
        snr=None,  # SNR requires reference signal; not computed here
    )

    # ── AI Analysis ──
    if prediction is not None:
        pred_class = prediction["class"]
        confidence = prediction["confidence"]
        all_probs = prediction["probabilities"]

        # Derive characteristics from spectral features
        characteristics: list[str] = []
        if bandwidth > 0:
            characteristics.append(
                f"bandwidth={bandwidth:.0f} Hz"
            )
        if td.dominant_frequency_hz > 0:
            characteristics.append(
                f"dominant={td.dominant_frequency_hz:.0f} Hz"
            )

        classification = ClassificationResult(
            type=pred_class,
            confidence=confidence,
            characteristics=characteristics,
        )
        anomaly_score = None
        if confidence < 0.5:
            anomaly_score = 1.0 - confidence

        # Build detected characteristics from signal properties
        detected: list[str] = []
        if td.zero_crossing_rate > 0.5:
            detected.append("High zero-crossing rate")
        if td.peak > 0.9:
            detected.append("Near-full-scale peak")
        if td.rms < 0.01:
            detected.append("Very low signal power")
        if result.iq_metrics is not None:
            detected.append("Complex (IQ) signal")
            if result.iq_metrics.papr_db > 10:
                detected.append("High PAPR")
        else:
            detected.append("Real-valued signal")
        detected.append(
            f"SNR estimate: {td.rms / (td.peak - td.rms + 1e-12):.1f}"
            if td.peak > td.rms
            else "Constant envelope"
        )

        raw_output_parts = [f"{k}: {v:.4f}" for k, v in all_probs.items()]
        raw_output = "Probabilities: " + ", ".join(raw_output_parts)

        ai_analysis = AIAnalysis(
            classification=classification,
            anomaly_score=anomaly_score,
            detected_characteristics=detected,
            raw_output=raw_output,
        )
    else:
        ai_analysis = AIAnalysis()

    # ── Visualizations ──
    fft_result = result.fft
    psd_result = result.psd
    spec_result = result.spectrogram

    # Waveform: downsample for frontend (max 2000 points)
    max_waveform_pts = 2000
    signal_pp = preprocess_signal(
        _last_loaded_signal, result.signal_type
    ) if _last_loaded_signal is not None else None

    if signal_pp is not None:
        n = len(signal_pp)
        # Use magnitude for complex, real values for real signals
        if np.iscomplexobj(signal_pp):
            display_sig = np.abs(signal_pp)
        else:
            display_sig = signal_pp.astype(np.float64)

        if n <= max_waveform_pts:
            t_arr = (np.arange(n) / result.sample_rate).tolist()
            amp_arr = display_sig.tolist()
        else:
            # Peak-preserving windowed downsampling:
            # Pick the sample with max absolute value per window,
            # but store its ORIGINAL signed value to preserve waveform shape.
            window_size = n // max_waveform_pts
            t_arr = []
            amp_arr = []
            for i in range(0, n, window_size):
                chunk = display_sig[i : i + window_size]
                if len(chunk) == 0:
                    break
                peak_idx = int(np.argmax(np.abs(chunk)))
                t_arr.append(float((i + peak_idx) / result.sample_rate))
                amp_arr.append(float(display_sig[i + peak_idx]))
        waveform = WaveformData(time=t_arr, amplitude=amp_arr)
    else:
        waveform = WaveformData()

    # FFT (downsample with peak-preserving)
    max_fft_pts = 2000
    fft_freq_arr = np.array(fft_result.frequency)
    fft_mag_arr = np.array(fft_result.magnitude_db)
    if len(fft_freq_arr) > max_fft_pts:
        # Use windowed-max to preserve peaks (not naive skip)
        n_bins = len(fft_freq_arr)
        window_size = n_bins // max_fft_pts
        out_freq = []
        out_mag = []
        for i in range(0, n_bins, window_size):
            chunk = fft_mag_arr[i : i + window_size]
            if len(chunk) == 0:
                break
            peak_idx = np.argmax(chunk)
            out_freq.append(float(fft_freq_arr[i + peak_idx]))
            out_mag.append(float(fft_mag_arr[i + peak_idx]))
    else:
        out_freq = fft_freq_arr.tolist()
        out_mag = fft_mag_arr.tolist()

    fft_data = FFTData(frequency=out_freq, magnitude=out_mag)

    # PSD (downsample with peak-preserving)
    max_psd_pts = 1000
    psd_freq_arr = np.array(psd_result.frequency)
    psd_pow_arr = np.array(psd_result.power)
    if len(psd_freq_arr) > max_psd_pts:
        n_bins = len(psd_freq_arr)
        window_size = n_bins // max_psd_pts
        out_psd_freq = []
        out_psd_pow = []
        for i in range(0, n_bins, window_size):
            chunk = psd_pow_arr[i : i + window_size]
            if len(chunk) == 0:
                break
            peak_idx = np.argmax(chunk)
            out_psd_freq.append(float(psd_freq_arr[i + peak_idx]))
            out_psd_pow.append(float(psd_pow_arr[i + peak_idx]))
    else:
        out_psd_freq = psd_freq_arr.tolist()
        out_psd_pow = psd_pow_arr.tolist()

    psd_data = PSDData(frequency=out_psd_freq, power=out_psd_pow)

    # Spectrogram (transpose: scipy returns [freq × time], frontend expects [time × freq])
    spec_2d = spec_result.power
    spec_transposed = spec_2d.T.tolist()  # now [time × freq]

    # Downsample spectrogram if too large
    max_spec_time = 200
    max_spec_freq = 200
    if len(spec_transposed) > max_spec_time or (
        len(spec_transposed[0]) if spec_transposed else 0
    ) > max_spec_freq:
        t_step = max(1, len(spec_transposed) // max_spec_time)
        f_step = max(1, len(spec_transposed[0]) // max_spec_freq) if spec_transposed else 1
        spec_transposed = [
            row[::f_step] for row in spec_transposed[::t_step]
        ]

    # Constellation (IQ only)
    constellation = None
    if result.iq_metrics is not None and signal_pp is not None and np.iscomplexobj(signal_pp):
        max_const_pts = 3000
        n = len(signal_pp)
        if n <= max_const_pts:
            i_arr = np.real(signal_pp).tolist()
            q_arr = np.imag(signal_pp).tolist()
        else:
            # Peak-preserving windowed-max for constellation
            window_size = n // max_const_pts
            i_arr = []
            q_arr = []
            for i in range(0, n, window_size):
                chunk = signal_pp[i : i + window_size]
                if len(chunk) == 0:
                    break
                peak_idx = np.argmax(np.abs(chunk))
                i_arr.append(float(np.real(chunk[peak_idx])))
                q_arr.append(float(np.imag(chunk[peak_idx])))
        constellation = ConstellationData(i=i_arr, q=q_arr)

    visualization = VisualizationData(
        waveform=waveform,
        fft=fft_data,
        psd=psd_data,
        spectrogram=spec_transposed,
        constellation=constellation,
    )

    return {
        "file": file_info.model_dump(by_alias=True),
        "metrics": metrics.model_dump(by_alias=True),
        "aiAnalysis": ai_analysis.model_dump(by_alias=True),
        "visualization": visualization.model_dump(),
        "analyzedAt": now,
    }


# Module-level storage for the last loaded signal (for waveform extraction)
# In production, this would be a temp file or Redis cache.
_last_loaded_signal: Optional[np.ndarray] = None
_last_sample_rate: float = 0
_last_signal_type: str = ""


# ─── Routes ────────────────────────────────────────────────────────────

@app.get("/", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        engine="signalens",
    )


@app.post(
    "/analyze",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        413: {"model": ErrorResponse, "description": "File too large"},
        415: {"model": ErrorResponse, "description": "Unsupported format"},
        500: {"model": ErrorResponse, "description": "Analysis failed"},
    },
)
async def analyze(
    file: UploadFile = File(..., description="Signal file (.wav, .iq, .raw, .cf32, .cs16)"),
    sample_rate: Optional[float] = Form(
        None,
        description="Override sample rate in Hz (required for IQ files without header)",
    ),
    iq_dtype: str = Form(
        "float32",
        description="IQ data type: 'float32' (interleaved uint8) or 'complex64'",
    ),
):
    """
    POST /analyze — Full signal analysis pipeline.

    Accepts a signal file upload and returns structured analysis results
    including signal parameters, extracted features, ML prediction,
    and visualization data.

    The response shape matches the frontend's AnalysisResult type exactly.
    """
    global _last_loaded_signal, _last_sample_rate, _last_signal_type

    filename = file.filename or "unknown"

    # ── Step 1: Read file bytes ──
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read uploaded file: {e}",
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file uploaded.",
        )

    # 100 MB limit
    max_bytes = 100 * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(file_bytes)} bytes). Maximum is {max_bytes} bytes.",
        )

    # ── Step 2: Validate ──
    validation = validate_file(filename, file_bytes)
    if not validation["valid"]:
        code = "INVALID_EXTENSION" if "extension" in validation["message"].lower() else "INVALID_FILE"
        raise HTTPException(
            status_code=415 if "extension" in validation["message"].lower() else 400,
            detail=validation["message"],
            headers={"X-Error-Code": code},
        )

    signal_type = "wav" if validation["is_wav"] else "iq"

    # ── Step 3: Load signal ──
    try:
        if signal_type == "wav":
            signal, fs = load_wav(file_bytes)
        else:
            signal, fs = load_iq(
                file_bytes,
                sample_rate=sample_rate,
                dtype=iq_dtype,
            )
    except LoadError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to load signal: {e}",
        )
    except Exception as e:
        logger.error("Load error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Internal error loading file: {type(e).__name__}",
        )

    # ── Step 4: Run signal processing engine ──
    try:
        # Store for waveform extraction in response builder
        _last_loaded_signal = signal
        _last_sample_rate = fs
        _last_signal_type = signal_type

        result = analyze_signal(
            signal=signal,
            sample_rate=fs,
            signal_type=signal_type,
            filename=filename,
            file_size_bytes=len(file_bytes),
        )
    except Exception as e:
        logger.error("Analysis error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {type(e).__name__}: {e}",
        )

    # ── Step 5: ML prediction (if model available) ──
    prediction_dict = None
    if _ml_model is not None and _ml_scaler is not None:
        try:
            signal_pp = preprocess_signal(signal, signal_type)
            pred_class, pred_probs = predict_signal(
                signal_pp, fs, model=_ml_model, scaler=_ml_scaler
            )
            confidence = float(max(pred_probs.values()))
            prediction_dict = {
                "class": pred_class,
                "confidence": confidence,
                "probabilities": {
                    k: float(v) for k, v in pred_probs.items()
                },
            }
        except Exception as e:
            logger.warning("ML prediction failed (non-fatal): %s", e)

    # ── Step 6: Build response ──
    file_id = f"sig-{len(file_bytes)}-{int(datetime.now(timezone.utc).timestamp())}"
    response_data = _result_to_response(result, file_id, prediction_dict)

    # ── Step 7: Upload to Supabase Storage + persist (non-fatal) ──
    storage_path = None
    try:
        # Upload the actual file bytes to storage
        content_type = "audio/wav" if signal_type == "wav" else "application/octet-stream"
        storage_path = upload_file_to_storage(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            folder="public",  # or user_id when auth is implemented
        )
        if storage_path:
            logger.info("File stored: %s → %s", filename, storage_path)
    except Exception as e:
        logger.warning("Storage upload failed (non-fatal): %s", e)

    try:
        metrics_for_db = response_data["metrics"]
        features_for_db = result.features  # raw dict from signalens
        report_text = f"SignalLens AI Analysis: {filename} ({signal_type.upper()})"
        persist_analysis_result(
            filename=filename,
            file_type=signal_type,
            file_size_bytes=len(file_bytes),
            metrics=metrics_for_db,
            features=features_for_db,
            prediction=prediction_dict,
            report_text=report_text,
            sample_rate=fs,
            iq_dtype=iq_dtype,
            storage_path=storage_path,
        )
    except Exception as e:
        # Persistence failure must never block the response
        logger.warning("Supabase persistence failed (non-fatal): %s", e)

    # Clean up global state
    _last_loaded_signal = None

    # Add storage info to response (for debugging / future use)
    if storage_path:
        response_data["storagePath"] = storage_path

    return response_data


@app.get("/files/{storage_path:path}")
async def get_file(storage_path: str):
    """
    GET /files/{storage_path} — Retrieve a stored signal file.

    Downloads the file from Supabase Storage and returns it.
    Used by the backend to re-process stored files.
    """
    file_bytes = download_file_from_storage(storage_path)
    if file_bytes is None:
        raise HTTPException(
            status_code=404,
            detail=f"File not found in storage: {storage_path}",
        )

    from fastapi.responses import Response

    # Determine content type from extension
    ext = storage_path.rsplit(".", 1)[-1].lower() if "." in storage_path else "bin"
    ct = {"wav": "audio/wav", "iq": "application/octet-stream"}.get(
        ext, "application/octet-stream"
    )

    return Response(
        content=file_bytes,
        media_type=ct,
        headers={"Content-Disposition": f'attachment; filename="{storage_path.split("/")[-1]}"'},
    )


@app.get("/files/{storage_path:path}/url")
async def get_file_url(storage_path: str):
    """
    GET /files/{storage_path}/url — Get a signed URL for a stored file.
    """
    url = get_storage_url(storage_path)
    if url is None:
        raise HTTPException(
            status_code=404,
            detail=f"Cannot generate URL for: {storage_path}",
        )
    return {"url": url, "expires_in": 3600}


# ─── Run ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
