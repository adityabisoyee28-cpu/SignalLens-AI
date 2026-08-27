"""
SignalLens AI — ML Classifier
================================

Machine learning module for signal classification.

  - Synthetic signal generation for training
  - Feature extraction for ML pipeline
  - Model training and evaluation
  - Inference/prediction on new signals

The classifier is a research demonstration trained on synthetic data.
Real off-air accuracy will differ from synthetic benchmarks.

Preserves the validated logic from Colab Cells 20, 51–57.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from signalens.features import extract_ml_features, ML_FEATURE_NAMES


# ─── Class Labels ──────────────────────────────────────────────────────

CLASS_LABELS = ["BPSK", "QPSK", "QAM16"]

SYNTHETIC_LABELS = [
    "sine", "noisy_sine", "am", "fm", "pm", "multi_tone"
]


# ─── Synthetic Signal Generators ───────────────────────────────────────

def _generate_bpsk(
    n_symbols: int = 512,
    sps: int = 8,
    fs: float = 1_000_000.0,
    snr_db: float = 15.0,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """Generate a synthetic BPSK signal. Matches Colab Cell 20."""
    if rng is None:
        rng = np.random.default_rng()
    symbols = rng.choice([-1, 1], size=n_symbols)
    base = np.repeat(symbols, sps)
    noise_power = 10 ** (-snr_db / 10)
    noise = (
        rng.normal(size=len(base)) + 1j * rng.normal(size=len(base))
    ) * np.sqrt(noise_power / 2)
    return base + noise


def _generate_qpsk(
    n_symbols: int = 512,
    sps: int = 8,
    fs: float = 1_000_000.0,
    snr_db: float = 15.0,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """Generate a synthetic QPSK signal. Matches Colab Cell 20."""
    if rng is None:
        rng = np.random.default_rng()
    symbols = rng.choice(
        [-1 - 1j, -1 + 1j, 1 - 1j, 1 + 1j], size=n_symbols
    ) / np.sqrt(2)
    base = np.repeat(symbols, sps)
    noise_power = 10 ** (-snr_db / 10)
    noise = (
        rng.normal(size=len(base)) + 1j * rng.normal(size=len(base))
    ) * np.sqrt(noise_power / 2)
    return base + noise


def _generate_qam16(
    n_symbols: int = 512,
    sps: int = 8,
    fs: float = 1_000_000.0,
    snr_db: float = 15.0,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """Generate a synthetic 16-QAM signal. Matches Colab Cell 20."""
    if rng is None:
        rng = np.random.default_rng()
    levels = np.array([-3, -1, 1, 3])
    symbols = (
        rng.choice(levels, n_symbols) + 1j * rng.choice(levels, n_symbols)
    )
    symbols /= np.sqrt(np.mean(np.abs(symbols) ** 2))
    base = np.repeat(symbols, sps)
    noise_power = 10 ** (-snr_db / 10)
    noise = (
        rng.normal(size=len(base)) + 1j * rng.normal(size=len(base))
    ) * np.sqrt(noise_power / 2)
    return base + noise


# ─── Synthetic Dataset Generators (for extended training) ──────────────

def _make_sine(
    t: np.ndarray,
    freq: float = 1000.0,
    amp: float = 0.7,
    noise: float = 0.0,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """Generate a sine signal with optional noise. Matches Colab Cell 51."""
    sig = amp * np.sin(2 * np.pi * freq * t)
    if noise > 0:
        if rng is None:
            rng = np.random.default_rng()
        sig = sig + noise * rng.standard_normal(len(t))
    return sig


def _make_am(
    t: np.ndarray,
    fc: float = 5000.0,
    fm: float = 200.0,
    depth: float = 0.5,
    amp: float = 0.6,
) -> np.ndarray:
    """Generate an AM signal. Matches Colab Cell 51."""
    return amp * (1 + depth * np.sin(2 * np.pi * fm * t)) * np.sin(
        2 * np.pi * fc * t
    )


def _make_fm(
    t: np.ndarray,
    fc: float = 5000.0,
    fm: float = 150.0,
    deviation: float = 600.0,
    amp: float = 0.6,
) -> np.ndarray:
    """Generate an FM signal. Matches Colab Cell 51."""
    return amp * np.sin(
        2 * np.pi * fc * t + (deviation / fm) * np.sin(2 * np.pi * fm * t)
    )


def _make_pm(
    t: np.ndarray,
    fc: float = 4000.0,
    fm: float = 120.0,
    phase_dev: float = 1.0,
    amp: float = 0.6,
) -> np.ndarray:
    """Generate a PM signal. Matches Colab Cell 51."""
    return amp * np.sin(
        2 * np.pi * fc * t + phase_dev * np.sin(2 * np.pi * fm * t)
    )


def _make_multi_tone(t: np.ndarray, amp: float = 1.0) -> np.ndarray:
    """Generate a multi-frequency signal. Matches Colab Cell 51."""
    return amp * (
        0.40 * np.sin(2 * np.pi * 800 * t)
        + 0.35 * np.sin(2 * np.pi * 1800 * t)
        + 0.25 * np.sin(2 * np.pi * 3200 * t)
    )


# ─── Training ──────────────────────────────────────────────────────────

def generate_synthetic_dataset(
    n_per_class: int = 100,
    fs: float = 48_000.0,
    duration: float = 1.0,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate a synthetic training dataset with 6 signal classes.

    Preserves the validated logic from Colab Cell 51.

    Returns:
        (X, y) — feature matrix and labels.
    """
    rng = np.random.default_rng(seed)
    t = np.arange(0, duration, 1.0 / fs)

    generators = {
        "sine": lambda: _make_sine(
            t,
            freq=rng.uniform(800, 1200),
            amp=rng.uniform(0.5, 0.9),
        ),
        "noisy_sine": lambda: _make_sine(
            t,
            freq=rng.uniform(800, 1200),
            amp=0.7,
            noise=rng.uniform(0.10, 0.25),
            rng=rng,
        ),
        "am": lambda: _make_am(
            t,
            fc=rng.uniform(4000, 6000),
            fm=rng.uniform(150, 300),
            depth=rng.uniform(0.3, 0.7),
        ),
        "fm": lambda: _make_fm(
            t,
            fc=rng.uniform(4000, 6000),
            fm=rng.uniform(100, 250),
            deviation=rng.uniform(400, 900),
        ),
        "pm": lambda: _make_pm(
            t,
            fc=rng.uniform(3000, 5000),
            fm=rng.uniform(80, 200),
            phase_dev=rng.uniform(0.6, 1.5),
        ),
        "multi_tone": lambda: _make_multi_tone(t, amp=rng.uniform(0.8, 1.1)),
    }

    X_signals: list[np.ndarray] = []
    y_labels: list[str] = []

    for label, gen in generators.items():
        for _ in range(n_per_class):
            sig = gen()
            sig = sig - np.mean(sig)
            X_signals.append(sig)
            y_labels.append(label)

    X = np.vstack([extract_ml_features(s, fs) for s in X_signals])
    y = np.array(y_labels)

    return X, y


