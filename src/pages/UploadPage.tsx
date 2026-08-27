import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileAudio,
  Radio,
  X,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { uploadAndAnalyze, type UploadError } from "@/lib/api";
import { validateFile, formatBytes } from "@/lib/upload-utils";

// ─── Upload Flow States ────────────────────────────────────────────────
type FlowState =
  | "idle"          // No file selected
  | "selected"      // File selected, validated, ready to upload
  | "uploading"     // File is being uploaded
  | "uploaded"      // Upload complete, starting analysis
  | "analyzing"     // Backend is analyzing the signal
  | "complete"      // Analysis complete, navigating to dashboard
  | "error";        // Something went wrong

interface UploadFileState {
  file: File;
  format: "WAV" | "IQ";
}

// ─── Component ─────────────────────────────────────────────────────────

export function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // File state
  const [uploadFile_, setUploadFile] = useState<UploadFileState | null>(null);
  const [dragging, setDragging] = useState(false);

  // Upload flow
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ─── File Handling ───────────────────────────────────────────────

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      const result = validateFile(file);

      if (!result.valid) {
        setError(result.error);
        setFlowState("error");
        return;
      }

      setUploadFile({ file, format: result.format! });
      setFlowState("selected");
    },
    [],
  );

  // ─── Drag & Drop ────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ─── File Input ─────────────────────────────────────────────────

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so re-selecting same file triggers change
      e.target.value = "";
    },
    [handleFile],
  );

  // ─── Upload & Analyze ──────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!uploadFile_ || flowState === "uploading") return;

    setError(null);
    setProgress(0);
    setFlowState("uploading");

    try {
      // Single-step: upload + analyze in one request to the backend
      const analysisResult = await uploadAndAnalyze(
        uploadFile_.file,
        uploadFile_.format,
        undefined, // sampleRate — auto-detected for WAV, user can set for IQ
        undefined, // iqDtype — defaults to "float32"
        (loaded, total) => {
          setProgress(total > 0 ? Math.round((loaded / total) * 100) : 0);
        },
      );

      setProgress(100);
      setFlowState("complete");

      // Navigate to dashboard with the analysis result
      setTimeout(() => {
        navigate("/dashboard", {
          state: {
            analysisResult,
            fileName: uploadFile_.file.name,
            format: uploadFile_.format,
          },
        });
      }, 500);
    } catch (err) {
      if (err instanceof Error && err.name === "UploadError") {
        const uploadErr = err as UploadError;
        setError(uploadErr.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setFlowState("error");
    }
  }, [uploadFile_, flowState, navigate]);

  // ─── Clear ─────────────────────────────────────────────────────

  const clearFile = useCallback(() => {
    abortRef.current?.abort();
    setUploadFile(null);
    setProgress(0);
    setError(null);
    setFlowState("idle");
  }, []);

  // ─── Derived state ─────────────────────────────────────────────

  const isUploading = flowState === "uploading";
  const isProcessing =
    flowState === "uploaded" || flowState === "analyzing" || flowState === "complete";
  const isActive = isUploading || isProcessing;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-surface-900 sm:text-3xl">
          Upload Signal File
        </h1>
        <p className="mt-2 text-surface-500">
          Upload a .WAV or .IQ capture file to begin AI-powered signal analysis.
        </p>
      </motion.div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-8"
      >
        <Card>
          <CardContent className="p-0">
            <div
              onDragOver={!isActive ? onDragOver : undefined}
              onDragLeave={!isActive ? onDragLeave : undefined}
              onDrop={!isActive ? onDrop : undefined}
              onClick={
                !uploadFile_ && !isActive
                  ? () => inputRef.current?.click()
                  : undefined
              }
              className={`
                relative rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200
                ${
                  isActive
                    ? "cursor-default border-signal-200 bg-signal-50/30"
                    : dragging
                      ? "cursor-copy border-signal-500 bg-signal-50"
                      : flowState === "error"
                        ? "cursor-pointer border-red-300 bg-red-50/30 hover:border-red-400"
                        : uploadFile_
                          ? "cursor-default border-neon-400 bg-neon-50/30"
                          : "cursor-pointer border-surface-300 bg-white hover:border-signal-400 hover:bg-signal-50/50"
                }
              `}
            >
              {/* Hidden file input */}
              <input
                ref={inputRef}
                type="file"
                accept=".wav,.iq,.raw,.cf32,.cs16"
                onChange={onInputChange}
                className="hidden"
                disabled={isActive}
              />

              <AnimatePresence mode="wait">
                {/* ─── Empty State ──────────────────────────────────── */}
                {!uploadFile_ && flowState === "idle" && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                        dragging
                          ? "bg-signal-100 text-signal-600"
                          : "bg-surface-100 text-surface-400"
                      }`}
                    >
                      <Upload className="h-8 w-8" />
                    </div>
                    <p className="text-base font-medium text-surface-700">
                      {dragging
                        ? "Drop your file here"
                        : "Drag & drop your signal file"}
                    </p>
                    <p className="mt-1 text-sm text-surface-400">
                      or click to browse
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <Badge variant="secondary" className="gap-1">
                        <FileAudio className="h-3 w-3" /> WAV
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Radio className="h-3 w-3" /> IQ
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-surface-400">
                      Max file size: 500 MB
                    </p>
                  </motion.div>
                )}

                {/* ─── Error State ─────────────────────────────────── */}
                {flowState === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <p className="text-base font-medium text-red-700">
                      Upload Error
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-red-500">
                      {error}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                    >
                      Try Again
                    </Button>
                  </motion.div>
                )}

                {/* ─── File Selected ────────────────────────────────── */}
                {uploadFile_ && !isActive && (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-100 text-signal-600">
                      {uploadFile_.format === "WAV" ? (
                        <FileAudio className="h-8 w-8" />
                      ) : (
                        <Radio className="h-8 w-8" />
                      )}
                    </div>
                    <p className="text-base font-medium text-surface-900">
                      {uploadFile_.file.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-surface-500">
                      <Badge variant="default" className="text-[10px]">
                        {uploadFile_.format}
                      </Badge>
                      <span>{formatBytes(uploadFile_.file.size)}</span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button onClick={handleUpload} size="lg">
                        Begin Analysis
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ─── Uploading State ──────────────────────────────── */}
                {isUploading && (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-100 text-signal-600">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                    <p className="text-base font-medium text-surface-900">
                      Uploading {uploadFile_?.file.name}
                    </p>
                    <div className="mt-4 w-full max-w-xs">
                      <Progress value={progress} className="h-2" />
                      <p className="mt-2 text-center text-xs text-surface-500">
                        {progress}% — {formatBytes(uploadFile_!.file.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-surface-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                    >
                      Cancel
                    </Button>
                  </motion.div>
                )}

                {/* ─── Processing State ─────────────────────────────── */}
                {isProcessing && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neon-100 text-neon-600">
                      {flowState === "complete" ? (
                        <CheckCircle2 className="h-8 w-8" />
                      ) : (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      )}
                    </div>
                    <p className="text-base font-medium text-surface-900">
                      {flowState === "uploaded" && "Upload complete — starting analysis…"}
                      {flowState === "analyzing" && "Analyzing signal…"}
                      {flowState === "complete" && "Analysis complete!"}
                    </p>
                    <div className="mt-4 w-full max-w-xs">
                      <Progress value={flowState === "complete" ? 100 : 100} className="h-2" />
                      <p className="mt-2 text-center text-xs text-surface-500">
                        {flowState === "complete"
                          ? "Redirecting to dashboard…"
                          : "This may take a few moments for large files"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Inline error banner (for validation errors while file is still shown) */}
        {error && flowState !== "error" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Info cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileAudio className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">
                    WAV Files
                  </h3>
                  <p className="mt-0.5 text-xs text-surface-500 leading-relaxed">
                    Standard audio format from SDR receivers. Supports 8-bit, 16-bit,
                    24-bit, and 32-bit float PCM with any sample rate.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">.wav</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">
                    IQ Files
                  </h3>
                  <p className="mt-0.5 text-xs text-surface-500 leading-relaxed">
                    Complex baseband captures. Contains in-phase and quadrature
                    data for full signal analysis.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[".iq", ".raw", ".cf32", ".cs16"].map((ext) => (
                      <Badge key={ext} variant="outline" className="text-[10px]">
                        {ext}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Validation / Requirements summary */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Shield className="h-3.5 w-3.5 text-surface-400" />
            <span>File extension &amp; size validated</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Zap className="h-3.5 w-3.5 text-surface-400" />
            <span>Max upload: 500 MB</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <FileAudio className="h-3.5 w-3.5 text-surface-400" />
            <span>WAV, IQ (.iq .raw .cf32 .cs16)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
