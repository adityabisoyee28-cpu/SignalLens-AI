# SignalLens AI

**Automated Analysis of .IQ and .WAV Signal Files**

SIH26147 — Smart India Hackathon 2026

---

## Problem

Intelligence agencies and spectrum monitoring teams collect vast quantities of raw signal captures (.WAV audio recordings and .IQ raw IQ samples from SDRs). Manually analyzing these files to identify modulation types, anomalies, and signal characteristics is slow, inconsistent, and requires specialized expertise.

## Solution

SignalLens AI automates signal analysis end-to-end: upload a file, and the system extracts time-domain metrics, spectral features, runs ML classification, and returns a structured analysis — all through a clean web interface.

## Key Capabilities

- **Multi-format support** — WAV (standard PCM) and IQ (RTL-SDR uint8 interleaved, complex64)
- **Full DSP pipeline** — time-domain, FFT, PSD, spectrogram, IQ constellation
- **ML classification** — RandomForest trained on 6 signal types (sine, noisy sine, AM, FM, PM, multi-tone)
- **Structured output** — JSON API with all computed features, predictions, and visualization data
- **Dashboard** — real-time waveform, FFT, PSD, spectrogram, and constellation plots
- **Supabase integration** — file storage, database persistence, and row-level security

---

## Architecture

```
User → Frontend (React/Vite)
           ↓
       POST /analyze (multipart file upload)
           ↓
       FastAPI Backend
           ↓
       Signal Engine (signalens/)
           ├── Load (WAV / IQ)
           ├── Preprocess (mono mix, DC removal)
           ├── Time-domain features
           ├── FFT
           ├── PSD (Welch)
           ├── Spectrogram
           ├── IQ metrics (if complex)
           └── Feature extraction
           ↓
       ML Classifier (RandomForest)
           ↓
       Supabase Storage + Database (optional)
           ↓
       JSON Response → Dashboard Display
```

---

## DSP Capabilities

| Analysis | Method | Output |
|---|---|---|
| **Time Domain** | RMS, peak, ZCR, dominant frequency via FFT peak | Scalar metrics |
| **FFT** | Hanning window, full/onesided spectrum | Frequency vs magnitude (dB) |
| **PSD** | Welch's method, density scaling | Frequency vs power (V²/Hz) |
| **Spectrogram** | scipy.signal.spectrogram, dB conversion | 2D time-frequency heatmap |
| **IQ Analysis** | I/Q separation, phase unwrap, instantaneous frequency, PAPR | IQ-specific metrics + constellation |
| **Feature Extraction** | 11-dimensional ML feature vector + spectral centroid + 3dB bandwidth | Dictionary |

---

## ML Classification

The classifier is a **RandomForestClassifier** (150 estimators) trained on synthetic signals:

| Class | Description |
|---|---|
| `sine` | Clean sine wave |
| `noisy_sine` | Sine with additive noise |
| `am` | Amplitude modulation |
| `fm` | Frequency modulation |
| `pm` | Phase modulation |
| `multi_tone` | Multi-frequency composite |

> **Note:** This is a research demonstration trained on synthetic data. Real off-air accuracy will differ from synthetic benchmarks.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Recharts, Framer Motion |
| **UI Components** | Radix UI, shadcn/ui primitives, Lucide icons |
| **Backend API** | FastAPI (Python 3.10+), Uvicorn |
| **Signal Engine** | NumPy, SciPy, soundfile |
| **ML** | scikit-learn (RandomForest, StandardScaler) |
| **Database** | Supabase (PostgreSQL, Row-Level Security) |
| **Storage** | Supabase Storage (`signal-files` bucket) |

---

## Project Structure

