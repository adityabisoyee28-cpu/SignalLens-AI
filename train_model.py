#!/usr/bin/env python3
"""
SignalLens AI — Model Pre-Training Script
==========================================

Run this script to train and save the ML model + scaler to disk:

    python train_model.py

Outputs:
    signalens_model.joblib  — trained RandomForestClassifier
    signalens_scaler.joblib  — fitted StandardScaler

These files are loaded at API startup instead of retraining on every cold start.
"""

from __future__ import annotations

from signalens.classifier import generate_synthetic_dataset, save_model, train_model


def main():
    print("Generating synthetic training dataset...")
    X, y = generate_synthetic_dataset(n_per_class=100, seed=42)
    print(f"  Dataset: {X.shape[0]} samples, {X.shape[1]} features, {len(set(y))} classes")

    print("Training Random Forest classifier...")
    result = train_model(X, y)
    print(f"  Accuracy: {result['accuracy'] * 100:.1f}%")
    print(f"  Classes: {list(result['classes'])}")

    save_model(result["model"], result["scaler"])
    print("Saved: signalens_model.joblib, signalens_scaler.joblib")


if __name__ == "__main__":
    main()
