import type { SignalFormat } from "@/types/signal";

// ─── Accepted Extensions ───────────────────────────────────────────────
const WAV_EXTENSIONS = [".wav"];
const IQ_EXTENSIONS = [".iq", ".raw", ".cf32", ".cs16"];
const ALL_EXTENSIONS = [...WAV_EXTENSIONS, ...IQ_EXTENSIONS];

// ─── Size Limits ───────────────────────────────────────────────────────
// 500 MB — generous for large IQ captures, but still bounded
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;
// WAV files below 100 bytes are almost certainly corrupt
const MIN_WAV_SIZE_BYTES = 100;
// IQ files below 64 bytes are too small to contain meaningful data
const MIN_IQ_SIZE_BYTES = 64;

// ─── Validation Result ─────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  format: SignalFormat | null;
  error: string | null;
  errorCode: ValidationError | null;
}

export type ValidationError =
  | "NO_FILE"
  | "INVALID_EXTENSION"
  | "FILE_TOO_LARGE"
  | "FILE_TOO_SMALL"
  | "DUPLICATE_FILE";

// ─── Helpers ───────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

function isWavFile(file: File): boolean {
  const ext = getExtension(file.name);
  if (WAV_EXTENSIONS.includes(ext)) return true;

  // WAV magic bytes: RIFF....WAVE
  const isWavMagic =
    file.size >= 12 &&
    file.type === "audio/wav" || file.type === "audio/wave" || file.type === "audio/x-wav";
  return isWavMagic;
}

function isIQFile(file: File): boolean {
  const ext = getExtension(file.name);
  return IQ_EXTENSIONS.includes(ext);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min} m ${sec} s`;
}

// ─── Core Validation ──────────────────────────────────────────────────

export function validateFile(
  file: File | null | undefined,
  existingFileName?: string
): ValidationResult {
  if (!file) {
    return {
      valid: false,
      format: null,
      error: "No file selected. Please choose a signal file to upload.",
      errorCode: "NO_FILE",
    };
  }

  // Check extension
  if (!isWavFile(file) && !isIQFile(file)) {
    const ext = getExtension(file.name) || "unknown";
    return {
      valid: false,
      format: null,
      error: `Unsupported file format (".${ext.slice(1)}"). Accepted formats: ${ALL_EXTENSIONS.join(", ")}`,
      errorCode: "INVALID_EXTENSION",
    };
  }

  const format: SignalFormat = isWavFile(file) ? "WAV" : "IQ";

  // Check file size — upper limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      format,
      error: `File too large (${formatBytes(file.size)}). Maximum size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
      errorCode: "FILE_TOO_LARGE",
    };
  }

  // Check file size — lower limit
  const minSize = format === "WAV" ? MIN_WAV_SIZE_BYTES : MIN_IQ_SIZE_BYTES;
  if (file.size < minSize) {
    return {
      valid: false,
      format,
      error: `File is too small (${formatBytes(file.size)}). A valid ${format} file must be at least ${formatBytes(minSize)}.`,
      errorCode: "FILE_TOO_SMALL",
    };
  }

  // Check duplicate
  if (existingFileName && file.name === existingFileName) {
    return {
      valid: true,
      format,
      error: null,
      errorCode: "DUPLICATE_FILE",
    };
  }

  return { valid: true, format, error: null, errorCode: null };
}

// ─── MIME type mapping for FormData ────────────────────────────────────

export function getMimeType(file: File): string {
  if (isWavFile(file)) return "audio/wav";
  const ext = getExtension(file.name);
  const mimeMap: Record<string, string> = {
    ".iq": "application/octet-stream",
    ".raw": "application/octet-stream",
    ".cf32": "application/octet-stream",
    ".cs16": "application/octet-stream",
  };
  return mimeMap[ext] || "application/octet-stream";
}
