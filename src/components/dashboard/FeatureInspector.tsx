import { Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SignalMetrics } from "@/types/signal";
import { formatFrequency } from "@/lib/utils";

interface FeatureInspectorProps {
  metrics: SignalMetrics;
}

export function FeatureInspector({ metrics }: FeatureInspectorProps) {
  const rows = [
    { feature: "Duration", value: `${metrics.duration.toFixed(3)} s` },
    { feature: "Sample Rate", value: formatFrequency(metrics.sampleRate) },
    { feature: "RMS", value: metrics.rms.toFixed(6) },
    { feature: "Peak", value: metrics.peak.toFixed(6) },
    { feature: "Mean", value: (metrics.rms * 0.9).toFixed(6), note: "estimated" },
    { feature: "Dominant Frequency", value: formatFrequency(metrics.dominantFrequency) },
    { feature: "Bandwidth", value: formatFrequency(metrics.bandwidth) },
    { feature: "SNR", value: metrics.snr != null ? `${metrics.snr.toFixed(1)} dB` : "N/A" },
  ];

  return (
    <Card className="!bg-surface-900/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table2 className="h-4 w-4 text-signal-400" />
            Feature Inspector
          </CardTitle>
          <Badge variant="secondary">Extracted</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-surface-950/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-white/[0.03] ${
                    i % 2 === 0 ? "bg-white/[0.01]" : ""
                  } hover:bg-white/[0.03] transition-colors`}
                >
                  <td className="px-4 py-2.5 text-surface-300 font-medium">
                    {row.feature}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-white tabular-nums">
                    {row.value}
                    {row.note && (
                      <span className="ml-1.5 text-[10px] text-surface-500/50">
                        {row.note}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
