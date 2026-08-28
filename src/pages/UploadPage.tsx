import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileAudio, Radio, X, AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadAndAnalyze } from "@/lib/api";
import { validateFile, formatBytes } from "@/lib/upload-utils";
import { uploadSignalFile } from "@/lib/storage";

type FlowState = "idle" | "selected" | "uploading" | "uploaded" | "analyzing" | "complete" | "error";

const stages = ["Uploading", "Validating", "DSP", "Features", "Classification", "Complete"];

export function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file_, setFile] = useState<{ file: File; format: "WAV" | "IQ" } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [flow, setFlow] = useState<FlowState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);

  const handleFile = useCallback((f: File) => {
    setError(null);
    const r = validateFile(f);
    if (!r.valid) { setError(r.error); setFlow("error"); return; }
    setFile({ file: f, format: r.format! });
    setFlow("selected");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleUpload = useCallback(async () => {
    if (!file_ || flow === "uploading") return;
    setError(null); setProgress(0); setStage(0); setFlow("uploading");
    const timer = setInterval(() => setStage((p) => Math.min(p + 1, stages.length - 2)), 800);
    try {
      const result = await uploadAndAnalyze(file_.file, file_.format, undefined, undefined,
        (l, t) => setProgress(t > 0 ? Math.round((l / t) * 100) : 0));
      clearInterval(timer); setStage(stages.length - 1); setProgress(100); setFlow("complete");
      uploadSignalFile(file_.file).then(({ path, error: e }) => {
        if (e && e.code !== "NOT_CONFIGURED") console.warn("Storage:", e.message);
        else if (path) console.log("Stored:", path);
      });
      setTimeout(() => navigate("/dashboard", { state: { analysisResult: result, fileName: file_.file.name, format: file_.format } }), 600);
    } catch (err) {
      clearInterval(timer);
      setError(err instanceof Error ? err.message : "Unexpected error");
      setFlow("error");
    }
  }, [file_, flow, navigate]);

  const clear = useCallback(() => { setFile(null); setProgress(0); setError(null); setStage(0); setFlow("idle"); }, []);
  const active = flow === "uploading" || flow === "uploaded" || flow === "analyzing" || flow === "complete";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 lg:px-8">
      <h1 className="text-xl font-bold" style={{ color: "#e2e8f0" }}>Analyze Signal</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--color-surface-400)" }}>
        Upload a .WAV or .IQ capture to begin analysis.
      </p>

      <div className="mt-5">
        <div
          onDragOver={!active ? (e) => { e.preventDefault(); setDragging(true); } : undefined}
          onDragLeave={!active ? (e) => { e.preventDefault(); setDragging(false); } : undefined}
          onDrop={!active ? onDrop : undefined}
          onClick={!file_ && !active ? () => inputRef.current?.click() : undefined}
          className="rounded-lg border-2 border-dashed p-12 text-center transition-colors"
          style={{
            borderColor: dragging ? "rgba(59,142,255,0.5)" : active ? "rgba(59,142,255,0.1)" : file_ ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)",
            cursor: active ? "default" : "pointer",
          }}
        >
          <input ref={inputRef} type="file" accept=".wav,.iq,.raw,.cf32,.cs16" className="hidden" disabled={active}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          <AnimatePresence mode="wait">
            {!file_ && flow === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Upload className="h-7 w-7 mx-auto mb-3" style={{ color: dragging ? "var(--color-signal-500)" : "var(--color-surface-500)" }} />
                <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                  {dragging ? "Drop file here" : "Drop signal file or click to browse"}
                </p>
                <p className="mt-2 text-xs" style={{ color: "var(--color-surface-500)" }}>
                  WAV, IQ (.iq .raw .cf32 .cs16) — max 500 MB
                </p>
              </motion.div>
            )}

            {flow === "error" && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AlertCircle className="h-7 w-7 mx-auto mb-3" style={{ color: "var(--color-danger-500)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--color-danger-500)" }}>{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={clear}>Try Again</Button>
              </motion.div>
            )}

            {file_ && !active && (
              <motion.div key="selected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {file_.format === "WAV" ? <FileAudio className="h-7 w-7 mx-auto mb-3" style={{ color: "var(--color-signal-500)" }} />
                  : <Radio className="h-7 w-7 mx-auto mb-3" style={{ color: "var(--color-signal-500)" }} />}
                <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>{file_.file.name}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-surface-400)" }}>{file_.format} / {formatBytes(file_.file.size)}</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button onClick={handleUpload}>Begin Analysis <ArrowRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); clear(); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {flow === "uploading" && (
              <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="h-7 w-7 mx-auto mb-3 animate-spin" style={{ color: "var(--color-signal-500)" }} />
                <p className="text-sm" style={{ color: "#e2e8f0" }}>Uploading {file_?.file.name}</p>
                <div className="mt-3 max-w-xs mx-auto">
                  <Progress value={progress} className="h-1" />
                  <p className="mt-1 text-center text-xs" style={{ color: "var(--color-surface-500)" }}>{progress}%</p>
                </div>
              </motion.div>
            )}

            {(flow === "uploaded" || flow === "analyzing" || flow === "complete") && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {flow === "complete" ? <CheckCircle2 className="h-7 w-7 mx-auto mb-3" style={{ color: "var(--color-neon-500)" }} />
                  : <Loader2 className="h-7 w-7 mx-auto mb-3 animate-spin" style={{ color: "var(--color-signal-500)" }} />}
                <p className="text-sm" style={{ color: "#e2e8f0" }}>
                  {flow === "complete" ? "Complete" : stages[stage] + "…"}
                </p>
                <div className="mt-3 flex items-center justify-center gap-1">
                  {stages.map((_, i) => (
                    <div key={i} className="h-0.5 rounded-full transition-all duration-300"
                      style={{ width: i < stage ? "12px" : i === stage ? "20px" : "8px", backgroundColor: i < stage ? "var(--color-neon-500)" : i === stage ? "var(--color-signal-500)" : "rgba(255,255,255,0.08)" }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
