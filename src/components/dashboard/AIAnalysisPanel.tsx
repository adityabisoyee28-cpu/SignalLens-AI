import type { AIAnalysis } from "@/types/signal";

interface AIAnalysisPanelProps {
  analysis: AIAnalysis;
}

export function AIAnalysisPanel({ analysis }: AIAnalysisPanelProps) {
  const { classification, anomalyScore, detectedCharacteristics } = analysis;
  const confPct = Math.round(classification.confidence * 100);
  const confColor = confPct >= 80 ? "#16a34a" : confPct >= 50 ? "#d97706" : "#dc2626";
  

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-bold mono" style={{ color: "#e97b2c" }}>06</span>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#9ca3af" }}>Signal Classification</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "#f0ebe4" }} />
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#9ca3af" }}>Result</p>
          <p className="mt-1 text-xl font-bold" style={{ color: "#1f2937" }}>{classification.type}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#f0ebe4" }}>
              <div className="h-full rounded-full" style={{ width: `${confPct}%`, backgroundColor: confColor }} />
            </div>
            <span className="text-xs font-bold mono" style={{ color: "#1f2937" }}>{confPct}%</span>
          </div>
        </div>

        {anomalyScore != null && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#9ca3af" }}>Anomaly Score</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold mono" style={{ color: "#1f2937" }}>{Math.round(anomalyScore * 100)}</span>
              <span className="text-xs" style={{ color: "#6b7280" }}>
                {anomalyScore < 0.3 ? "Low" : anomalyScore < 0.7 ? "Medium" : "High"}
              </span>
            </div>
          </div>
        )}

        {classification.characteristics.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#9ca3af" }}>Characteristics</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {classification.characteristics.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: "#fff7ed", color: "#b85812" }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {detectedCharacteristics.length > 0 && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#9ca3af" }}>Properties</p>
            <ul className="mt-1 space-y-0.5">
              {detectedCharacteristics.map((c) => (
                <li key={c} className="text-xs flex items-center gap-1.5" style={{ color: "#4b5563" }}>
                  <span className="h-0.5 w-0.5 rounded-full" style={{ backgroundColor: "#16a34a" }} />
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
