"""
SignalLens AI — Signal Preprocessing
======================================

Standardizes loaded signals for downstream analysis:
  - WAV: multi-channel → mono mixdown, cast to float64
  - IQ: cast to complex128
  - DC removal (subtract mean)

Preserves the validated logic from Colab Cell 8.
"""

from __future__ import annotations

import numpy as np


def preprocess_signal(
    signal: np.ndarray,
    signal_type: str,
) -> np.ndarray:
    """
    Preprocess a loaded signal for analysis.

    Args:
        signal: Raw loaded signal. For WAV: float64, shape (samples,) or (samples, channels).
                For IQ: complex128, shape (samples,).
        signal_type: "wav" or "iq".

    Returns:
        Preprocessed 1-D signal with DC removed.
        WAV → float64 real.
        IQ  → complex128.

    Raises:
        ValueError: If signal_type is not "wav" or "iq".
    """
    if signal_type == "wav":
        sig = signal
        # Multi-channel → mono mix-down
        if sig.ndim == 2 and sig.shape[1] > 1:
            sig = np.mean(sig, axis=1)
        else:
            sig = sig.flatten()
        sig = sig.astype(np.float64)
    elif signal_type == "iq":
        sig = signal.astype(np.complex128)
    else:
        raise ValueError(
            f"Unknown signal_type: {signal_type!r}. Expected 'wav' or 'iq'."
        )

    # DC removal — subtract the mean
    sig = sig - np.mean(sig)

    return sig
