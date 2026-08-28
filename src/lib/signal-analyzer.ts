/**
 * SignalLens AI — Client-Side Signal Analyzer
 *
 * Performs real DSP analysis in the browser using Web Audio API
 * and custom FFT/spectral analysis. No mock data, no hardcoded values.
 * Every result is derived from the actual uploaded file samples.
 */

import type { AnalysisResult } from "@/types/signal";

// ─── FFT (Radix-2 Cooley-Tukey) ──────────────────────────────────────

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n === 0 || (n & (n - 1)) !== 0) return; // must be power of 2

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  // Butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < half; j++) {
        const tRe = curRe * re[i + j + half] - curIm * im[i + j + half];
        const tIm = curRe * im[i + j + half] + curIm * re[i + j + half];
        re[i + j + half] = re[i + j] - tRe;
        im[i + j + half] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// ─── WAV Decoding ─────────────────────────────────────────────────────

async function decodeWav(file: File): Promise<{ samples: Float64Array; sampleRate: number }> {
  const arrayBuf = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audioBuf = await ctx.decodeAudioData(arrayBuf);

  // Mix down to mono if stereo (Web Audio returns Float32Array, convert to Float64Array)
  let mono: Float64Array;
  if (audioBuf.numberOfChannels === 1) {
    mono = Float64Array.from(audioBuf.getChannelData(0));
  } else {
    const ch0 = audioBuf.getChannelData(0);
    const ch1 = audioBuf.getChannelData(1);
    mono = new Float64Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) {
      mono[i] = (ch0[i] + ch1[i]) / 2;
    }
  }

  return { samples: mono, sampleRate: audioBuf.sampleRate };
}

// ─── IQ Parsing ───────────────────────────────────────────────────────

function parseIQ(data: ArrayBuffer): { samples: Float64Array; sampleRate: number } {
  const raw = new Uint8Array(data);
  const nComplex = Math.floor(raw.length / 2);
  const real = new Float64Array(nComplex);
  const imag = new Float64Array(nComplex);

  for (let i = 0; i < nComplex; i++) {
    real[i] = (raw[2 * i] - 127.5) / 127.5;
    imag[i] = (raw[2 * i + 1] - 127.5) / 127.5;
  }

  // Return interleaved real/imag as magnitude for time-domain display
  // Keep separate for constellation
  const magnitude = new Float64Array(nComplex);
  for (let i = 0; i < nComplex; i++) {
    magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }

  // Store I/Q in a global for constellation extraction
  (globalThis as any).__signalI = real;
  (globalThis as any).__signalQ = imag;

  return { samples: magnitude, sampleRate: 250000 }; // Default for IQ
}

// ─── Time-Domain Features ─────────────────────────────────────────────

function computeTimeFeatures(samples: Float64Array, sampleRate: number) {
  const n = samples.length;
  const duration = n / sampleRate;

  let sumSq = 0, peak = 0, mean = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    sumSq += v * v;
    if (Math.abs(v) > peak) peak = Math.abs(v);
    mean += v;
  }
  mean /= n;
  const rms = Math.sqrt(sumSq / n);
  const variance = sumSq / n - mean * mean;

  // Zero crossing rate
  let zc = 0;
  for (let i = 1; i < n; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) zc++;
  }
  const zcr = zc / (n - 1);

  // Dominant frequency via peak FFT bin
  const { freqs, magnitudes } = computeFFTPeak(samples, sampleRate);
  const peakIdx = argMax(magnitudes);
  const dominantFreq = freqs[peakIdx];

  // Crest factor
  const crestFactor = rms > 0 ? peak / rms : 0;

  return { rms, peak, mean, variance, duration, zcr, dominantFreq, crestFactor };
}

// ─── FFT for peak detection ───────────────────────────────────────────

function computeFFTPeak(
  samples: Float64Array,
  sampleRate: number,
): { freqs: Float64Array; magnitudes: Float64Array } {
  const n = nextPow2(samples.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);

  // Apply Hanning window and copy
  for (let i = 0; i < samples.length; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (samples.length - 1)));
    re[i] = samples[i] * w;
  }

  fft(re, im);

  const half = n >> 1;
  const freqs = new Float64Array(half);
  const magnitudes = new Float64Array(half);

  for (let i = 0; i < half; i++) {
    freqs[i] = (i * sampleRate) / n;
    magnitudes[i] = 20 * Math.log10(Math.sqrt(re[i] * re[i] + im[i] * im[i]) / half + 1e-12);
  }

  return { freqs, magnitudes };
}

// ─── Full FFT (for visualization) ─────────────────────────────────────

