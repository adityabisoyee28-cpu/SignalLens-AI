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
    <div className="flex items-start gap-3 rounded-lg border border-surface-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-surface-500">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-surface-900 tabular-nums">
          {value}
        </p>
        {unit && (
          <p className="text-[11px] text-surface-400">{unit}</p>
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
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Activity,
      label: "Sample Rate",
      value: formatFrequency(metrics.sampleRate),
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: TrendingUp,
      label: "RMS",
      value: metrics.rms.toFixed(4),
      unit: "amplitude",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Gauge,
      label: "Peak",
      value: metrics.peak.toFixed(4),
      unit: "amplitude",
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: Radio,
      label: "Dominant Frequency",
      value: formatFrequency(metrics.dominantFrequency),
      color: "bg-rose-50 text-rose-600",
    },
    {
      icon: Maximize2,
      label: "Bandwidth",
      value: formatFrequency(metrics.bandwidth),
      color: "bg-cyan-50 text-cyan-600",
    },
    {
      icon: Signal,
      label: "SNR",
      value: metrics.snr != null ? `${metrics.snr.toFixed(1)} dB` : "N/A",
      unit: metrics.snr != null ? "signal-to-noise ratio" : "not reliably available",
      color: "bg-indigo-50 text-indigo-600",
    },
  ];

  return (
    <Card>
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
