import { useState } from "react";
import {
  Activity,
  BarChart3,
  Waves,
  Grid3X3,
  CircleDot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WaveformChart } from "@/components/visualizations/WaveformChart";
import { FFTChart } from "@/components/visualizations/FFTChart";
import { PSDChart } from "@/components/visualizations/PSDChart";
import { SpectrogramChart } from "@/components/visualizations/SpectrogramChart";
import { ConstellationChart } from "@/components/visualizations/ConstellationChart";
import type { VisualizationData } from "@/types/signal";
import { cn } from "@/lib/utils";

interface VisualizationPanelProps {
  data: VisualizationData;
  showConstellation: boolean;
}

const vizTabs = [
  { id: "waveform", label: "Waveform", icon: Activity },
  { id: "fft", label: "FFT", icon: BarChart3 },
  { id: "psd", label: "PSD", icon: Waves },
  { id: "spectrogram", label: "Spectrogram", icon: Grid3X3 },
  { id: "constellation", label: "Constellation", icon: CircleDot },
] as const;

export function VisualizationPanel({
  data,
  showConstellation,
}: VisualizationPanelProps) {
  const [activeViz, setActiveViz] = useState<string>("waveform");

  const tabs = showConstellation
    ? vizTabs
    : vizTabs.filter((t) => t.id !== "constellation");

  return (
    <Card className="!bg-surface-900/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Signal Visualization</CardTitle>
          <Badge variant="secondary">Interactive</Badge>
        </div>
        {/* Tab Selector */}
        <div className="mt-3 flex flex-wrap gap-1 rounded-lg bg-surface-950/60 p-1 border border-white/[0.04]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveViz(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                activeViz === tab.id
                  ? "bg-signal-600/20 text-signal-400 border border-signal-500/20"
                  : "text-surface-500 hover:text-white border border-transparent"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-white/[0.06] bg-surface-950/40 p-4">
          {activeViz === "waveform" && (
            <WaveformChart
              time={data.waveform.time}
              amplitude={data.waveform.amplitude}
            />
          )}
          {activeViz === "fft" && (
            <FFTChart
              frequency={data.fft.frequency}
              magnitude={data.fft.magnitude}
            />
          )}
          {activeViz === "psd" && (
            <PSDChart
              frequency={data.psd.frequency}
              power={data.psd.power}
            />
          )}
          {activeViz === "spectrogram" && (
            <SpectrogramChart data={data.spectrogram} />
          )}
          {activeViz === "constellation" && data.constellation && (
            <ConstellationChart
              i={data.constellation.i}
              q={data.constellation.q}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