```
SignalLens-AI/
├── src/                          # Frontend (TypeScript/React)
│   ├── components/
│   │   ├── dashboard/            # Analysis panels
│   │   ├── layout/               # Header, Footer, Layout
│   │   ├── ui/                   # shadcn/ui components
│   │   └── visualizations/       # Chart components (Recharts)
│   ├── pages/                    # Landing, Upload, Dashboard
│   ├── lib/                      # API client, utils, mock data
│   ├── types/                    # TypeScript type definitions
│   ├── App.tsx                   # Router + auth
│   └── main.tsx                  # Entry point
├── api/                          # FastAPI backend
│   ├── main.py                   # App, routes, response builder
│   ├── schemas.py                # Pydantic models
│   └── database.py               # Supabase client + CRUD
├── signalens/                    # Python signal-processing engine
│   ├── loaders.py                # WAV/IQ file loading
│   ├── preprocessing.py          # Mono mix, DC removal
│   ├── features.py               # Time, FFT, PSD, spectrogram, IQ
│   ├── analysis.py               # Full analysis pipeline
│   └── classifier.py             # ML training + inference
├── supabase/                     # Database migrations
│   ├── schema.sql                # Tables, indexes, RLS policies
│   └── storage.sql               # Storage bucket + policies
├── tests/                        # Integration tests
│   └── test_api.py               # Backend API validation
├── .gitignore
├── .env.example
├── requirements.txt
├── package.json
├── vite.config.ts
└── README.md
```

---

## Installation

### Prerequisites

- **Node.js** ≥ 18 and **Bun** ≥ 1.0
- **Python** ≥ 3.10
- (Optional) **Supabase** account for database/storage

### Frontend

```bash
# Install dependencies
bun install

# Start dev server (http://localhost:5173)
bun run dev

# Build for production
bun run build
```

### Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server (http://localhost:8000)
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Or:
python -m api.main
```

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Frontend — backend URL
VITE_API_BASE_URL=http://localhost:8000

# Backend (server-only, never exposed to frontend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Usage

### 1. Upload a Signal File

Navigate to the **Upload** page and drag-and-drop (or click to browse) a `.wav` or `.iq` file.

### 2. Analysis

The backend automatically:
1. Validates the file extension and size
2. Loads the signal (WAV via soundfile, IQ via numpy)
3. Runs the full DSP pipeline
4. Extracts 11 ML features + spectral features
5. Runs ML classification (if model is trained)
6. Returns structured JSON

### 3. Dashboard

Results display on the dashboard:
- **Metrics** — Duration, sample rate, RMS, peak, dominant frequency, bandwidth
- **Waveform** — Time-domain plot (I/Q for complex signals)
- **FFT** — Magnitude spectrum in dB
- **PSD** — Power spectral density via Welch's method
- **Spectrogram** — Time-frequency heatmap
- **Constellation** — I/Q scatter plot (IQ files only)
- **AI Analysis** — Classification, confidence, anomaly score, characteristics
- **Report** — Downloadable text report

---

## API Documentation

### Base URL

```
http://localhost:8000
```

Interactive docs: `http://localhost:8000/docs` (Swagger UI)

---

### `GET /health`

