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
  if (API_BASE) {
    return analyzeOnBackend(file, format, sampleRate, iqDtype, onProgress);
  }
  return mockAnalyze(file, format);
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
  onProgress?: UploadProgressCallback,
): Promise<UploadResponse> {
  if (API_BASE) {
    // In the new API, upload + analyze happen in one step.
    // This wrapper just returns the upload response shape.
    return {
      fileId: `pending-${Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      format,
    };
  }
  return mockUploadFile(file, format, onProgress);
}

export async function startAnalysis(
  fileId: string,
  format: SignalFormat,
): Promise<AnalysisResult> {
  if (API_BASE) {
    throw new UploadError(
      "Use uploadAndAnalysis() instead — the new API combines upload and analysis.",
      undefined,
      "DEPRECATED",
    );
  }
  return mockStartAnalysis(fileId, format);
}

// ─── Mock Implementations ──────────────────────────────────────────────

async function mockAnalyze(
  file: File,
  format: SignalFormat,
): Promise<AnalysisResult> {
  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
  const { generateMockAnalysis } = await import("@/lib/mock-data");
  const result = generateMockAnalysis();
  result.file.name = file.name;
  result.file.format = format;
  result.file.size = file.size;
  return result;
}

async function mockUploadFile(
  file: File,
  _format: SignalFormat,
  onProgress?: UploadProgressCallback,
): Promise<UploadResponse> {
  const totalBytes = file.size;
  return new Promise((resolve) => {
    let loaded = 0;
    const startTime = Date.now();
    const durationMs = 2000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const fraction = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - fraction, 3);
      loaded = Math.floor(eased * totalBytes);

      onProgress?.(loaded, totalBytes);

      if (fraction < 1) {
        requestAnimationFrame(tick);
      } else {
        onProgress?.(totalBytes, totalBytes);
        resolve({
          fileId: crypto.randomUUID(),
          fileName: file.name,
          fileSize: file.size,
          format: _format,
        });
      }
    };

    requestAnimationFrame(tick);
  });
}

async function mockStartAnalysis(
  fileId: string,
  format: SignalFormat,
): Promise<AnalysisResult> {
  await new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000));
  const { generateMockAnalysis } = await import("@/lib/mock-data");
  const result = generateMockAnalysis();
  result.file.id = fileId;
  result.file.format = format;
  return result;
}
