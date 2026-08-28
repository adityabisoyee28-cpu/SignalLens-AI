import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Upload, FileAudio, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricsPanel } from "@/components/dashboard/MetricsPanel";
import { VisualizationPanel } from "@/components/dashboard/VisualizationPanel";
import { AIAnalysisPanel } from "@/components/dashboard/AIAnalysisPanel";
import { ReportPanel } from "@/components/dashboard/ReportPanel";
import { FeatureInspector } from "@/components/dashboard/FeatureInspector";

import type { AnalysisResult } from "@/types/signal";

export function DashboardPage() {
  const location = useLocation();
  const state = location.state as { analysisResult?: AnalysisResult; fileName?: string; format?: string } | null;

  const result: AnalysisResult | null = useMemo(() => {
    if (state?.analysisResult) {
      const r = state.analysisResult;
      if (r.analyzedAt && typeof r.analyzedAt === "string") r.analyzedAt = new Date(r.analyzedAt);
      return r;
    }
    return null;
  }, [state]);

  if (!result) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Radio className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--color-surface-500)", opacity: 0.3 }} />
        <h1 className="text-lg font-bold" style={{ color: "#e2e8f0" }}>No Analysis Data</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-surface-400)" }}>Upload a signal file to begin.</p>
        <Link to="/upload" className="mt-4 inline-block"><Button size="sm">Go to Upload</Button></Link>
      </div>
    );
  }

  const isIQ = result.file.format === "IQ";


  return (
    <div className="max-w-7xl mx-auto px-4 py-5 lg:px-8">
      {/* Signal header — the key information strip */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest mb-1" style={{ color: "var(--color-surface-500)" }}>
            Signal Analysis
          </p>
          <div className="flex items-center gap-2">
            {isIQ ? <Radio className="h-4 w-4" style={{ color: "var(--color-surface-400)" }} />
              : <FileAudio className="h-4 w-4" style={{ color: "var(--color-surface-400)" }} />}
            <h1 className="text-lg font-bold" style={{ color: "#e2e8f0" }}>{result.file.name}</h1>
          </div>
          <p className="mt-0.5 text-xs mono" style={{ color: "var(--color-surface-400)" }}>
            {result.file.format} / {formatFrequency(result.metrics.sampleRate)} / {result.metrics.duration.toFixed(3)} s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "var(--color-neon-500)" }}>
            Analysis Complete
          </span>
          <Link to="/upload"><Button variant="outline" size="sm"><Upload className="h-3 w-3" /> New</Button></Link>
        </div>
      </div>

      {/* Metrics — horizontal strip, not cards */}
      <div className="py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <MetricsPanel metrics={result.metrics} />
      </div>

      {/* Charts — main content, large */}
      <div className="py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <VisualizationPanel data={result.visualization} showConstellation={isIQ} />
      </div>

      {/* Classification + Features — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="pr-0 lg:pr-6 pb-4 lg:pb-0" style={{ borderRight: "none", ...(typeof window !== "undefined" && window.innerWidth >= 1024 ? { borderRight: "1px solid rgba(255,255,255,0.04)" } : {}) }}>
          <AIAnalysisPanel analysis={result.aiAnalysis} />
        </div>
        <div className="pl-0 lg:pl-6">
          <FeatureInspector metrics={result.metrics} />
        </div>
      </div>

      {/* Report */}
      <div className="py-4">
        <ReportPanel result={result} />
      </div>
    </div>
  );
}

function formatFrequency(hz: number): string {
  if (hz < 1000) return `${hz.toFixed(1)} Hz`;
  if (hz < 1_000_000) return `${(hz / 1000).toFixed(2)} kHz`;
  return `${(hz / 1_000_000).toFixed(2)} MHz`;
}