Returns server status.

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "engine": "signalens"
}
```

---

### `POST /analyze`

Full signal analysis pipeline.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Signal file (.wav, .iq, .raw, .bin, .dat) |
| `sample_rate` | float | No | Override sample rate in Hz (required for most IQ files) |
| `iq_dtype` | string | No | IQ format: `"float32"` (default) or `"complex64"` |

**Response:**
```json
{
  "file": {
    "id": "sig-12345-1700000000",
    "name": "capture.wav",
    "format": "WAV",
    "size": 960000,
    "uploadedAt": "2026-08-27T12:00:00+00:00",
    "status": "complete"
  },
  "metrics": {
    "duration": 2.0,
    "sampleRate": 48000,
    "rms": 0.7071,
    "peak": 1.0,
    "dominantFrequency": 1000.0,
    "bandwidth": 46.875,
    "snr": null
  },
  "aiAnalysis": {
    "classification": {
      "type": "sine",
      "confidence": 0.92,
      "characteristics": ["bandwidth=47 Hz", "dominant=1000 Hz"]
    },
    "anomalyScore": null,
    "detectedCharacteristics": ["Real-valued signal"],
    "rawOutput": "Probabilities: sine: 0.92, noisy_sine: 0.04, ..."
  },
  "visualization": {
    "waveform": { "time": [...], "amplitude": [...] },
    "fft": { "frequency": [...], "magnitude": [...] },
    "psd": { "frequency": [...], "power": [...] },
    "spectrogram": [[...], [...]],
    "constellation": null
  },
  "analyzedAt": "2026-08-27T12:00:00+00:00"
}
```

**Error Responses:**

| Status | Description |
|---|---|
| 400 | Empty file, corrupted file, or load error |
| 405 | Wrong HTTP method |
| 413 | File exceeds 100 MB limit |
| 415 | Unsupported file extension |
| 500 | Internal analysis failure |

---

### `GET /files/{storage_path}`

Retrieve a stored signal file (Supabase Storage).

### `GET /files/{storage_path}/url`

Get a signed URL for a stored file (1-hour expiry).

---

## Supported Formats

| Format | Extension | Description | Sample Rate |
|---|---|---|---|
| **WAV** | `.wav` | Standard PCM audio | Read from file header |
| **IQ (uint8)** | `.iq`, `.raw`, `.bin`, `.dat` | RTL-SDR interleaved uint8 | Must be specified (default: 1 MHz) |
| **IQ (complex64)** | `.iq`, `.raw`, `.bin`, `.dat` | Native complex64 samples | Must be specified |

---

## Known Limitations

1. **ML model is synthetic** — Trained on generated signals, not real-world captures. Classification accuracy on real signals will differ.
2. **SNR not computed** — SNR requires a reference signal; currently returned as `null`.
3. **IQ sample rate** — Most raw IQ formats do not contain a sample rate in the header. The user must provide it via the `sample_rate` form field.
4. **File size limit** — 100 MB maximum per upload.
5. **No authentication yet** — Supabase auth integration is implemented in the database schema but not yet wired to the frontend.

---

## Security

- **No secrets in frontend code** — Only `VITE_API_BASE_URL` is exposed to the browser. Supabase service-role keys stay server-side only.
- **Supabase RLS** — Row-Level Security enabled on all 6 database tables. Users can only read/update their own data.
- **Private storage bucket** — `signal-files` bucket is private. Authenticated users access only their own folder. Service role (backend) bypasses RLS.
- **File validation** — Extension and MIME type checked before processing. 100 MB size limit enforced.

---

## Testing

### Automated Tests

```bash
# Backend API tests
python tests/test_api.py

# TypeScript compilation check
bun tsc -b --noEmit

# Frontend build
bun run build
```

### Integration Test Results (Phase 16)

| Test | Status |
|---|---|
| WAV upload → analysis → response | ✅ |
| IQ upload → analysis → response | ✅ |
| Time-domain metrics (RMS, peak, ZCR) | ✅ |
| FFT peak detection | ✅ |
| PSD (Welch) | ✅ |
| Spectrogram | ✅ |
| IQ constellation | ✅ |
| ML classification | ✅ |
| Feature extraction (11 features) | ✅ |
| Error handling (empty, corrupted, oversized, unsupported) | ✅ |
| CORS preflight | ✅ |
| TypeScript compilation | ✅ |

---

## Development Workflow

1. Start the backend: `uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload`
2. Start the frontend: `bun run dev`
3. Upload a test signal file via the web UI
4. Verify real values appear on the dashboard (not mock data)
5. Run `bun tsc -b --noEmit` before committing

---

## Database Schema

Six tables with full relational integrity:

- **users** — Synced from Supabase Auth
- **files** — Uploaded signal files with storage paths
- **analyses** — Pipeline status tracking (pending → processing → complete/failed)
- **features** — DSP extraction results (time-domain, spectral, IQ)
- **predictions** — ML classification results with confidence scores
- **reports** — Generated analysis reports

See `supabase/schema.sql` and `supabase/storage.sql` for the full migrations.

---

## License

This project is developed for Smart India Hackathon 2026 (SIH26147).

---

## Acknowledgments

- DSP algorithms validated against Google Colab prototype
- Synthetic ML training data generated from signal modulation models
- Frontend built with React, Vite, Tailwind CSS, and Recharts
- Backend powered by FastAPI and SciPy
