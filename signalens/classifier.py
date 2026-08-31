"""
SignalLens AI — ML Classifier (Lightweight)
=============================================

Pure-NumPy RandomForest prediction — no scikit-learn, scipy, or joblib
required at runtime.

The trained model is stored in signalens_model.npz (compressed NumPy arrays).
The original sklearn .joblib files are retained for training/development only.

Prediction is equivalent to sklearn RandomForestClassifier.predict_proba()
for the same model parameters.
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


# ─── Lightweight Model State ──────────────────────────────────────────

class RandomForestModel:
    """
    Lightweight RandomForest inference engine.

    Stores the trained tree structure as NumPy arrays and performs
    prediction by traversing each tree from root to leaf, then
    averaging class probabilities across all trees.
    """

    def __init__(
        self,
        classes: np.ndarray,
        n_trees: int,
        node_counts: np.ndarray,
        features: np.ndarray,
        thresholds: np.ndarray,
        children_left: np.ndarray,
        children_right: np.ndarray,
        values: np.ndarray,
    ):
        self.classes = classes
        self.n_trees = n_trees
        self.node_counts = node_counts
        self.features = features
        self.thresholds = thresholds
        self.children_left = children_left
        self.children_right = children_right
        self.values = values

    def predict_proba_single(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class probabilities for a single feature vector.

        Args:
            X: 1-D array of shape (n_features,) — already scaled.

        Returns:
            1-D array of shape (n_classes,) with class probabilities.
        """
        all_votes = np.zeros(len(self.classes), dtype=np.float64)

        for i in range(self.n_trees):
            node = 0
            # Traverse tree until leaf (children_left == -1)
            while self.children_left[i, node] != -1:
                feat = self.features[i, node]
                thr = self.thresholds[i, node]
                if X[feat] <= thr:
                    node = self.children_left[i, node]
                else:
                    node = self.children_right[i, node]
            all_votes += self.values[i, node, :]

        # Normalize to probabilities
        total = all_votes.sum()
        if total > 0:
            return all_votes / total
        return np.ones(len(self.classes)) / len(self.classes)

    def predict_single(self, X: np.ndarray) -> tuple[str, float]:
        """
        Predict class and confidence for a single feature vector.

        Returns:
            (predicted_class, confidence)
        """
        proba = self.predict_proba_single(X)
        idx = int(np.argmax(proba))
        return str(self.classes[idx]), float(proba[idx])


class StandardScalerNP:
    """
    Lightweight StandardScaler — pure NumPy.
    """

    def __init__(self, mean: np.ndarray, scale: np.ndarray):
        self.mean_ = mean
        self.scale_ = scale

    def transform(self, X: np.ndarray) -> np.ndarray:
        """Standardize features by removing the mean and scaling to unit variance."""
        return (X - self.mean_) / self.scale_


# ─── Model Loading ─────────────────────────────────────────────────────

_rf_model: RandomForestModel | None = None
_scaler: StandardScalerNP | None = None


def load_model(
    model_path: str | Path = "signalens_model.npz",
    scaler_path: str | Path | None = None,
) -> tuple[RandomForestModel, StandardScalerNP]:
    """
    Load the lightweight model and scaler from an NPZ file.

    The NPZ file contains all model parameters and scaler statistics
    in a single compressed archive.

    Args:
        model_path: Path to signalens_model.npz
        scaler_path: Ignored (scaler is inside the NPZ).

    Returns:
        (model, scaler) tuple.
    """
    data = np.load(str(model_path), allow_pickle=True)

    model = RandomForestModel(
        classes=data["classes"],
        n_trees=int(data["n_trees"]),
        node_counts=data["node_counts"],
        features=data["features"],
        thresholds=data["thresholds"],
        children_left=data["children_left"],
        children_right=data["children_right"],
        values=data["values"],
    )

    scaler = StandardScalerNP(
        mean=data["scaler_mean"],
        scale=data["scaler_scale"],
    )

    return model, scaler


# ─── Inference ──────────────────────────────────────────────────────────

def predict_signal(
    signal: np.ndarray,
    sample_rate: float,
    model: RandomForestModel | None = None,
    scaler: StandardScalerNP | None = None,
    model_path: str | Path | None = None,
    scaler_path: str | Path | None = None,
) -> tuple[str, dict[str, float]]:
    """
    Classify a signal using the lightweight RandomForest model.

    Args:
        signal: Preprocessed signal array.
        sample_rate: Sampling rate in Hz.
        model: Pre-loaded model. If None, loads from model_path.
        scaler: Pre-loaded scaler. If None, loads from model_path.
        model_path: Path to saved NPZ model file.
        scaler_path: Ignored (kept for backward compatibility).

    Returns:
        (predicted_class, {class: probability, ...})

    Raises:
        RuntimeError: If no model is available.
    """
    # Load model if not provided
    if model is None or scaler is None:
        if model_path is None:
            raise RuntimeError(
                "No model provided. Pass model/scaler or set model_path."
            )
        model, scaler = load_model(model_path)

    # Extract features
    feat = extract_ml_features(signal, sample_rate)
    feat_scaled = scaler.transform(feat.reshape(1, -1))[0]

    # Predict
    pred_class, confidence = model.predict_single(feat_scaled)
    proba = model.predict_proba_single(feat_scaled)

    return pred_class, dict(zip(model.classes.tolist(), proba.tolist()))


