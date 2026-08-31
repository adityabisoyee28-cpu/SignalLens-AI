"""
SignalLens AI — Feature Extraction
====================================

Functions for computing signal features from preprocessed signals.

  Time-domain:   calculate_time_features()
  FFT:           calculate_fft()
  PSD:           calculate_psd()
  Spectrogram:   calculate_spectrogram()
  IQ-specific:   calculate_iq_metrics()
  Combined:      extract_features()

All scientific logic preserved from validated Colab prototype.
Scipy dependencies removed — uses NumPy only.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from numpy.fft import fft, fftfreq, fftshift


# ─── Configuration defaults (matching Colab CONFIG) ────────────────────

DEFAULT_NPERSEG_PSD: int = 1024
DEFAULT_NPERSEG_SPEC: int = 256
DEFAULT_NOVERLAP_SPEC: int = 128


# ─── Welch PSD (pure NumPy) ───────────────────────────────────────────

def _welch_psd(
    signal: np.ndarray,
    fs: float,
    nperseg: int,
    scaling: str = "density",
    return_onesided: bool = True,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Compute Power Spectral Density using Welch's method (pure NumPy).

    Splits the signal into overlapping segments, windows each segment,
    computes the periodogram, and averages.
    """
    x = np.asarray(signal)
    # Handle complex signals: use magnitude for PSD
    is_complex = np.iscomplexobj(x)
    if is_complex:
        x = np.abs(x).astype(np.float64)
    else:
        x = x.astype(np.float64)
    if x.ndim > 1:
        x = x[:, 0] if x.shape[1] == 1 else np.mean(x, axis=1)

    n = len(x)
    noverlap = nperseg // 2
    step = nperseg - noverlap

    # Hann window (periodic)
    window = np.hanning(nperseg + 1)[:-1]

    # Scale factor
    if scaling == "density":
        scale = fs * np.sum(window ** 2)
    else:
        scale = np.sum(window ** 2)

    nperseg_actual = min(nperseg, n)

    # Build segments
    segments = []
    for start in range(0, n - nperseg_actual + 1, step):
        seg = x[start : start + nperseg_actual].copy()
        seg *= window[:nperseg_actual]
        segments.append(seg)

    if not segments:
        # Fallback: use entire signal
        seg = x.copy()
        seg *= window[: len(seg)]
        segments.append(seg)

    # Compute periodograms and average
    fft_size = nperseg_actual
    n_freqs = fft_size // 2 + 1  # always onesided for magnitude PSD

    psd_sum = np.zeros(n_freqs, dtype=np.float64)

    for seg in segments:
        spectrum = fft(seg, n=fft_size)
        spectrum = spectrum[:n_freqs]
        periodogram = np.abs(spectrum) ** 2
        psd_sum += periodogram

    psd_avg = psd_sum / (len(segments) * scale)
    freqs = np.arange(n_freqs) * fs / fft_size

    return freqs, psd_avg


