import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/types/signal";
import { formatFrequency, formatBytes } from "@/lib/utils";

interface ReportPanelProps {
  result: AnalysisResult;
}

export function ReportPanel({ result }: ReportPanelProps) {
  const [copied, setCopied] = useState(false);
  const { file, metrics, aiAnalysis } = result;

  const analyzedAt = result.analyzedAt instanceof Date ? result.analyzedAt : new Date();

  const sections = [
    {
      title: "Source Information",
      rows: [
        ["Filename", file.name],
        ["Format", file.format],
        ["Size", formatBytes(file.size)],
        ["Sample Rate", formatFrequency(metrics.sampleRate)],
        ["Duration", `${metrics.duration.toFixed(3)} s`],
      ],
    },
    {
      title: "Time-Domain Characteristics",
      rows: [
        ["RMS", metrics.rms.toFixed(4)],
        ["Peak Amplitude", metrics.peak.toFixed(4)],
        ["Dominant Frequency", formatFrequency(metrics.dominantFrequency)],
      ],
    },
    {
      title: "Frequency-Domain Characteristics",
      rows: [
        ["Bandwidth", formatFrequency(metrics.bandwidth)],
        ["SNR", metrics.snr != null ? `${metrics.snr.toFixed(1)} dB` : "N/A"],
      ],
    },
    {
      title: "Classification",
      rows: [
        ["Signal Type", aiAnalysis.classification.type],
        ["Confidence", `${(aiAnalysis.classification.confidence * 100).toFixed(0)}%`],
        ["Characteristics", aiAnalysis.classification.characteristics.join(", ")],
        ["Properties", aiAnalysis.detectedCharacteristics.join(", ")],
      ],
    },
  ];

  const reportText = `SIGNALENS — SIGNAL ANALYSIS REPORT\n${"─".repeat(50)}\n\n` +
    sections.map((s) => `${s.title.toUpperCase()}\n${s.rows.map(([l, v]) => `  ${l}: ${v}`).join("\n")}`).join("\n\n") +
    `\n\n${"─".repeat(50)}\nGenerated: ${analyzedAt.toISOString()}`;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(reportText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `signalens-${file.name.replace(/\.[^.]+$/, "")}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-bold mono" style={{ color: "var(--color-signal-500)" }}>08</span>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-surface-500)" }}>Analysis Report</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
      </div>

      {/* Report header */}
      <div className="mb-4">
        <p className="text-xs font-bold tracking-wider" style={{ color: "#e2e8f0" }}>SIGNALENS</p>
        <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--color-surface-500)" }}>Signal Analysis Report</p>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px", paddingBottom: "12px" }}>
          <h4 className="text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--color-surface-500)" }}>
            {section.title}
          </h4>
          <dl className="space-y-0.5">
            {section.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between text-xs gap-4">
                <dt style={{ color: "var(--color-surface-400)" }}>{label}</dt>
                <dd className="mono text-right" style={{ color: "#e2e8f0" }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <Button onClick={handleDownload} size="sm" className="gap-1.5">
          <Download className="h-3 w-3" /> Download
        </Button>
        <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
          {copied ? <><Check className="h-3 w-3" style={{ color: "var(--color-neon-500)" }} /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </Button>
      </div>
    </div>
  );
}