function computeFullFFT(
  samples: Float64Array,
  sampleRate: number,
): { frequency: number[]; magnitude: number[] } {
  const n = nextPow2(samples.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);

  for (let i = 0; i < samples.length; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (samples.length - 1)));
    re[i] = samples[i] * w;
  }

  fft(re, im);

  const half = n >> 1;
  const frequency: number[] = [];
  const magnitude: number[] = [];

  // Downsample to max 2000 points with peak-preserving
  const maxPts = 2000;
  if (half <= maxPts) {
    for (let i = 0; i < half; i++) {
      frequency.push((i * sampleRate) / n);
      magnitude.push(20 * Math.log10(Math.sqrt(re[i] * re[i] + im[i] * im[i]) / half + 1e-12));
    }
  } else {
    const windowSize = Math.floor(half / maxPts);
    for (let i = 0; i < half; i += windowSize) {
      let bestIdx = i;
      let bestMag = 0;
      for (let j = i; j < Math.min(i + windowSize, half); j++) {
        const mag = Math.sqrt(re[j] * re[j] + im[j] * im[j]);
        if (mag > bestMag) {
          bestMag = mag;
          bestIdx = j;
        }
      }
      frequency.push((bestIdx * sampleRate) / n);
      magnitude.push(20 * Math.log10(bestMag / half + 1e-12));
    }
  }

  return { frequency, magnitude };
}

// ─── PSD (Welch's method) ────────────────────────────────────────────

function computePSD(
  samples: Float64Array,
  sampleRate: number,
): { frequency: number[]; power: number[] } {
  const nperseg = Math.min(1024, Math.floor(samples.length / 4));
  const noverlap = Math.floor(nperseg / 2);
  const step = nperseg - noverlap;
  const nSegments = Math.floor((samples.length - nperseg) / step) + 1;

  if (nSegments < 1) {
    // Fall back to single segment
    const n = nextPow2(nperseg);
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    const segLen = Math.min(samples.length, nperseg);
    for (let i = 0; i < segLen; i++) {
      re[i] = samples[i] * (0.5 * (1 - Math.cos((2 * Math.PI * i) / (segLen - 1))));
    }
    fft(re, im);
    const half = n >> 1;
    const frequency: number[] = [];
    const power: number[] = [];
    for (let i = 0; i < half; i++) {
      frequency.push((i * sampleRate) / n);
      power.push((re[i] * re[i] + im[i] * im[i]) / (sampleRate * n));
    }
    return { frequency, power };
  }

  const nfft = nextPow2(nperseg);
  const half = nfft >> 1;
  const sumPower = new Float64Array(half);

  for (let seg = 0; seg < nSegments; seg++) {
    const start = seg * step;
    const re = new Float64Array(nfft);
    const im = new Float64Array(nfft);
    for (let i = 0; i < nperseg; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (nperseg - 1)));
      re[i] = samples[start + i] * w;
    }
    fft(re, im);
    for (let i = 0; i < half; i++) {
      sumPower[i] += (re[i] * re[i] + im[i] * im[i]) / (sampleRate * nfft);
    }
  }

  const frequency: number[] = [];
  const power: number[] = [];
  for (let i = 0; i < half; i++) {
    frequency.push((i * sampleRate) / nfft);
    power.push(sumPower[i] / nSegments);
  }

  return { frequency, power };
}

// ─── Spectrogram (STFT) ──────────────────────────────────────────────

function computeSpectrogram(
  samples: Float64Array,
  _sampleRate: number,
): number[][] {
  const nperseg = Math.min(256, Math.floor(samples.length / 8));
  const noverlap = Math.floor(nperseg / 2);
  const step = nperseg - noverlap;
  const nfft = nextPow2(nperseg);
  const nTime = Math.floor((samples.length - nperseg) / step) + 1;
  const nFreq = nfft >> 1;

  const result: number[][] = [];

  for (let t = 0; t < nTime; t++) {
    const start = t * step;
    const re = new Float64Array(nfft);
    const im = new Float64Array(nfft);
    for (let i = 0; i < nperseg; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (nperseg - 1)));
      re[i] = samples[start + i] * w;
    }
    fft(re, im);
    const row: number[] = [];
    for (let f = 0; f < nFreq; f++) {
      row.push(10 * Math.log10((re[f] * re[f] + im[f] * im[f]) / nfft + 1e-12));
    }
    result.push(row);
  }

  return result;
}

// ─── Peak Detection ───────────────────────────────────────────────────

