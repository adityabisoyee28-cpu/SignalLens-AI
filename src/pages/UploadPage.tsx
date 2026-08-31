import { useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileAudio, Radio, Mic, X, AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
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
  const [file_, setFile] = useState<{ file: File; format: "WAV" | "IQ" | "OGG" } | null>(null);
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
      <h1 className="text-xl font-bold" style={{ color: "#1f2937" }}>Analyze Signal</h1>
      <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
        Upload a .WAV, .OGG, or .IQ capture to begin analysis.
      </p>

      <div className="mt-5">
        <div
          onDragOver={!active ? (e) => { e.preventDefault(); setDragging(true); } : undefined}
          onDragLeave={!active ? (e) => { e.preventDefault(); setDragging(false); } : undefined}
          onDrop={!active ? onDrop : undefined}
          onClick={!file_ && !active ? () => inputRef.current?.click() : undefined}
          className="rounded-lg border-2 border-dashed p-12 text-center transition-colors"
          style={{
            borderColor: dragging ? "#e97b2c" : active ? "#fde8cc" : file_ ? "#bbf7d0" : "#e8ddd0",
            backgroundColor: dragging ? "#fff8f0" : active ? "#fffcf7" : "#ffffff",
            cursor: active ? "default" : "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <input ref={inputRef} type="file" accept=".wav,.iq,.raw,.cf32,.cs16" className="hidden" disabled={active}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          <AnimatePresence mode="wait">
            {!file_ && flow === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Upload className="h-7 w-7 mx-auto mb-3" style={{ color: dragging ? "#e97b2c" : "#9ca3af" }} />
                <p className="text-sm font-medium" style={{ color: "#1f2937" }}>
                  {dragging ? "Drop file here" : "Drop signal file or click to browse"}
                </p>
                <p className="mt-2 text-xs" style={{ color: "#9ca3af" }}>
                  WAV, OGG, IQ (.iq .raw .cf32 .cs16) — max 500 MB
                </p>
                <Link to="/live-mic" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: "#e97b2c" }} onClick={(e) => e.stopPropagation()}>
                  <Mic className="h-3.5 w-3.5" /> Or use live microphone
                </Link>
              </motion.div>
            )}

            {flow === "error" && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AlertCircle className="h-7 w-7 mx-auto mb-3" style={{ color: "#dc2626" }} />
                <p className="text-sm font-medium" style={{ color: "#dc2626" }}>{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={clear}>Try Again</Button>
              </motion.div>
            )}

            {file_ && !active && (
              <motion.div key="selected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {file_.format === "WAV" ? <FileAudio className="h-7 w-7 mx-auto mb-3" style={{ color: "#e97b2c" }} />
                  : <Radio className="h-7 w-7 mx-auto mb-3" style={{ color: "#e97b2c" }} />}
                <p className="text-sm font-medium" style={{ color: "#1f2937" }}>{file_.file.name}</p>
                <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>{file_.format} / {formatBytes(file_.file.size)}</p>
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
                <Loader2 className="h-7 w-7 mx-auto mb-3 animate-spin" style={{ color: "#e97b2c" }} />
                <p className="text-sm" style={{ color: "#1f2937" }}>Uploading {file_?.file.name}</p>
                <div className="mt-3 max-w-xs mx-auto">
                  <Progress value={progress} className="h-1" />
                  <p className="mt-1 text-center text-xs" style={{ color: "#9ca3af" }}>{progress}%</p>
                </div>
              </motion.div>
            )}

            {(flow === "uploaded" || flow === "analyzing" || flow === "complete") && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {flow === "complete" ? <CheckCircle2 className="h-7 w-7 mx-auto mb-3" style={{ color: "#16a34a" }} />
                  : <Loader2 className="h-7 w-7 mx-auto mb-3 animate-spin" style={{ color: "#e97b2c" }} />}
                <p className="text-sm" style={{ color: "#1f2937" }}>
                  {flow === "complete" ? "Complete" : stages[stage] + "…"}
                </p>
                <div className="mt-3 flex items-center justify-center gap-1">
                  {stages.map((_, i) => (
                    <div key={i} className="h-0.5 rounded-full transition-all duration-300"
                      style={{ width: i < stage ? "12px" : i === stage ? "20px" : "8px", backgroundColor: i < stage ? "#16a34a" : i === stage ? "#e97b2c" : "#e8ddd0" }} />
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
