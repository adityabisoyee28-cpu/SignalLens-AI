import type { AnalysisResult, VisualizationData } from "@/types/signal";

function generateWaveform(length: number): { time: number[]; amplitude: number[] } {
  const time: number[] = [];
  const amplitude: number[] = [];
  for (let i = 0; i < length; i++) {
    const t = i / length;
    time.push(t);
    // Simulated signal with noise
    const signal =
      0.6 * Math.sin(2 * Math.PI * 10 * t) +
      0.3 * Math.sin(2 * Math.PI * 25 * t + 0.5) +
      0.1 * (Math.random() - 0.5);
    amplitude.push(signal);
  }
  return { time, amplitude };
}

function generateFFT(length: number): { frequency: number[]; magnitude: number[] } {
  const frequency: number[] = [];
  const magnitude: number[] = [];
  for (let i = 0; i < length; i++) {
    const f = (i / length) * 50000;
    frequency.push(f);
    // Peaks at certain frequencies
    let mag = -80 + Math.random() * 5;
    if (Math.abs(f - 10000) < 500) mag = -20 + Math.random() * 5;
    if (Math.abs(f - 25000) < 300) mag = -30 + Math.random() * 5;
    magnitude.push(mag);
  }
  return { frequency, magnitude };
}

function generatePSD(length: number): { frequency: number[]; power: number[] } {
  const frequency: number[] = [];
  const power: number[] = [];
  for (let i = 0; i < length; i++) {
    const f = (i / length) * 50000;
    frequency.push(f);
    power.push(-100 + 60 * Math.exp(-f / 20000) + Math.random() * 3);
  }
  return { frequency, power };
}

function generateSpectrogram(rows: number, cols: number): number[][] {
  const data: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      // Simulated time-frequency representation
      const base = -60 + 30 * Math.exp(-((c - cols * 0.3) ** 2) / (cols * 0.05));
      const noise = Math.random() * 8 - 4;
      row.push(base + noise + 10 * Math.sin(r * 0.5));
    }
    data.push(row);
  }
  return data;
}

function generateConstellation(length: number): { i: number[]; q: number[] } {
  const i: number[] = [];
  const q: number[] = [];
  for (let idx = 0; idx < length; idx++) {
    // Simulated QPSK-like constellation
    const angle = Math.floor(Math.random() * 4) * (Math.PI / 2) + Math.PI / 4;
    const noise = 0.08 * (Math.random() - 0.5);
    i.push(Math.cos(angle) + noise);
    q.push(Math.sin(angle) + noise);
  }
  return { i, q };
}

export function generateMockVisualization(): VisualizationData {
  return {
    waveform: generateWaveform(512),
    fft: generateFFT(256),
    psd: generatePSD(256),
    spectrogram: generateSpectrogram(64, 128),
    constellation: generateConstellation(400),
  };
}

export function generateMockAnalysis(): AnalysisResult {
  return {
    file: {
      id: "demo-001",
      name: "sample_capture_100MHz.wav",
      format: "WAV",
      size: 4_194_304, // 4 MB
      uploadedAt: new Date(),
      status: "complete",
    },
    metrics: {
      duration: 2.56,
      sampleRate: 48000,
      rms: 0.342,
      peak: 0.891,
      dominantFrequency: 10240,
      bandwidth: 15000,
      snr: 42.3,
    },
    aiAnalysis: {
      classification: {
        type: "FM Broadcast Signal",
        confidence: 0.94,
        characteristics: [
          "Narrowband",
          "Frequency Modulated",
          "Continuous Wave",
          "Pre-emphasis detected",
        ],
      },
      anomalyScore: 0.12,
      detectedCharacteristics: [
        "Stable carrier frequency",
        "Consistent modulation index",
        "Low noise floor",
        "Standard broadcast bandwidth",
      ],
    },
    visualization: generateMockVisualization(),
    analyzedAt: new Date(),
  };
}
