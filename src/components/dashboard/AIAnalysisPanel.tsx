import type { AIAnalysis } from "@/types/signal";

interface AIAnalysisPanelProps {
  analysis: AIAnalysis;
}

export function AIAnalysisPanel({ analysis }: AIAnalysisPanelProps) {
  const { classification, anomalyScore, detectedCharacteristics } = analysis;
  const confPct = Math.round(classification.confidence * 100);
  const confColor = confPct >= 80 ? "var(--color-neon-500)" : confPct >= 50 ? "var(--color-warning-500)" : "var(--color-danger-500)";

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-bold mono" style={{ color: "var(--color-signal-500)" }}>06</span>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-surface-500)" }}>Signal Classification</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
      </div>

      <div className="space-y-4">
        {/* Classification result */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-surface-500)" }}>Result</p>
          <p className="mt-1 text-xl font-bold" style={{ color: "#e2e8f0" }}>{classification.type}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${confPct}%`, backgroundColor: confColor }} />
            </div>
            <span className="text-xs font-bold mono" style={{ color: "#e2e8f0" }}>{confPct}%</span>
          </div>
        </div>

        {/* Anomaly */}
        {anomalyScore != null && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-surface-500)" }}>Anomaly Score</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold mono" style={{ color: "#e2e8f0" }}>{Math.round(anomalyScore * 100)}</span>
              <span className="text-xs" style={{ color: "var(--color-surface-400)" }}>
                {anomalyScore < 0.3 ? "Low" : anomalyScore < 0.7 ? "Medium" : "High"}
              </span>
            </div>
          </div>
        )}

        {/* Characteristics */}
        {classification.characteristics.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-surface-500)" }}>Characteristics</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {classification.characteristics.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: "rgba(59,142,255,0.06)", color: "var(--color-signal-500)" }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Properties */}
        {detectedCharacteristics.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-surface-500)" }}>Properties</p>
            <ul className="mt-1 space-y-0.5">
              {detectedCharacteristics.map((c) => (
                <li key={c} className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-surface-300)" }}>
                  <span className="h-0.5 w-0.5 rounded-full" style={{ backgroundColor: "var(--color-neon-500)" }} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
