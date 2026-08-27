"""
SignalLens AI — Signal Processing & Analysis Package
=====================================================

Automated analysis of .IQ and .WAV signal files.
SIH26147 — Smart India Hackathon 2026

Modules:
    loaders        — File loading (WAV, IQ/raw binary)
    preprocessing  — Signal preprocessing (mono mix, DC removal)
    features       — Time-domain, spectral, and IQ feature extraction
    analysis       — Orchestrated analysis pipeline
    classifier     — ML-based signal classification
"""

__version__ = "0.1.0"

from signalens.loaders import load_wav, load_iq, load_signal
from signalens.preprocessing import preprocess_signal
from signalens.features import (
    calculate_time_features,
    calculate_fft,
    calculate_psd,
    calculate_spectrogram,
    calculate_iq_metrics,
    extract_features,
)
from signalens.analysis import analyze_file, analyze_signal
from signalens.classifier import predict_signal

__all__ = [
    "load_wav",
    "load_iq",
    "load_signal",
    "preprocess_signal",
    "calculate_time_features",
    "calculate_fft",
    "calculate_psd",
    "calculate_spectrogram",
    "calculate_iq_metrics",
    "extract_features",
    "analyze_file",
    "analyze_signal",
    "predict_signal",
]