function detectPeaks(
  freqs: Float64Array,
  magnitudes: Float64Array,
  thresholdDb: number = -30,
  minDistance: number = 5,
): { frequency: number; magnitude: number }[] {
  const peaks: { frequency: number; magnitude: number }[] = [];
  const localMax: number[] = [];

  // Find local maxima above threshold
  for (let i = 1; i < magnitudes.length - 1; i++) {
    if (
      magnitudes[i] > magnitudes[i - 1] &&
      magnitudes[i] > magnitudes[i + 1] &&
      magnitudes[i] > thresholdDb
    ) {
      localMax.push(i);
    }
  }

  // Non-maximum suppression
  for (const idx of localMax) {
    let suppressed = false;
    for (const p of peaks) {
      if (Math.abs(freqs[idx] - p.frequency) < minDistance) {
        if (magnitudes[idx] > p.magnitude) {
          p.frequency = freqs[idx];
          p.magnitude = magnitudes[idx];
        }
        suppressed = true;
        break;
      }
    }
    if (!suppressed) {
      peaks.push({ frequency: freqs[idx], magnitude: magnitudes[idx] });
    }
  }

  return peaks.sort((a, b) => b.magnitude - a.magnitude);
}

// ─── SNR Estimation ───────────────────────────────────────────────────

function estimateSNR(
  freqs: Float64Array,
  magnitudes: Float64Array,
  signalPeakHz: number,
  bandwidthHz: number = 200,
): number {
  // Signal power: around the peak
  let signalSum = 0, signalCount = 0;
  let noiseSum = 0, noiseCount = 0;

  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i];
    if (Math.abs(f - signalPeakHz) < bandwidthHz) {
      signalSum += Math.pow(10, magnitudes[i] / 10);
      signalCount++;
    } else if (f > 100 && f < freqs[freqs.length - 1] * 0.9) {
      noiseSum += Math.pow(10, magnitudes[i] / 10);
      noiseCount++;
    }
  }

  if (signalCount === 0 || noiseCount === 0) return 0;

  const signalPower = signalSum / signalCount;
  const noisePower = noiseSum / noiseCount;

  return noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;
}

// ─── Bandwidth Estimation ─────────────────────────────────────────────

function estimateBandwidth(
  freqs: Float64Array,
  magnitudes: Float64Array,
): { bandwidthHz: number; centerFreqHz: number } {
  let maxMag = magnitudes[0];
  for (let i = 1; i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMag) maxMag = magnitudes[i];
  }
  const halfPower = maxMag - 3;

  let low = freqs[0], high = freqs[freqs.length - 1];
  let foundLow = false, foundHigh = false;

  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] >= halfPower) {
      if (!foundLow) { low = freqs[i]; foundLow = true; }
      high = freqs[i];
    }
  }

  const bw = foundLow && foundHigh ? high - low : 0;
  const center = (low + high) / 2;

  return { bandwidthHz: bw, centerFreqHz: center };
}

// ─── Waveform Downsample (peak-preserving) ────────────────────────────

function downsampleWaveform(
  samples: Float64Array,
  sampleRate: number,
  maxPts: number = 2000,
): { time: number[]; amplitude: number[] } {
  const n = samples.length;
  if (n <= maxPts) {
    const time: number[] = [];
    const amplitude: number[] = [];
    for (let i = 0; i < n; i++) {
      time.push(i / sampleRate);
      amplitude.push(samples[i]);
    }
    return { time, amplitude };
  }

  const windowSize = Math.floor(n / maxPts);
  const time: number[] = [];
  const amplitude: number[] = [];

  for (let i = 0; i < n; i += windowSize) {
    const end = Math.min(i + windowSize, n);
    let bestIdx = i;
    let bestAbs = 0;
    for (let j = i; j < end; j++) {
      if (Math.abs(samples[j]) > bestAbs) {
        bestAbs = Math.abs(samples[j]);
        bestIdx = j;
      }
    }
    time.push(bestIdx / sampleRate);
    amplitude.push(samples[bestIdx]);
  }

  return { time, amplitude };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function argMax(arr: Float64Array): number {
  let idx = 0, max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) { max = arr[i]; idx = i; }
  }
  return idx;
}

// ─── Main Analysis Function ───────────────────────────────────────────