def _spectrogram(
    signal: np.ndarray,
    fs: float,
    nperseg: int,
    noverlap: int,
    return_onesided: bool = True,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute a spectrogram (pure NumPy).

    Returns (freqs, times, Sxx) where Sxx is in linear power scale.
    """
    x = np.asarray(signal)
    # Handle complex signals: use magnitude for spectrogram
    is_complex = np.iscomplexobj(x)
    if is_complex:
        x = np.abs(x).astype(np.float64)
    else:
        x = x.astype(np.float64)
    if x.ndim > 1:
        x = x[:, 0] if x.shape[1] == 1 else np.mean(x, axis=1)

    n = len(x)
    window = np.hanning(nperseg + 1)[:-1]
    step = nperseg - noverlap

    nperseg_actual = min(nperseg, n)

    # Collect segment FFTs
    specs = []
    times = []
    for start in range(0, n - nperseg_actual + 1, step):
        seg = x[start : start + nperseg_actual].copy()
        seg *= window[:nperseg_actual]
        spectrum = fft(seg, n=nperseg_actual)
        n_freqs = nperseg_actual // 2 + 1
        spectrum = spectrum[:n_freqs]
        specs.append(np.abs(spectrum) ** 2)
        times.append((start + nperseg_actual / 2) / fs)

    if not specs:
        # Fallback
        seg = x.copy()
        seg *= window[: len(seg)]
        spectrum = fft(seg, n=nperseg_actual)
        n_freqs = nperseg_actual // 2 + 1
        spectrum = spectrum[:n_freqs]
        specs.append(np.abs(spectrum) ** 2)
        times.append(nperseg_actual / 2 / fs)

    Sxx = np.column_stack(specs)
    freqs = np.arange(Sxx.shape[0]) * fs / nperseg_actual

    return freqs, np.array(times), Sxx


# ─── Data classes ──────────────────────────────────────────────────────

@dataclass
class FFTResult:
    """Result of FFT computation."""
    frequency: np.ndarray      # Hz
    magnitude: np.ndarray      # linear scale
    magnitude_db: np.ndarray   # dB scale (20*log10)
    is_onesided: bool


@dataclass
class PSDResult:
    """Result of Power Spectral Density computation."""
    frequency: np.ndarray      # Hz
    power: np.ndarray          # V²/Hz
    is_onesided: bool


@dataclass
class SpectrogramResult:
    """Result of spectrogram computation."""
    time: np.ndarray           # seconds
    frequency: np.ndarray      # Hz
    power: np.ndarray          # 2D array (freq × time) in dB
    is_onesided: bool


@dataclass
class TimeFeatures:
    """Time-domain features."""
    sample_rate_hz: float
    n_samples: int
    duration_s: float
    mean: float
    variance: float
    rms: float
    peak: float
    zero_crossing_rate: float
    dominant_frequency_hz: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "sample_rate_Hz": self.sample_rate_hz,
            "n_samples": self.n_samples,
            "duration_s": self.duration_s,
            "mean": self.mean,
            "variance": self.variance,
            "rms": self.rms,
            "peak": self.peak,
            "zero_crossing_rate": self.zero_crossing_rate,
            "dominant_frequency_Hz": self.dominant_frequency_hz,
        }


@dataclass
class IQMetrics:
    """IQ-specific metrics (complex signals only)."""
    i_mean: float
    q_mean: float
    magnitude_rms: float
    magnitude_peak: float
    papr_db: float
    phase_std_rad: float
    inst_freq_mean_hz: float | None
    inst_freq_std_hz: float | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "I_mean": self.i_mean,
            "Q_mean": self.q_mean,
            "magnitude_rms": self.magnitude_rms,
            "magnitude_peak": self.magnitude_peak,
            "PAPR_dB": self.papr_db,
            "phase_std_rad": self.phase_std_rad,
            "inst_freq_mean_Hz": self.inst_freq_mean_hz,
            "inst_freq_std_Hz": self.inst_freq_std_hz,
        }


# ─── Time-Domain Features ─────────────────────────────────────────────

def calculate_time_features(
    signal: np.ndarray,
    sample_rate: float,
) -> TimeFeatures:
    """
    Compute time-domain signal metrics.

    For complex signals, operates on the real part.

    Preserves the validated logic from Colab Cell 9.
    """
    is_complex = np.iscomplexobj(signal)

    if is_complex:
        x_real = np.real(signal).astype(np.float64)
    else:
        x_real = np.asarray(signal, dtype=np.float64)

    n_samples = len(x_real)
    duration = n_samples / sample_rate

    # Dominant frequency via FFT peak (simple, non-parametric)
    window = np.hanning(n_samples)
    spectrum = np.abs(fft(x_real * window))
    freqs = fftfreq(n_samples, 1.0 / sample_rate)
    pos_mask = freqs >= 0
    peak_idx = np.argmax(spectrum[pos_mask])
    dominant_freq = float(freqs[pos_mask][peak_idx])

    return TimeFeatures(
        sample_rate_hz=sample_rate,
        n_samples=n_samples,
        duration_s=float(duration),
        mean=float(np.mean(x_real)),
        variance=float(np.var(x_real)),
        rms=float(np.sqrt(np.mean(x_real ** 2))),
        peak=float(np.max(np.abs(x_real))),
        zero_crossing_rate=float(
            np.mean(np.abs(np.diff(np.sign(x_real)))) / 2
        ),
        dominant_frequency_hz=dominant_freq,
    )


# ─── FFT ───────────────────────────────────────────────────────────────

def calculate_fft(
    signal: np.ndarray,
    sample_rate: float,
) -> FFTResult:
    """
    Compute the FFT magnitude spectrum.

    For real signals (WAV): returns positive frequencies only.
    For complex signals (IQ): returns full (shifted) spectrum.

    Preserves the validated logic from Colab Cells 12–13.
    """
    is_complex = np.iscomplexobj(signal)
    n = len(signal)

    window = np.hanning(n)
    sig_win = signal * window

    spectrum = fft(sig_win)
    freqs = fftfreq(n, 1.0 / sample_rate)
    magnitude = np.abs(spectrum)

    if is_complex:
        freqs_out = fftshift(freqs)
        mag_out = fftshift(magnitude)
        is_onesided = False
    else:
        pos_mask = freqs >= 0
        freqs_out = freqs[pos_mask]
        mag_out = magnitude[pos_mask]
        is_onesided = True

    magnitude_db = 20.0 * np.log10(mag_out + 1e-12)

    return FFTResult(
        frequency=freqs_out,
        magnitude=mag_out,
        magnitude_db=magnitude_db,
        is_onesided=is_onesided,
    )


# ─── Power Spectral Density ───────────────────────────────────────────

def calculate_psd(
    signal: np.ndarray,
    sample_rate: float,
    nperseg: int | None = None,
) -> PSDResult:
    """
    Compute PSD using Welch's method (pure NumPy implementation).

    Preserves the validated logic from Colab Cell 14.
    """
    if nperseg is None:
        nperseg = min(DEFAULT_NPERSEG_PSD, len(signal) // 4)
    else:
        nperseg = min(nperseg, len(signal) // 4)

    nperseg = max(nperseg, 256)  # safety floor

    freqs_psd, psd = _welch_psd(
        signal,
        fs=sample_rate,
        nperseg=nperseg,
        scaling="density",
    )

    return PSDResult(
        frequency=freqs_psd,
        power=psd,
        is_onesided=True,
    )


# ─── Spectrogram ───────────────────────────────────────────────────────

def calculate_spectrogram(
    signal: np.ndarray,
    sample_rate: float,
    nperseg: int | None = None,
    noverlap: int | None = None,
) -> SpectrogramResult:
    """
    Compute a spectrogram (pure NumPy implementation).

    Preserves the validated logic from Colab Cell 16.
    """
    if nperseg is None:
        nperseg = min(DEFAULT_NPERSEG_SPEC, len(signal) // 8)
    else:
        nperseg = min(nperseg, len(signal) // 8)

    nperseg = max(nperseg, 64)  # safety floor

    if noverlap is None:
        noverlap = min(DEFAULT_NOVERLAP_SPEC, nperseg // 2)
    else:
        noverlap = min(noverlap, nperseg // 2)

    f_spec, t_spec, Sxx = _spectrogram(
        signal,
        fs=sample_rate,
        nperseg=nperseg,
        noverlap=noverlap,
    )

    # Convert to dB
    Sxx_db = 10.0 * np.log10(Sxx + 1e-12)

    return SpectrogramResult(
        time=t_spec,
        frequency=f_spec,
        power=Sxx_db,
        is_onesided=True,
    )


# ─── IQ-Specific Metrics ──────────────────────────────────────────────

def calculate_iq_metrics(signal: np.ndarray, sample_rate: float | None = None) -> IQMetrics | None:
    """
    Compute IQ-specific metrics for complex signals.

    Returns None for real-valued signals (WAV).

    Args:
        signal: Preprocessed signal (complex128 for IQ).
        sample_rate: Sampling rate in Hz. Required for instantaneous frequency.
                     Falls back to None (inst_freq returned as-is) if not provided.

    Preserves the validated logic from Colab Cell 10.
    """
    if not np.iscomplexobj(signal):
        return None

    I = np.real(signal)
    Q = np.imag(signal)
    magnitude = np.abs(signal)
    phase = np.angle(signal)

    # Phase unwrapping and instantaneous frequency
    phase_unwrapped = np.unwrap(phase)
    inst_freq_arr = np.diff(phase_unwrapped) / (2 * np.pi)
    if sample_rate is not None and sample_rate > 0:
        inst_freq_arr = inst_freq_arr * sample_rate  # rad/sample → Hz
    inst_freq_mean = float(np.mean(inst_freq_arr)) if len(inst_freq_arr) else None
    inst_freq_std = float(np.std(inst_freq_arr)) if len(inst_freq_arr) else None

    rms_mag = float(np.sqrt(np.mean(magnitude ** 2)))
    peak_mag = float(np.max(magnitude))
    papr_db = float(10 * np.log10((peak_mag ** 2) / (rms_mag ** 2 + 1e-20)))

    return IQMetrics(
        i_mean=float(np.mean(I)),
        q_mean=float(np.mean(Q)),
        magnitude_rms=rms_mag,
        magnitude_peak=peak_mag,
        papr_db=papr_db,
        phase_std_rad=float(np.std(phase)),
        inst_freq_mean_hz=inst_freq_mean,
        inst_freq_std_hz=inst_freq_std,
    )


# ─── Combined Feature Vector ───────────────────────────────────────────

def extract_features(
    signal: np.ndarray,
    sample_rate: float,
) -> dict[str, float]:
    """
    Extract a combined feature dictionary from a preprocessed signal.

    Includes time-domain metrics, IQ metrics (if complex), and spectral
    features (spectral centroid, 3-dB bandwidth).

    Preserves the validated logic from Colab Cells 19 and 52.
    """
    # Time-domain features
    td = calculate_time_features(signal, sample_rate)
    features = td.to_dict()

    # IQ-specific metrics (if applicable)
    iq = calculate_iq_metrics(signal, sample_rate=sample_rate)
    if iq is not None:
        features.update(iq.to_dict())

    # Spectral features from PSD
    psd_result = calculate_psd(signal, sample_rate)

    # Spectral centroid
    freqs_psd = psd_result.frequency
    psd = psd_result.power
    features["spectral_centroid_Hz"] = float(
        np.sum(freqs_psd * psd) / (np.sum(psd) + 1e-20)
    )

    # 3-dB bandwidth
    max_psd = np.max(psd)
    half_max = max_psd / 2
    above_half = np.where(psd >= half_max)[0]
    if len(above_half) > 1:
        features["bandwidth_3dB_Hz"] = float(
            freqs_psd[above_half[-1]] - freqs_psd[above_half[0]]
        )
    else:
        features["bandwidth_3dB_Hz"] = 0.0

    return features


def extract_ml_features(
    signal: np.ndarray,
    sample_rate: float,
) -> np.ndarray:
    """
    Extract the ML feature vector (11 features) used by the classifier.

    This matches the extract_simple_features / extract_features function
    from Colab Cells 20 and 52.

    Returns:
        1-D numpy array of 11 features.
    """
    sig = signal - np.mean(signal)
    n = len(sig)

    is_complex = np.iscomplexobj(sig)
    x = sig.astype(np.complex128) if is_complex else sig.astype(np.float64)

    rms = float(np.sqrt(np.mean(np.abs(x) ** 2)))
    peak = float(np.max(np.abs(x)))
    zcr = float(np.mean(np.abs(np.diff(np.sign(np.real(x)))))) / 2
    std = float(np.std(x))
    abs_mean = float(np.mean(np.abs(x)))

    # Spectral features from FFT
    window = np.hanning(n)
    spec = np.abs(fft(np.real(x) * window if not is_complex else x * window))
    freqs = fftfreq(n, 1.0 / sample_rate)
    pos_mask = freqs >= 0
    mag = spec[pos_mask]
    fpos = freqs[pos_mask]

    dominant = float(fpos[np.argmax(mag)])
    spectral_centroid = float(
        np.sum(fpos * mag) / (np.sum(mag) + 1e-12)
    )

    half = mag.max() / 2
    above = np.where(mag >= half)[0]
    bandwidth = float(fpos[above[-1]] - fpos[above[0]]) if len(above) > 1 else 0.0

    top3_idx = np.argsort(mag)[-3:][::-1]
    top3 = fpos[top3_idx]

    return np.array([
        rms, peak, zcr, dominant, spectral_centroid,
        bandwidth, top3[0], top3[1], top3[2], std, abs_mean
    ], dtype=np.float64)


ML_FEATURE_NAMES = [
    "rms", "peak", "zcr", "dominant_freq", "spectral_centroid",
    "bandwidth", "peak1", "peak2", "peak3", "std", "abs_mean"
]
