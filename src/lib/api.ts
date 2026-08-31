/**
 * SignalLens AI — Upload & Analysis API Service
 *
 * Clean API boundary for communicating with the Python signal-analysis backend.
 * All HTTP requests, auth headers, and error mapping live here.
 * The rest of the app never talks to the backend directly.
 *
 * ─── Integration ────────────────────────────────────────────────────────
 * When VITE_API_BASE_URL is set, uploads go directly to POST /analyze
 * as multipart form data. The backend runs the full pipeline and returns
 * structured results matching the frontend AnalysisResult type.
 *
 * When VITE_API_BASE_URL is empty, mock implementations are used.
 */

import type { SignalFormat, AnalysisResult } from "@/types/signal";
import { analyzeFileInBrowser } from "@/lib/signal-analyzer";

// ─── OGG → WAV Conversion ─────────────────────────────────────────────
// Web Audio API decodes OGG; we re-encode as WAV for backend upload.

async function oggToWavBlob(file: File): Promise<File> {
  const arrayBuf = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audioBuf = await ctx.decodeAudioData(arrayBuf);

  // Encode as WAV (16-bit PCM)
  const numChannels = 1;
  const sampleRate = audioBuf.sampleRate;
  const length = audioBuf.length;
  const bytesPerSample = 2;
  const dataSize = length * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const samples = audioBuf.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new File([buffer], file.name.replace(/\.og[ga]?$/i, ".wav"), {
    type: "audio/wav",
    lastModified: file.lastModified,
  });
}

// ─── Configuration ─────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// ─── Progress Tracking ─────────────────────────────────────────────────
export type UploadProgressCallback = (loaded: number, total: number) => void;

// ─── Upload Error ──────────────────────────────────────────────────────
export class UploadError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "UploadError";
    this.status = status;
    this.code = code;
  }
}

// ─── Upload Response ───────────────────────────────────────────────────
export interface UploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  format: SignalFormat;
}

// ─── Analyze File ──────────────────────────────────────────────────────
// Sends the file directly to POST /analyze for upload + analysis in one step.

export async function uploadAndAnalyze(
  file: File,
  format: SignalFormat,
  sampleRate?: number,
  iqDtype?: string,
  onProgress?: UploadProgressCallback,
): Promise<AnalysisResult> {
  // OGG: decode client-side to WAV, then send to backend (or analyze locally)
  if (format === "OGG") {
    try {
      const wavFile = await oggToWavBlob(file);
      if (API_BASE) {
        return await analyzeOnBackend(wavFile, "WAV", undefined, undefined, onProgress);
      }
      return analyzeFileInBrowser(wavFile, "WAV", undefined);
    } catch (err) {
      // Fallback: pure client-side analysis with OGG
      console.warn("OGG conversion failed, using client-side DSP:", err);
      return analyzeFileInBrowser(file, format, sampleRate);
    }
  }

  if (API_BASE) {
    try {
      return await analyzeOnBackend(file, format, sampleRate, iqDtype, onProgress);
    } catch (err) {
      console.warn("Backend unavailable, using client-side DSP:", err);
      return analyzeFileInBrowser(file, format, sampleRate);
    }
  }
  return analyzeFileInBrowser(file, format, sampleRate);
}

// ─── Real Backend Integration ──────────────────────────────────────────

async function analyzeOnBackend(
  file: File,
  _format: SignalFormat,
  sampleRate?: number,
  iqDtype?: string,
  onProgress?: UploadProgressCallback,
): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          // The backend returns the exact AnalysisResult shape
          resolve(data as AnalysisResult);
        } catch {
          reject(
            new UploadError(
              "Invalid response from server",
              xhr.status,
              "PARSE_ERROR",
            ),
          );
        }
      } else if (xhr.status === 413) {
        reject(
          new UploadError(
            "File too large for server",
            xhr.status,
            "FILE_TOO_LARGE",
          ),
        );
      } else if (xhr.status === 415) {
        reject(
          new UploadError(
            "Unsupported file format",
            xhr.status,
            "INVALID_FORMAT",
          ),
        );
      } else {
        // Try to parse error detail from response
        let detail = `Upload failed (HTTP ${xhr.status})`;
        try {
          const errBody = JSON.parse(xhr.responseText);
          if (errBody.detail) detail = errBody.detail;
        } catch {
          // use default
        }
        reject(new UploadError(detail, xhr.status, "UPLOAD_FAILED"));
      }
    });

    xhr.addEventListener("error", () => {
      reject(
        new UploadError(
          "Network error — check your connection and try again.",
          undefined,
          "NETWORK_ERROR",
        ),
      );
    });

    xhr.addEventListener("abort", () => {
      reject(new UploadError("Upload cancelled", undefined, "ABORTED"));
    });

    // Build multipart form data
    const formData = new FormData();
    formData.append("file", file);

    if (sampleRate != null) {
      formData.append("sample_rate", String(sampleRate));
    }
    if (iqDtype) {
      formData.append("iq_dtype", iqDtype);
    }

    xhr.open("POST", `${API_BASE}/analyze`);
    xhr.send(formData);
  });
}

// ─── Legacy API Methods ────────────────────────────────────────────────
// Kept for backward compatibility. New code should use uploadAndAnalyze().

export async function uploadFile(
  file: File,
  format: SignalFormat,
  _onProgress?: UploadProgressCallback,
): Promise<UploadResponse> {
  // upload + analyze happen in one step now
  return {
    fileId: `pending-${Date.now()}`,
    fileName: file.name,
    fileSize: file.size,
    format,
  };
}

export async function startAnalysis(
  _fileId: string,
  _format: SignalFormat,
): Promise<AnalysisResult> {
  throw new UploadError(
    "Use uploadAndAnalyze() instead — the new API combines upload and analysis.",
    undefined,
    "DEPRECATED",
  );
}

// ─── Mock Implementations ──────────────────────────────────────────────

// mockAnalyze removed — all analysis now uses real DSP