def train_model(
    X: np.ndarray,
    y: np.ndarray,
    test_size: float = 0.25,
    random_state: int = 42,
) -> dict[str, Any]:
    """
    Train a Random Forest classifier on extracted features.

    Preserves the validated logic from Colab Cells 53–54.

    Returns:
        Dict with keys: model, scaler, X_test, y_test, accuracy, classes.
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    clf = RandomForestClassifier(n_estimators=150, random_state=random_state)
    clf.fit(X_train_s, y_train)

    y_pred = clf.predict(X_test_s)
    from sklearn.metrics import accuracy_score
    acc = float(accuracy_score(y_test, y_pred))

    return {
        "model": clf,
        "scaler": scaler,
        "X_test": X_test_s,
        "y_test": y_test,
        "accuracy": acc,
        "classes": clf.classes_,
    }


# ─── Model Persistence ─────────────────────────────────────────────────

def save_model(
    model: Any,
    scaler: Any,
    model_path: str | Path = "signalens_model.joblib",
    scaler_path: str | Path = "signalens_scaler.joblib",
) -> None:
    """Save trained model and scaler to disk. Matches Colab Cell 56."""
    import joblib

    joblib.dump(model, str(model_path))
    joblib.dump(scaler, str(scaler_path))


def load_model(
    model_path: str | Path = "signalens_model.joblib",
    scaler_path: str | Path = "signalens_scaler.joblib",
) -> tuple[Any, Any]:
    """Load trained model and scaler from disk."""
    import joblib

    model = joblib.load(str(model_path))
    scaler = joblib.load(str(scaler_path))
    return model, scaler


# ─── Inference ──────────────────────────────────────────────────────────

def predict_signal(
    signal: np.ndarray,
    sample_rate: float,
    model: Any = None,
    scaler: Any = None,
    model_path: str | Path | None = None,
    scaler_path: str | Path | None = None,
) -> tuple[str, dict[str, float]]:
    """
    Classify a signal using the trained ML model.

    Preserves the validated logic from Colab Cells 21 and 57.

    Args:
        signal: Preprocessed signal array.
        sample_rate: Sampling rate in Hz.
        model: Pre-loaded sklearn model. If None, loads from model_path.
        scaler: Pre-loaded StandardScaler. If None, loads from scaler_path.
        model_path: Path to saved model file.
        scaler_path: Path to saved scaler file.

    Returns:
        (predicted_class, {class: probability, ...})

    Raises:
        RuntimeError: If no model is available.
    """
    # Load model if not provided
    if model is None or scaler is None:
        if model_path is None or scaler_path is None:
            raise RuntimeError(
                "No model provided. Pass model/scaler or set model_path/scaler_path."
            )
        model, scaler = load_model(model_path, scaler_path)

    # Extract features
    feat = extract_ml_features(signal, sample_rate).reshape(1, -1)
    feat_s = scaler.transform(feat)

    # Predict
    pred = model.predict(feat_s)[0]
    proba = model.predict_proba(feat_s)[0]

    return pred, dict(zip(model.classes_, proba))
