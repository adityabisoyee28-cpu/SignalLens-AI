import type { SignalMetrics } from "@/types/signal";
import { formatFrequency } from "@/lib/utils";

interface FeatureInspectorProps {
  metrics: SignalMetrics;
}

export function FeatureInspector({ metrics }: FeatureInspectorProps) {
  const rows = [
    ["Duration", `${metrics.duration.toFixed(3)} s`],
    ["Sample Rate", formatFrequency(metrics.sampleRate)],
    ["RMS", metrics.rms.toFixed(6)],
    ["Peak", metrics.peak.toFixed(6)],
    ["Dominant Frequency", formatFrequency(metrics.dominantFrequency)],
    ["Bandwidth", formatFrequency(metrics.bandwidth)],
    ["SNR", metrics.snr != null ? `${metrics.snr.toFixed(1)} dB` : "N/A"],
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-bold mono" style={{ color: "var(--color-signal-500)" }}>07</span>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-surface-500)" }}>Extracted Features</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-surface-500)" }}>Feature</th>
            <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-surface-500)" }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={label} style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
              <td className="py-1.5" style={{ color: "var(--color-surface-400)" }}>{label}</td>
              <td className="py-1.5 text-right mono" style={{ color: "#e2e8f0" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
