import { WaveformChart } from "@/components/visualizations/WaveformChart";
import { FFTChart } from "@/components/visualizations/FFTChart";
import { PSDChart } from "@/components/visualizations/PSDChart";
import { SpectrogramChart } from "@/components/visualizations/SpectrogramChart";
import { ConstellationChart } from "@/components/visualizations/ConstellationChart";
import type { VisualizationData } from "@/types/signal";

interface VisualizationPanelProps {
  data: VisualizationData;
  showConstellation: boolean;
}

function ChartSection({ num, label, children }: { num: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-bold mono" style={{ color: "var(--color-signal-500)" }}>{num}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-surface-500)" }}>{label}</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#060b14", border: "1px solid rgba(255,255,255,0.04)" }}>
        {children}
      </div>
    </div>
  );
}

export function VisualizationPanel({ data, showConstellation }: VisualizationPanelProps) {
  return (
    <div className="space-y-5">
      {/* Waveform — full width, large */}
      <ChartSection num="01" label="Time Domain">
        <WaveformChart time={data.waveform.time} amplitude={data.waveform.amplitude} />
      </ChartSection>

      {/* FFT + PSD — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartSection num="02" label="Frequency Domain">
          <FFTChart frequency={data.fft.frequency} magnitude={data.fft.magnitude} />
        </ChartSection>
        <ChartSection num="03" label="Spectral Density">
          <PSDChart frequency={data.psd.frequency} power={data.psd.power} />
        </ChartSection>
      </div>

      {/* Spectrogram — full width */}
      <ChartSection num="04" label="Spectrogram">
        <SpectrogramChart data={data.spectrogram} />
      </ChartSection>

      {/* IQ — only when present */}
      {showConstellation && data.constellation && (
        <ChartSection num="05" label="IQ Analysis">
          <ConstellationChart i={data.constellation.i} q={data.constellation.q} />
        </ChartSection>
      )}
    </div>
  );
}