# ─── Training (for development only — requires scikit-learn) ───────────
# The functions below are retained for retraining purposes.
# They are NOT used in the deployed Vercel function.
# The .joblib files are NOT included in the Vercel bundle.

def _generate_bpsk(
    n_symbols: int = 512,
    sps: int = 8,
    fs: float = 1_000_000.0,
    snr_db: float = 15.0,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """Generate a synthetic BPSK signal."""
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
    """Generate a synthetic QPSK signal."""
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
    """Generate a synthetic 16-QAM signal."""
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


def _make_sine(
    t: np.ndarray,
    freq: float = 1000.0,
    amp: float = 0.7,
    noise: float = 0.0,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """Generate a sine signal with optional noise."""
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
    """Generate an AM signal."""
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
    """Generate an FM signal."""
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
    """Generate a PM signal."""
    return amp * np.sin(
        2 * np.pi * fc * t + phase_dev * np.sin(2 * np.pi * fm * t)
    )


def _make_multi_tone(t: np.ndarray, amp: float = 1.0) -> np.ndarray:
    """Generate a multi-frequency signal."""
    return amp * (
        0.40 * np.sin(2 * np.pi * 800 * t)
        + 0.35 * np.sin(2 * np.pi * 1800 * t)
        + 0.25 * np.sin(2 * np.pi * 3200 * t)
    )


def generate_synthetic_dataset(
    n_per_class: int = 100,
    fs: float = 48_000.0,
    duration: float = 1.0,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate a synthetic training dataset with 6 signal classes.
    """
    rng = np.random.default_rng(seed)
    t = np.arange(0, duration, 1.0 / fs)

    generators = {
        "sine": lambda: _make_sine(
            t, freq=rng.uniform(800, 1200), amp=rng.uniform(0.5, 0.9),
        ),
        "noisy_sine": lambda: _make_sine(
            t, freq=rng.uniform(800, 1200), amp=0.7,
            noise=rng.uniform(0.10, 0.25), rng=rng,
        ),
        "am": lambda: _make_am(
            t, fc=rng.uniform(4000, 6000), fm=rng.uniform(150, 300),
            depth=rng.uniform(0.3, 0.7),
        ),
        "fm": lambda: _make_fm(
            t, fc=rng.uniform(4000, 6000), fm=rng.uniform(100, 250),
            deviation=rng.uniform(400, 900),
        ),
        "pm": lambda: _make_pm(
            t, fc=rng.uniform(3000, 5000), fm=rng.uniform(80, 200),
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

    REQUIRES scikit-learn (development only).
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


def save_model(
    model: Any,
    scaler: Any,
    model_path: str | Path = "signalens_model.npz",
    scaler_path: str | Path | None = None,
) -> None:
    """
    Save trained model to lightweight NPZ format.

    The NPZ contains all tree parameters and scaler statistics
    in a single file — no scikit-learn or joblib needed at inference time.
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler

    if not isinstance(model, RandomForestClassifier):
        raise TypeError(f"Expected RandomForestClassifier, got {type(model)}")
    if not isinstance(scaler, StandardScaler):
        raise TypeError(f"Expected StandardScaler, got {type(scaler)}")

    classes = model.classes_
    n_trees = model.n_estimators
    n_classes = len(classes)

    node_counts = np.array([est.tree_.node_count for est in model.estimators_], dtype=np.int32)
    max_nodes = int(node_counts.max())

    features = np.full((n_trees, max_nodes), -1, dtype=np.int32)
    thresholds = np.full((n_trees, max_nodes), 0.0, dtype=np.float64)
    children_left = np.full((n_trees, max_nodes), -1, dtype=np.int32)
    children_right = np.full((n_trees, max_nodes), -1, dtype=np.int32)
    values = np.zeros((n_trees, max_nodes, n_classes), dtype=np.float64)

    for i, est in enumerate(model.estimators_):
        t = est.tree_
        n = t.node_count
        features[i, :n] = t.feature
        thresholds[i, :n] = t.threshold
        children_left[i, :n] = t.children_left
        children_right[i, :n] = t.children_right
        values[i, :n, :] = t.value[:, 0, :]

    np.savez_compressed(
        str(model_path),
        classes=classes,
        n_trees=np.array(n_trees),
        node_counts=node_counts,
        features=features,
        thresholds=thresholds,
        children_left=children_left,
        children_right=children_right,
        values=values,
        scaler_mean=scaler.mean_,
        scaler_scale=scaler.scale_,
    )


# ─── Backward-compatible aliases ────────────────────────────────────────
# These exist so that train_model.py and tests can still reference them.
save_model_joblib = None  # deprecated
