import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Play,
  Pause,
  FileAudio,
  Activity,
  Clock,
  Disc,
  Radio,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { analyzeFileInBrowser } from "@/lib/signal-analyzer";

type MicState =
  | "idle"
  | "recording"
  | "review"
  | "processing"
  | "complete"
  | "error";

interface RecordingInfo {
  blob: Blob;
  url: string;
  audioBuffer: AudioBuffer;
  mimeType: string;
  sampleRate: number;
  channels: number;
  duration: number;
  fileSizeKB: number;
}

const MAX_RECORD_SECONDS = 30;

export function LiveMicPage() {
  const navigate = useNavigate();
  const [micState, setMicState] = useState<MicState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState<RecordingInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Cleanup playback URL on unmount
  useEffect(() => {
    return () => {
      if (recording?.url) URL.revokeObjectURL(recording.url);
    };
  }, [recording?.url]);

  useEffect(() => () => cleanup(), [cleanup]);

  // ─── Real-time waveform drawing ───────────────────────────────────────
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#f0ebe4";
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = "#e8ddd0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e97b2c";
    ctx.beginPath();

    const sliceWidth = w / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Amplitude indicator
    let sumSq = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = (dataArray[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / bufferLength);
    const barWidth = Math.min(rms * w * 2, w);

    ctx.fillStyle = `rgba(233, 123, 44, ${Math.min(rms * 3, 0.6)})`;
    ctx.fillRect(0, h - 4, barWidth, 4);

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  // ─── Draw recorded waveform (static) ─────────────────────────────────
  const drawRecordedWaveform = useCallback(
    (audioBuffer: AudioBuffer) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const samples = audioBuffer.getChannelData(0);
      const step = Math.ceil(samples.length / w);

      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "#f0ebe4";
      ctx.lineWidth = 1;
      for (let y = 0; y <= h; y += h / 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center line
      ctx.strokeStyle = "#e8ddd0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Recorded waveform
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#16a34a";
      ctx.beginPath();

      for (let i = 0; i < w; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const idx = i * step + j;
          if (idx < samples.length) {
            if (samples[idx] < min) min = samples[idx];
            if (samples[idx] > max) max = samples[idx];
          }
        }
        const yMin = ((1 + min) / 2) * h;
        const yMax = ((1 + max) / 2) * h;
        if (i === 0) {
          ctx.moveTo(i, yMin);
        } else {
          ctx.lineTo(i, yMin);
        }
        ctx.lineTo(i, yMax);
      }

      ctx.stroke();
    },
    []
  );

  // ─── Playback controls ───────────────────────────────────────────────
  const togglePlayback = useCallback(() => {
    if (!recording) return;
    const audio = playbackAudioRef.current;
    if (!audio) {
      const a = new Audio(recording.url);
      a.onended = () => setIsPlaying(false);
      playbackAudioRef.current = a;
      a.play();
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [recording, isPlaying]);

  // ─── Format name helper ───────────────────────────────────────────────
  const formatName = (mime: string): string => {
    if (mime.includes("webm;codecs=opus")) return "WebM (Opus)";
    if (mime.includes("webm")) return "WebM";
    if (mime.includes("ogg;codecs=opus")) return "OGG (Opus)";
    if (mime.includes("ogg")) return "OGG";
    if (mime.includes("mp4")) return "MP4 (AAC)";
    return mime.split("/").pop()?.toUpperCase() || mime;
  };

  // ─── Start Recording ──────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null);
    setDuration(0);
    setRecording(null);
    setIsPlaying(false);
    playbackAudioRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Set up analyser for real-time visualization
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start waveform drawing
      drawWaveform();

      // Set up MediaRecorder for actual capture
      const mimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      startTimeRef.current = Date.now();
      setMicState("recording");

      // Timer for duration display
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
        if (elapsed >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone access in your browser."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No microphone found. Please connect a microphone."
            : `Microphone error: ${err instanceof Error ? err.message : String(err)}`;
      setError(msg);
      setMicState("error");
    }
  }, [drawWaveform]);

  // ─── Stop Recording → Review ──────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanup();
      setMicState("error");
      setError("No recording in progress.");
      return;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        cleanup();

        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          if (blob.size === 0) {
            setError("Recording produced no audio data.");
            setMicState("error");
            resolve();
            return;
          }

          const arrayBuf = await blob.arrayBuffer();
          const ctx = new OfflineAudioContext(1, 1, 44100);
          const audioBuf = await ctx.decodeAudioData(arrayBuf);

          const url = URL.createObjectURL(blob);
          const fileSizeKB = (blob.size / 1024).toFixed(1);

          const info: RecordingInfo = {
            blob,
            url,
            audioBuffer: audioBuf,
            mimeType: recorder.mimeType,
            sampleRate: audioBuf.sampleRate,
            channels: audioBuf.numberOfChannels,
            duration: audioBuf.duration,
            fileSizeKB: parseFloat(fileSizeKB),
          };

          setRecording(info);
          setMicState("review");

          // Draw the recorded waveform (static)
          setTimeout(() => drawRecordedWaveform(audioBuf), 50);
          resolve();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to process recording");
          setMicState("error");
          resolve();
        }
      };

      recorder.stop();
    });
  }, [cleanup, drawRecordedWaveform]);

  // ─── Analyze from review state ────────────────────────────────────────
  const analyzeRecording = useCallback(async () => {
    if (!recording) return;
    setMicState("processing");

    try {
      // Encode as WAV
      const wavBlob = audioBufferToWav(recording.audioBuffer);
      const wavFile = new File([wavBlob], `mic-recording-${Date.now()}.wav`, {
        type: "audio/wav",
      });

      const result = await analyzeFileInBrowser(wavFile, "WAV", recording.sampleRate);
      setMicState("complete");

      // Cleanup playback
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
        playbackAudioRef.current = null;
      }
      URL.revokeObjectURL(recording.url);

      setTimeout(() => {
        navigate("/dashboard", {
          state: {
            analysisResult: result,
            fileName: wavFile.name,
            format: "WAV",
            source: "mic",
          },
        });
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze recording");
      setMicState("error");
    }
  }, [recording, navigate]);

  const elapsed = duration.toFixed(1);
  const isRecording = micState === "recording";
  const isProcessing = micState === "processing";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/upload">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "#1f2937" }}
          >
            Live Microphone Analysis
          </h1>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "#6b7280" }}
          >
            Capture audio directly from your microphone for real-time signal
            analysis.
          </p>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div
        className="rounded-lg border overflow-hidden mb-5"
        style={{
          borderColor: "#e8ddd0",
          backgroundColor: "#fffdf8",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full"
          style={{ display: "block" }}
        />
      </div>

      {/* ── Recording Info (shown during recording) ── */}
      {isRecording && (
        <div
          className="rounded-lg border p-3 mb-5 flex items-center justify-between"
          style={{
            borderColor: "#e8ddd0",
            backgroundColor: "#fffdf8",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#dc2626" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "#1f2937" }}
            >
              Live Recording
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "#6b7280" }}>
            <span>Format: WebM (Opus)</span>
            <span>Sample Rate: 44,100 Hz</span>
            <span>Channels: 1</span>
          </div>
        </div>
      )}

      {/* ── Recording Review (playback + format info) ── */}
      {micState === "review" && recording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          {/* Playback Card */}
          <div
            className="rounded-lg border p-4 mb-3"
            style={{
              borderColor: "#16a34a",
              backgroundColor: "#f0fdf4",
              boxShadow: "0 1px 3px rgba(22, 163, 74, 0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="h-4 w-4"
                  style={{ color: "#16a34a" }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#1f2937" }}
                >
                  Recording Captured
                </span>
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                }}
              >
                {recording.duration.toFixed(1)}s
              </span>
            </div>

            {/* Audio Player */}
            <div
              className="rounded-lg p-3 flex items-center gap-3"
              style={{ backgroundColor: "#fff" }}
            >
              <button
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                style={{
                  backgroundColor: "#fef3e2",
                  border: "2px solid #e97b2c",
                  color: "#e97b2c",
                }}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <audio
                  src={recording.url}
                  ref={playbackAudioRef}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-8"
                  controls
                  style={{
                    accentColor: "#e97b2c",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Audio Format Card */}
          <div
            className="rounded-lg border p-4 mb-4"
            style={{
              borderColor: "#e8ddd0",
              backgroundColor: "#fffdf8",
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"
              style={{ color: "#9ca3af" }}
            >
              <FileAudio className="h-3 w-3" />
              Audio Format Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Format */}
              <div
                className="rounded-md p-2.5"
                style={{ backgroundColor: "#fff" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FileAudio
                    className="h-3.5 w-3.5"
                    style={{ color: "#e97b2c" }}
                  />
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "#9ca3af" }}
                  >
                    Format
                  </span>
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#1f2937" }}
                >
                  {formatName(recording.mimeType)}
                </p>
              </div>

              {/* Sample Rate */}
              <div
                className="rounded-md p-2.5"
                style={{ backgroundColor: "#fff" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity
                    className="h-3.5 w-3.5"
                    style={{ color: "#16a34a" }}
                  />
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "#9ca3af" }}
                  >
                    Sample Rate
                  </span>
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#1f2937" }}
                >
                  {recording.sampleRate.toLocaleString()} Hz
                </p>
              </div>

              {/* Channels */}
              <div
                className="rounded-md p-2.5"
                style={{ backgroundColor: "#fff" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Radio
                    className="h-3.5 w-3.5"
                    style={{ color: "#d97706" }}
                  />
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "#9ca3af" }}
                  >
                    Channels
                  </span>
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#1f2937" }}
                >
                  {recording.channels === 1 ? "Mono" : "Stereo"}{" "}
                  <span
                    className="text-xs font-normal"
                    style={{ color: "#9ca3af" }}
                  >
                    ({recording.channels})
                  </span>
                </p>
              </div>

              {/* Duration */}
              <div
                className="rounded-md p-2.5"
                style={{ backgroundColor: "#fff" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock
                    className="h-3.5 w-3.5"
                    style={{ color: "#6366f1" }}
                  />
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "#9ca3af" }}
                  >
                    Duration
                  </span>
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#1f2937" }}
                >
                  {recording.duration.toFixed(2)}s
                </p>
              </div>

              {/* File Size */}
              <div
                className="rounded-md p-2.5"
                style={{ backgroundColor: "#fff" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Disc
                    className="h-3.5 w-3.5"
                    style={{ color: "#dc2626" }}
                  />
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "#9ca3af" }}
                  >
                    Size
                  </span>
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#1f2937" }}
                >
                  {recording.fileSizeKB < 1024
                    ? `${recording.fileSizeKB} KB`
                    : `${(recording.fileSizeKB / 1024).toFixed(1)} MB`}
                </p>
              </div>

              {/* Bits per Sample */}
              <div
                className="rounded-md p-2.5"
                style={{ backgroundColor: "#fff" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity
                    className="h-3.5 w-3.5"
                    style={{ color: "#e97b2c" }}
                  />
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "#9ca3af" }}
                  >
                    Bit Depth
                  </span>
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#1f2937" }}
                >
                  16-bit
                  <span
                    className="text-xs font-normal"
                    style={{ color: "#9ca3af" }}
                  >
                    {" "}
                    (encoded)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Analyze Button */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (recording) URL.revokeObjectURL(recording.url);
                setRecording(null);
                setMicState("idle");
                setDuration(0);
                setIsPlaying(false);
                playbackAudioRef.current = null;
              }}
            >
              Re-record
            </Button>
            <button
              onClick={analyzeRecording}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "#e97b2c",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(233, 123, 44, 0.25)",
              }}
            >
              Analyze Recording
            </button>
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {micState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: "#fef3e2",
                  border: "3px solid #e97b2c",
                  color: "#e97b2c",
                  boxShadow: "0 4px 12px rgba(233, 123, 44, 0.2)",
                }}
              >
                <Mic className="h-8 w-8" />
              </button>
              <p
                className="mt-3 text-sm font-medium"
                style={{ color: "#1f2937" }}
              >
                Click to start recording
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: "#9ca3af" }}
              >
                Max {MAX_RECORD_SECONDS} seconds · Microphone capture
              </p>
            </motion.div>
          )}

          {isRecording && (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 animate-pulse"
                style={{
                  backgroundColor: "#fef2f2",
                  border: "3px solid #dc2626",
                  color: "#dc2626",
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)",
                }}
              >
                <Square className="h-7 w-7" />
              </button>
              <p
                className="mt-3 text-sm font-bold"
                style={{ color: "#dc2626" }}
              >
                Recording
              </p>
              <p
                className="mt-1 text-2xl font-mono tabular-nums"
                style={{ color: "#1f2937" }}
              >
                {elapsed}s
              </p>
              <div
                className="mt-2 h-1 rounded-full overflow-hidden"
                style={{ width: 160, backgroundColor: "#fee2e2" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${(duration / MAX_RECORD_SECONDS) * 100}%`,
                    backgroundColor: "#dc2626",
                  }}
                />
              </div>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Loader2
                className="h-10 w-10 mx-auto animate-spin"
                style={{ color: "#e97b2c" }}
              />
              <p
                className="mt-3 text-sm font-medium"
                style={{ color: "#1f2937" }}
              >
                Analyzing recording…
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: "#9ca3af" }}
              >
                Running FFT, PSD, spectrogram, and ML classification
              </p>
            </motion.div>
          )}

          {micState === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <CheckCircle2
                className="h-10 w-10 mx-auto"
                style={{ color: "#16a34a" }}
              />
              <p
                className="mt-3 text-sm font-medium"
                style={{ color: "#16a34a" }}
              >
                Analysis complete — redirecting…
              </p>
            </motion.div>
          )}

          {micState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <AlertCircle
                className="h-8 w-8 mx-auto mb-2"
                style={{ color: "#dc2626" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "#dc2626" }}
              >
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setMicState("idle");
                  setError(null);
                  setDuration(0);
                  setRecording(null);
                  setIsPlaying(false);
                  playbackAudioRef.current = null;
                }}
              >
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      {micState === "idle" && (
        <div
          className="mt-8 rounded-lg p-4"
          style={{
            backgroundColor: "#fffdf8",
            border: "1px solid #e8ddd0",
          }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "#9ca3af" }}
          >
            How it works
          </h3>
          <ul
            className="space-y-1.5 text-xs"
            style={{ color: "#6b7280" }}
          >
            <li className="flex items-start gap-2">
              <span style={{ color: "#e97b2c" }}>1.</span>
              Click the microphone button to grant access
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#e97b2c" }}>2.</span>
              Speak, play audio, or capture ambient sound (up to{" "}
              {MAX_RECORD_SECONDS}s)
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#e97b2c" }}>3.</span>
              Review your recording — play it back and check audio format
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#e97b2c" }}>4.</span>
              Click "Analyze Recording" for FFT, PSD, spectrogram, and ML
              results
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function audioBufferToWav(buf: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buf.sampleRate;
  const length = buf.length;
  const bytesPerSample = 2;
  const dataSize = length * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(
    28,
    sampleRate * numChannels * bytesPerSample,
    true
  );
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const samples = buf.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(
      offset,
      s < 0 ? s * 0x8000 : s * 0x7fff,
      true
    );
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
