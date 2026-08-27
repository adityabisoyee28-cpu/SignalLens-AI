export type SignalFormat = "WAV" | "IQ";

export interface SignalFile {
  id: string;
  name: string;
  format: SignalFormat;
  size: number;
  uploadedAt: Date;
  status: "pending" | "analyzing" | "complete" | "error";
}

export interface SignalMetrics {
  duration: number;          // seconds
  sampleRate: number;        // Hz
  rms: number;              // Root Mean Square amplitude
  peak: number;             // Peak amplitude
  dominantFrequency: number; // Hz
  bandwidth: number;        // Hz
  snr?: number;             // dB — only when reliably available
}

export interface ClassificationResult {
  type: string;                    // e.g. "FM Broadcast", "AM Signal", "Unknown"
  confidence: number;              // 0-1
  characteristics: string[];       // e.g. ["narrowband", "modulated"]
}

export interface AIAnalysis {
  classification: ClassificationResult;
  anomalyScore?: number;           // 0-1, only if implemented
  detectedCharacteristics: string[];
  rawOutput?: string;              // raw model output for debugging
}

export interface VisualizationData {
  waveform: { time: number[]; amplitude: number[] };
  fft: { frequency: number[]; magnitude: number[] };
  psd: { frequency: number[]; power: number[] };
  spectrogram: number[][];         // 2D matrix [time][frequency]
  constellation?: { i: number[]; q: number[] }; // IQ only
}

export interface AnalysisResult {
  file: SignalFile;
  metrics: SignalMetrics;
  aiAnalysis: AIAnalysis;
  visualization: VisualizationData;
  analyzedAt: Date;
}

export interface UploadState {
  file: File | null;
  format: SignalFormat;
  uploading: boolean;
  progress: number;
  error?: string;
}
