"""
SignalLens AI — Integration Tests
===================================

Validates the FastAPI /analyze endpoint end-to-end with real signal files.
Tests WAV processing, IQ processing, DSP accuracy, ML prediction, and error handling.

Run: python tests/test_api.py
"""

from __future__ import annotations

import io
import math
import sys
import struct

import numpy as np
from fastapi.testclient import TestClient
from scipy.io import wavfile

# ─── App Setup ────────────────────────────────────────────────────────

from api.main import app, _load_ml_model

client = TestClient(app)

# Load pre-trained ML model at module level (same as server startup)
_load_ml_model()


# ─── Helpers ──────────────────────────────────────────────────────────

def make_wav_bytes(
    frequency: float = 1000.0,
    sample_rate: int = 48000,
    duration: float = 2.0,
    amplitude: float = 0.8,
) -> bytes:
    """Create a synthetic WAV file as bytes."""
    n_samples = int(sample_rate * duration)
    t = np.arange(n_samples) / sample_rate
    signal = amplitude * np.sin(2 * np.pi * frequency * t)
    # Convert to int16 for WAV
    wav_signal = np.int16(signal / np.max(np.abs(signal)) * 32767)
    buf = io.BytesIO()
    wavfile.write(buf, sample_rate, wav_signal)
    return buf.getvalue()


def make_iq_bytes(
    n_samples: int = 10000,
    sample_rate: float = 250000.0,
) -> bytes:
    """Create a synthetic IQ file (RTL-SDR uint8 interleaved) as bytes."""
    rng = np.random.default_rng(42)
    t = np.arange(n_samples) / sample_rate
    # AM-like signal
    fc = 50000.0
    fm = 1000.0
    signal = (1 + 0.5 * np.sin(2 * np.pi * fm * t)) * np.sin(2 * np.pi * fc * t)
    # Add noise
    signal += 0.1 * rng.standard_normal(n_samples)
    # Normalize to [-1, 1]
    signal = signal / np.max(np.abs(signal))
    # Convert to uint8 interleaved
    i_samples = (signal * 127.5 + 127.5).astype(np.uint8)
    q_samples = (signal * 127.5 + 127.5).astype(np.uint8)
    interleaved = np.empty(2 * n_samples, dtype=np.uint8)
    interleaved[0::2] = i_samples
    interleaved[1::2] = q_samples
    return interleaved.tobytes()


# ─── Health Check ─────────────────────────────────────────────────────

