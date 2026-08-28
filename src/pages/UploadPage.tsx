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
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { uploadAndAnalyze, type UploadError } from "@/lib/api";
import { validateFile, formatBytes } from "@/lib/upload-utils";
import { uploadSignalFile } from "@/lib/storage";

type FlowState =
  | "idle"
  | "selected"
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "complete"
  | "error";

interface UploadFileState {
  file: File;
  format: "WAV" | "IQ";
}

const processingStages = [
  "Uploading",
  "Validating",
  "DSP Analysis",
  "Feature Extraction",
  "AI Analysis",
  "Complete",
];

export function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [uploadFile_, setUploadFile] = useState<UploadFileState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(0);

  const handleFile = useCallback((file: File) => {
    setError(null);
    const result = validateFile(file);
    if (!result.valid) {
      setError(result.error);
      setFlowState("error");
      return;
    }
    setUploadFile({ file, format: result.format! });
    setFlowState("selected");
  }, []);

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

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  const handleUpload = useCallback(async () => {
    if (!uploadFile_ || flowState === "uploading") return;

    setError(null);
    setProgress(0);
    setCurrentStage(0);
    setFlowState("uploading");

    // Simulate stage progression
    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => Math.min(prev + 1, processingStages.length - 2));
    }, 800);

    try {
      const analysisResult = await uploadAndAnalyze(
        uploadFile_.file,
        uploadFile_.format,
        undefined,
        undefined,
        (loaded, total) => {
          setProgress(total > 0 ? Math.round((loaded / total) * 100) : 0);
        },
      );

      clearInterval(stageTimer);
      setCurrentStage(processingStages.length - 1);
      setProgress(100);
      setFlowState("complete");

      uploadSignalFile(uploadFile_.file).then(({ path, error: storageErr }) => {
        if (storageErr && storageErr.code !== "NOT_CONFIGURED") {
          console.warn("Supabase Storage upload failed:", storageErr.message);
        } else if (path) {
          console.log("File stored in Supabase:", path);
        }
      });

      setTimeout(() => {
        navigate("/dashboard", {
          state: {
            analysisResult,
            fileName: uploadFile_.file.name,
            format: uploadFile_.format,
          },
        });
      }, 600);
    } catch (err) {
      clearInterval(stageTimer);
      if (err instanceof Error && err.name === "UploadError") {
        setError((err as UploadError).message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setFlowState("error");
    }
  }, [uploadFile_, flowState, navigate]);

  const clearFile = useCallback(() => {
    abortRef.current?.abort();
    setUploadFile(null);
    setProgress(0);
    setError(null);
    setCurrentStage(0);
    setFlowState("idle");
  }, []);

  const isUploading = flowState === "uploading";
  const isProcessing =
    flowState === "uploaded" || flowState === "analyzing" || flowState === "complete";
  const isActive = isUploading || isProcessing;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Analyze Signal
        </h1>
        <p className="mt-2 text-surface-400 text-sm">
          Upload a .WAV or .IQ capture file to begin AI-powered signal analysis.
        </p>
      </motion.div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-6"
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
                relative rounded-xl border-2 border-dashed p-10 sm:p-14 text-center transition-all duration-200
                ${
                  isActive
                    ? "cursor-default border-signal-500/20 bg-signal-600/[0.04]"
                    : dragging
                      ? "cursor-copy border-signal-400 bg-signal-600/[0.08]"
                      : flowState === "error"
                        ? "cursor-pointer border-danger-500/30 bg-danger-500/[0.04] hover:border-danger-500/40"
                        : uploadFile_
                          ? "cursor-default border-neon-500/30 bg-neon-600/[0.04]"
                          : "cursor-pointer border-white/[0.08] bg-surface-900/40 hover:border-signal-500/30 hover:bg-signal-600/[0.04]"
                }
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".wav,.iq,.raw,.cf32,.cs16"
                onChange={onInputChange}
                className="hidden"
                disabled={isActive}
              />

              <AnimatePresence mode="wait">
                {/* Empty state */}
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
                          ? "bg-signal-600/20 text-signal-400"
                          : "bg-surface-800 text-surface-500"
                      }`}
                    >
                      <Upload className="h-8 w-8" />
                    </div>
                    <p className="text-base font-medium text-white">
                      {dragging ? "Drop your file here" : "Drop your signal file"}
                    </p>
                    <p className="mt-1 text-sm text-surface-500">
                      or click to browse files
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <Badge variant="secondary" className="gap-1">
                        <FileAudio className="h-3 w-3" /> WAV
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Radio className="h-3 w-3" /> IQ
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-surface-500/60">
                      Max file size: 500 MB
                    </p>
                  </motion.div>
                )}

                {/* Error */}
                {flowState === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-500/15 text-danger-500">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <p className="text-base font-medium text-danger-500">
                      Upload Error
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-danger-500/70">
                      {error}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    >
                      Try Again
                    </Button>
                  </motion.div>
                )}

                {/* File selected */}
                {uploadFile_ && !isActive && (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-600/15 text-signal-400">
                      {uploadFile_.format === "WAV" ? (
                        <FileAudio className="h-8 w-8" />
                      ) : (
                        <Radio className="h-8 w-8" />
                      )}
                    </div>
                    <p className="text-base font-medium text-white">
                      {uploadFile_.file.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-surface-400">
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
                        onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Uploading */}
                {isUploading && (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-600/15 text-signal-400">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                    <p className="text-base font-medium text-white">
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
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    >
                      Cancel
                    </Button>
                  </motion.div>
                )}

                {/* Processing stages */}
                {isProcessing && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neon-600/15 text-neon-400">
                      {flowState === "complete" ? (
                        <CheckCircle2 className="h-8 w-8" />
                      ) : (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      )}
                    </div>
                    <p className="text-base font-medium text-white">
                      {flowState === "complete"
                        ? "Analysis Complete"
                        : processingStages[currentStage] + "…"}
                    </p>

                    {/* Stage indicators */}
                    <div className="mt-5 flex items-center gap-1">
                      {processingStages.map((stage, idx) => (
                        <div
                          key={stage}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx < currentStage
                              ? "bg-neon-500 w-6"
                              : idx === currentStage
                                ? "bg-signal-400 w-8"
                                : "bg-surface-700 w-4"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="mt-4 w-full max-w-xs">
                      <Progress value={flowState === "complete" ? 100 : progress} className="h-1.5" />
                      <p className="mt-2 text-center text-xs text-surface-500">
                        {flowState === "complete"
                          ? "Redirecting to dashboard…"
                          : "Processing signal data"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Inline error */}
        {error && flowState !== "error" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 rounded-lg border border-danger-500/20 bg-danger-500/[0.06] p-3 text-sm text-danger-500"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Info cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card className="!bg-surface-900/60">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-600/10 text-signal-400">
                  <FileAudio className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">WAV Files</h3>
                  <p className="mt-0.5 text-xs text-surface-400 leading-relaxed">
                    Standard audio from SDR receivers. 8-bit, 16-bit, 24-bit, 32-bit float PCM.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">.wav</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="!bg-surface-900/60">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-400">
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">IQ Files</h3>
                  <p className="mt-0.5 text-xs text-surface-400 leading-relaxed">
                    Complex baseband captures with in-phase and quadrature data.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[".iq", ".raw", ".cf32", ".cs16"].map((ext) => (
                      <Badge key={ext} variant="outline" className="text-[10px]">{ext}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requirements */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Shield className="h-3.5 w-3.5 text-surface-500/60" />
            <span>File validation</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Zap className="h-3.5 w-3.5 text-surface-500/60" />
            <span>Max 500 MB</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Cpu className="h-3.5 w-3.5 text-surface-500/60" />
            <span>WAV, IQ (.iq .raw .cf32 .cs16)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
