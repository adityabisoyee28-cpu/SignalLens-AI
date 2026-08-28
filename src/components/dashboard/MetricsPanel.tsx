import type { SignalMetrics } from "@/types/signal";
import { formatFrequency } from "@/lib/utils";

interface MetricsPanelProps {
  metrics: SignalMetrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const durationStr = metrics.duration < 1
    ? `${(metrics.duration * 1000).toFixed(1)} ms`
    : `${metrics.duration.toFixed(3)} s`;

  const items = [
    { label: "Duration", value: durationStr },
    { label: "Sample Rate", value: formatFrequency(metrics.sampleRate) },
    { label: "RMS", value: metrics.rms.toFixed(4) },
    { label: "Peak", value: metrics.peak.toFixed(4) },
    { label: "Dominant", value: formatFrequency(metrics.dominantFrequency) },
    { label: "Bandwidth", value: formatFrequency(metrics.bandwidth) },
    { label: "SNR", value: metrics.snr != null ? `${metrics.snr.toFixed(1)} dB` : "N/A" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-x-6 gap-y-2">
      {items.map((m) => (
        <div key={m.label}>
          <dt className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-surface-500)" }}>
            {m.label}
          </dt>
          <dd className="mt-0.5 text-sm font-bold mono" style={{ color: "#e2e8f0" }}>
            {m.value}
          </dd>
        </div>
      ))}
    </div>
  );
}