def test_health_check():
    """GET /health returns status ok."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["engine"] == "signalens"
    assert "version" in data
    print("  ✅ Health check")


def test_root_health():
    """GET / also returns health check."""
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    print("  ✅ Root health check")


# ─── WAV Processing ───────────────────────────────────────────────────

def test_wav_upload_1khz():
    """Upload 1 kHz sine wave, verify dominant frequency is ~1000 Hz."""
    wav = make_wav_bytes(frequency=1000.0, sample_rate=48000, duration=2.0)
    resp = client.post(
        "/analyze",
        files={"file": ("test_1khz.wav", wav, "audio/wav")},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()

    # File info
    assert data["file"]["format"] == "WAV"
    assert data["file"]["name"] == "test_1khz.wav"
    assert data["file"]["size"] == len(wav)

    # Metrics
    metrics = data["metrics"]
    assert abs(metrics["sampleRate"] - 48000) < 1, f"Sample rate: {metrics['sampleRate']}"
    assert abs(metrics["duration"] - 2.0) < 0.01, f"Duration: {metrics['duration']}"
    assert metrics["rms"] > 0, f"RMS should be > 0, got {metrics['rms']}"
    assert metrics["peak"] > 0, f"Peak should be > 0, got {metrics['peak']}"

    # Dominant frequency should be very close to 1000 Hz
    dom_freq = metrics["dominantFrequency"]
    assert abs(dom_freq - 1000.0) < 50, f"Dominant freq: {dom_freq} Hz (expected ~1000)"
    print(f"  ✅ WAV 1kHz: dom_freq={dom_freq:.1f} Hz, rms={metrics['rms']:.4f}, peak={metrics['peak']:.4f}")


def test_wav_processing_3khz():
    """Upload 3 kHz sine wave, verify FFT peak."""
    wav = make_wav_bytes(frequency=3000.0, sample_rate=48000, duration=1.0)
    resp = client.post(
        "/analyze",
        files={"file": ("test_3khz.wav", wav, "audio/wav")},
    )
    assert resp.status_code == 200
    data = resp.json()
    dom_freq = data["metrics"]["dominantFrequency"]
    assert abs(dom_freq - 3000.0) < 50, f"Dominant freq: {dom_freq} Hz"
    print(f"  ✅ WAV 3kHz: dom_freq={dom_freq:.1f} Hz")


def test_wav_visualizations():
    """Verify all visualization data is present and non-empty."""
    wav = make_wav_bytes(frequency=1000.0, sample_rate=48000, duration=2.0)
    resp = client.post(
        "/analyze",
        files={"file": ("test_viz.wav", wav, "audio/wav")},
    )
    assert resp.status_code == 200
    data = resp.json()
    viz = data["visualization"]

    # Waveform
    assert len(viz["waveform"]["time"]) > 0, "Waveform time is empty"
    assert len(viz["waveform"]["amplitude"]) > 0, "Waveform amplitude is empty"
    assert len(viz["waveform"]["time"]) == len(viz["waveform"]["amplitude"])

    # FFT
    assert len(viz["fft"]["frequency"]) > 0, "FFT frequency is empty"
    assert len(viz["fft"]["magnitude"]) > 0, "FFT magnitude is empty"

    # PSD
    assert len(viz["psd"]["frequency"]) > 0, "PSD frequency is empty"
    assert len(viz["psd"]["power"]) > 0, "PSD power is empty"

    # Spectrogram
    assert len(viz["spectrogram"]) > 0, "Spectrogram is empty"
    assert len(viz["spectrogram"][0]) > 0, "Spectrogram rows are empty"

    # No constellation for WAV
    assert viz["constellation"] is None, "WAV should not have constellation"

    print(f"  ✅ WAV visualizations: waveform={len(viz['waveform']['time'])} pts, "
          f"fft={len(viz['fft']['frequency'])} bins, "
          f"psd={len(viz['psd']['frequency'])} bins, "
          f"spec={len(viz['spectrogram'])}x{len(viz['spectrogram'][0])}")


# ─── IQ Processing ────────────────────────────────────────────────────

def test_iq_upload():
    """Upload IQ file, verify IQ-specific analysis."""
    iq = make_iq_bytes(n_samples=10000)
    resp = client.post(
        "/analyze",
        files={"file": ("test.iq", iq, "application/octet-stream")},
        data={"sample_rate": "250000"},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()

    # File info
    assert data["file"]["format"] == "IQ"

    # Metrics
    metrics = data["metrics"]
    assert metrics["sampleRate"] == 250000, f"Sample rate: {metrics['sampleRate']}"
    assert metrics["duration"] > 0

    # Constellation should be present for IQ
    viz = data["visualization"]
    assert viz["constellation"] is not None, "IQ file should have constellation"
    assert len(viz["constellation"]["i"]) > 0
    assert len(viz["constellation"]["q"]) > 0
    assert len(viz["constellation"]["i"]) == len(viz["constellation"]["q"])

    # AI analysis should have a classification
    ai = data["aiAnalysis"]
    assert ai["classification"]["type"] != "Unknown", f"Classification: {ai['classification']['type']}"
    assert ai["classification"]["confidence"] > 0

    print(f"  ✅ IQ upload: class={ai['classification']['type']}, "
          f"conf={ai['classification']['confidence']:.3f}, "
          f"constellation={len(viz['constellation']['i'])} pts")


# ─── ML Prediction ────────────────────────────────────────────────────

def test_ml_classification():
    """Verify ML model provides classification with probability."""
    wav = make_wav_bytes(frequency=1000.0, sample_rate=48000, duration=2.0)
    resp = client.post(
        "/analyze",
        files={"file": ("ml_test.wav", wav, "audio/wav")},
    )
    assert resp.status_code == 200
    data = resp.json()
    ai = data["aiAnalysis"]

    # Should have a classification
    assert ai["classification"]["type"] != "Unknown"
    assert 0 < ai["classification"]["confidence"] <= 1.0

    # Should have raw output with probabilities
    assert ai["rawOutput"] is not None
    assert "Probabilities:" in ai["rawOutput"]

    print(f"  ✅ ML classification: {ai['classification']['type']} "
          f"({ai['classification']['confidence']:.3f})")


# ─── Feature Extraction ───────────────────────────────────────────────

def test_feature_extraction():
    """Verify features are extracted and present in AI analysis."""
    wav = make_wav_bytes(frequency=1000.0, sample_rate=48000, duration=1.0)
    resp = client.post(
        "/analyze",
        files={"file": ("feat_test.wav", wav, "audio/wav")},
    )
    assert resp.status_code == 200
    data = resp.json()

    # Check detected characteristics exist
    ai = data["aiAnalysis"]
    assert isinstance(ai["detectedCharacteristics"], list)
    assert len(ai["detectedCharacteristics"]) > 0

    # Check metrics are real values (not None/0 for computed fields)
    metrics = data["metrics"]
    assert metrics["rms"] > 0
    assert metrics["peak"] > 0
    assert metrics["dominantFrequency"] > 0
    print(f"  ✅ Feature extraction: {len(ai['detectedCharacteristics'])} characteristics detected")


# ─── Error Handling ───────────────────────────────────────────────────

def test_empty_file_rejected():
    """Empty file should return 400."""
    resp = client.post(
        "/analyze",
        files={"file": ("empty.wav", b"", "audio/wav")},
    )
    assert resp.status_code == 400
    print("  ✅ Empty file rejected (400)")


def test_unsupported_extension():
    """Unsupported file extension should return 415."""
    resp = client.post(
        "/analyze",
        files={"file": ("test.mp3", b"fake mp3 content", "audio/mpeg")},
    )
    assert resp.status_code == 415
    print("  ✅ Unsupported extension rejected (415)")


def test_unsupported_txt():
    """Plain text file should be rejected."""
    resp = client.post(
        "/analyze",
        files={"file": ("readme.txt", b"This is not a signal file", "text/plain")},
    )
    assert resp.status_code == 415
    print("  ✅ .txt file rejected (415)")


def test_corrupted_wav():
    """Corrupted WAV data should return 400."""
    resp = client.post(
        "/analyze",
        files={"file": ("corrupt.wav", b"RIFF\x00\x00\x00\x00WAVEfmt garbage", "audio/wav")},
    )
    assert resp.status_code == 400
    print("  ✅ Corrupted WAV rejected (400)")


def test_oversized_file():
    """File exceeding 100 MB limit should return 413."""
    # Create a 101 MB dummy payload
    big_data = b"\x00" * (101 * 1024 * 1024)
    resp = client.post(
        "/analyze",
        files={"file": ("huge.wav", big_data, "audio/wav")},
    )
    assert resp.status_code == 413
    print("  ✅ Oversized file rejected (413)")


def test_wrong_http_method():
    """GET on /analyze should return 405."""
    resp = client.get("/analyze")
    assert resp.status_code == 405
    print("  ✅ Wrong HTTP method rejected (405)")


def test_missing_file_field():
    """Request without file field should return 422."""
    resp = client.post("/analyze")
    assert resp.status_code == 422
    print("  ✅ Missing file field rejected (422)")


def test_invalid_iq_dtype():
    """Invalid IQ dtype should return 400."""
    iq = make_iq_bytes(n_samples=1000)
    resp = client.post(
        "/analyze",
        files={"file": ("test.iq", iq, "application/octet-stream")},
        data={"sample_rate": "250000", "iq_dtype": "invalid_format"},
    )
    assert resp.status_code == 400
    print("  ✅ Invalid IQ dtype rejected (400)")


# ─── CORS ─────────────────────────────────────────────────────────────

def test_cors_preflight():
    """OPTIONS preflight should return CORS headers."""
    resp = client.options(
        "/analyze",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert resp.status_code == 200
    assert "access-control-allow-origin" in resp.headers
    print("  ✅ CORS preflight")


def test_cors_post():
    """POST with Origin header should include CORS headers."""
    wav = make_wav_bytes(frequency=1000.0, sample_rate=48000, duration=1.0)
    resp = client.post(
        "/analyze",
        files={"file": ("cors_test.wav", wav, "audio/wav")},
        headers={"Origin": "http://localhost:5173"},
    )
    assert resp.status_code == 200
    assert "access-control-allow-origin" in resp.headers
    print("  ✅ CORS POST headers present")


# ─── Response Schema ──────────────────────────────────────────────────

def test_response_schema():
    """Verify response matches expected schema."""
    wav = make_wav_bytes(frequency=1000.0, sample_rate=48000, duration=1.0)
    resp = client.post(
        "/analyze",
        files={"file": ("schema_test.wav", wav, "audio/wav")},
    )
    assert resp.status_code == 200
    data = resp.json()

    # Top-level keys
    required_keys = {"file", "metrics", "aiAnalysis", "visualization", "analyzedAt"}
    assert required_keys.issubset(data.keys()), f"Missing keys: {required_keys - data.keys()}"

    # File keys
    file_keys = {"id", "name", "format", "size", "uploadedAt", "status"}
    assert file_keys.issubset(data["file"].keys())

    # Metrics keys
    metrics_keys = {"duration", "sampleRate", "rms", "peak", "dominantFrequency", "bandwidth", "snr"}
    assert metrics_keys.issubset(data["metrics"].keys())

    # AI analysis keys
    ai_keys = {"classification", "detectedCharacteristics"}
    assert ai_keys.issubset(data["aiAnalysis"].keys())
    assert "type" in data["aiAnalysis"]["classification"]
    assert "confidence" in data["aiAnalysis"]["classification"]

    # Visualization keys
    viz_keys = {"waveform", "fft", "psd", "spectrogram", "constellation"}
    assert viz_keys.issubset(data["visualization"].keys())

    print("  ✅ Response schema valid")


# ─── Run All Tests ────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [
        test_health_check,
        test_root_health,
        test_wav_upload_1khz,
        test_wav_processing_3khz,
        test_wav_visualizations,
        test_iq_upload,
        test_ml_classification,
        test_feature_extraction,
        test_empty_file_rejected,
        test_unsupported_extension,
        test_unsupported_txt,
        test_corrupted_wav,
        test_oversized_file,
        test_wrong_http_method,
        test_missing_file_field,
        test_invalid_iq_dtype,
        test_cors_preflight,
        test_cors_post,
        test_response_schema,
    ]

    passed = 0
    failed = 0
    errors = []

    print("\n" + "=" * 60)
    print("SIGNALENS AI — Integration Tests")
    print("=" * 60)

    for test_fn in tests:
        name = test_fn.__name__
        try:
            test_fn()
            passed += 1
        except Exception as e:
            failed += 1
            errors.append((name, str(e)))
            print(f"  ❌ {name}: {e}")

    print("\n" + "-" * 60)
    print(f"Results: {passed} passed, {failed} failed, {len(tests)} total")

    if errors:
        print("\nFailed tests:")
        for name, err in errors:
            print(f"  - {name}: {err}")

    print("=" * 60)

    sys.exit(1 if failed > 0 else 0)
