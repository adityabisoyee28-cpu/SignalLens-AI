import {
  Clock,
  Activity,
  TrendingUp,
  Gauge,
  Radio,
  Maximize2,
  Signal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SignalMetrics } from "@/types/signal";
import { formatFrequency } from "@/lib/utils";

interface MetricsPanelProps {
  metrics: SignalMetrics;
}

function MetricItem({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-surface-900/60 p-4 transition-all hover:border-white/[0.1] hover:bg-surface-900">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-lg font-bold text-white tabular-nums font-mono">
          {value}
        </p>
        {unit && (
          <p className="text-[10px] text-surface-500/60 mt-0.5">{unit}</p>
        )}
      </div>
    </div>
  );
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const durationStr =
    metrics.duration < 1
      ? `${(metrics.duration * 1000).toFixed(1)} ms`
      : `${metrics.duration.toFixed(3)} s`;

  const metricsList = [
    {
      icon: Clock,
      label: "Duration",
      value: durationStr,
      color: "bg-blue-500/10 text-blue-400",
    },
    {
      icon: Activity,
      label: "Sample Rate",
      value: formatFrequency(metrics.sampleRate),
      color: "bg-purple-500/10 text-purple-400",
    },
    {
      icon: TrendingUp,
      label: "RMS",
      value: metrics.rms.toFixed(4),
      unit: "amplitude",
      color: "bg-emerald-500/10 text-emerald-400",
    },
    {
      icon: Gauge,
      label: "Peak",
      value: metrics.peak.toFixed(4),
      unit: "amplitude",
      color: "bg-amber-500/10 text-amber-400",
    },
    {
      icon: Radio,
      label: "Dominant Freq",
      value: formatFrequency(metrics.dominantFrequency),
      color: "bg-rose-500/10 text-rose-400",
    },
    {
      icon: Maximize2,
      label: "Bandwidth",
      value: formatFrequency(metrics.bandwidth),
      color: "bg-cyan-500/10 text-cyan-400",
    },
    {
      icon: Signal,
      label: "SNR",
      value: metrics.snr != null ? `${metrics.snr.toFixed(1)} dB` : "N/A",
      unit: metrics.snr != null ? "signal-to-noise" : "not available",
      color: "bg-indigo-500/10 text-indigo-400",
    },
  ];

  return (
    <Card className="!bg-surface-900/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Signal Metrics</CardTitle>
          <Badge variant="success">Extracted</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {metricsList.map((m) => (
            <MetricItem key={m.label} {...m} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