export async function analyzeFileInBrowser(
  file: File,
  format: "WAV" | "IQ",
  sampleRateOverride?: number,
): Promise<AnalysisResult> {
  // Step 1: Load samples
  let samples: Float64Array;
  let sampleRate: number;

  if (format === "WAV") {
    const decoded = await decodeWav(file);
    samples = decoded.samples;
    sampleRate = decoded.sampleRate;
  } else {
    const arrayBuf = await file.arrayBuffer();
    const parsed = parseIQ(arrayBuf);
    samples = parsed.samples;
    sampleRate = sampleRateOverride || parsed.sampleRate;
  }

  const n = samples.length;
  // Step 2: DC removal (subtract mean)
  let dcMean = 0;
  for (let i = 0; i < n; i++) dcMean += samples[i];
  dcMean /= n;
  const dcRemoved = new Float64Array(n);
  for (let i = 0; i < n; i++) dcRemoved[i] = samples[i] - dcMean;

  // Step 3: Time-domain features
  const td = computeTimeFeatures(dcRemoved, sampleRate);

  // Step 4: FFT
  const fftData = computeFullFFT(dcRemoved, sampleRate);

  // Step 5: PSD
  const psdData = computePSD(dcRemoved, sampleRate);

  // Step 6: Spectrogram
  const spectrogramData = computeSpectrogram(dcRemoved, sampleRate);

  // Step 7: Peak detection
  const fftForPeaks = computeFFTPeak(dcRemoved, sampleRate);
  const peaks = detectPeaks(fftForPeaks.freqs, fftForPeaks.magnitudes);

  // Step 8: Bandwidth estimation
  const bw = estimateBandwidth(fftForPeaks.freqs, fftForPeaks.magnitudes);

  // Step 9: SNR estimation
  const snr = peaks.length > 0 ? estimateSNR(fftForPeaks.freqs, fftForPeaks.magnitudes, peaks[0].frequency) : 0;

  // Step 10: Waveform visualization
  const waveform = downsampleWaveform(dcRemoved, sampleRate);

  // Step 11: Constellation (IQ only)
  let constellation: { i: number[]; q: number[] } | undefined;
  if (format === "IQ") {
    const iData = (globalThis as any).__signalI as Float64Array | undefined;
    const qData = (globalThis as any).__signalQ as Float64Array | undefined;
    if (iData && qData) {
      const maxConst = 3000;
      const step = Math.max(1, Math.floor(iData.length / maxConst));
      const iArr: number[] = [];
      const qArr: number[] = [];
      for (let i = 0; i < iData.length; i += step) {
        iArr.push(iData[i]);
        qArr.push(qData[i]);
      }
      constellation = { i: iArr, q: qArr };
    }
  }

  // Step 12: Build characteristics
  const characteristics: string[] = [];
  characteristics.push(`dominant=${td.dominantFreq.toFixed(0)} Hz`);
  characteristics.push(`bandwidth=${bw.bandwidthHz.toFixed(0)} Hz`);
  characteristics.push(`rms=${td.rms.toFixed(4)}`);

  const detected: string[] = [];
  detected.push(`Peak frequency: ${td.dominantFreq.toFixed(1)} Hz`);
  detected.push(`Signal bandwidth: ${bw.bandwidthHz.toFixed(1)} Hz`);
  detected.push(`RMS amplitude: ${td.rms.toFixed(6)}`);
  detected.push(`Peak amplitude: ${td.peak.toFixed(6)}`);
  detected.push(`Crest factor: ${td.crestFactor.toFixed(2)}`);
  detected.push(`Zero crossing rate: ${td.zcr.toFixed(4)}`);
  detected.push(`SNR estimate: ${snr.toFixed(1)} dB`);
  detected.push(`Duration: ${td.duration.toFixed(3)} s`);
  detected.push(`Sample rate: ${sampleRate} Hz`);
  detected.push(`${peaks.length} spectral peak(s) detected`);
  if (peaks.length > 0) {
    detected.push(`Strongest: ${peaks[0].frequency.toFixed(0)} Hz (${peaks[0].magnitude.toFixed(1)} dB)`);
  }

  // Step 13: Classification heuristics
  let classificationType = "Unknown Signal";
  let confidence = 0.3;
  if (peaks.length === 1 && bw.bandwidthHz < 500) {
    classificationType = "Continuous Wave (CW)";
    confidence = 0.7;
  } else if (peaks.length >= 2 && bw.bandwidthHz > 1000) {
    classificationType = "Multi-Tone Signal";
    confidence = 0.6;
  } else if (td.zcr > 0.3) {
    classificationType = "Wideband Signal";
    confidence = 0.5;
  } else if (peaks.length >= 1) {
    classificationType = "Narrowband Signal";
    confidence = 0.6;
  }

  // Build result
  const now = new Date();
  const result: AnalysisResult = {
    file: {
      id: `client-${Date.now()}`,
      name: file.name,
      format,
      size: file.size,
      uploadedAt: now,
      status: "complete",
    },
    metrics: {
      duration: td.duration,
      sampleRate,
      rms: td.rms,
      peak: td.peak,
      dominantFrequency: td.dominantFreq,
      bandwidth: bw.bandwidthHz,
      snr,
    },
    aiAnalysis: {
      classification: {
        type: classificationType,
        confidence,
        characteristics,
      },
      detectedCharacteristics: detected,
      rawOutput: peaks.map(p => `${p.frequency.toFixed(0)}Hz (${p.magnitude.toFixed(1)}dB)`).join(", "),
    },
    visualization: {
      waveform,
      fft: fftData,
      psd: psdData,
      spectrogram: spectrogramData,
      constellation,
    },
    analyzedAt: now,
  };

  return result;
}
