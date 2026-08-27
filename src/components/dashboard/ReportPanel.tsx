import { useState } from "react";
import { FileText, Download, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnalysisResult } from "@/types/signal";
import { formatFrequency, formatBytes } from "@/lib/utils";

interface ReportPanelProps {
  result: AnalysisResult;
}

export function ReportPanel({ result }: ReportPanelProps) {
  const [copied, setCopied] = useState(false);
  const { file, metrics, aiAnalysis } = result;

  const analyzedAtStr =
    result.analyzedAt instanceof Date
      ? result.analyzedAt.toISOString()
      : typeof result.analyzedAt === "string"
        ? result.analyzedAt
        : new Date().toISOString();

  const reportText = `
SignalLens AI — Analysis Report
${"=".repeat(40)}
File: ${file.name}
Format: ${file.format}
Size: ${formatBytes(file.size)}
Analyzed: ${analyzedAtStr}

Signal Metrics
${"-".repeat(40)}
Duration: ${metrics.duration.toFixed(3)} s
Sample Rate: ${formatFrequency(metrics.sampleRate)}
RMS: ${metrics.rms.toFixed(4)}
Peak: ${metrics.peak.toFixed(4)}
Dominant Frequency: ${formatFrequency(metrics.dominantFrequency)}
Bandwidth: ${formatFrequency(metrics.bandwidth)}
SNR: ${metrics.snr != null ? `${metrics.snr.toFixed(1)} dB` : "N/A"}

AI Classification
${"-".repeat(40)}
Type: ${aiAnalysis.classification.type}
Confidence: ${(aiAnalysis.classification.confidence * 100).toFixed(0)}%
${aiAnalysis.anomalyScore != null ? `Anomaly Score: ${(aiAnalysis.anomalyScore * 100).toFixed(0)}%` : ""}

Characteristics: ${aiAnalysis.classification.characteristics.join(", ")}
Properties: ${aiAnalysis.detectedCharacteristics.join(", ")}
`.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in textarea
    }
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signalens-report-${file.name.replace(/\.[^.]+$/, "")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-signal-500" />
            Analysis Report
          </CardTitle>
          <Badge variant="secondary">Generated</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick summary */}
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-surface-900">
            Summary
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <span className="text-surface-500">File</span>
            <span className="font-medium text-surface-900 truncate">{file.name}</span>
            <span className="text-surface-500">Format</span>
            <span className="font-medium text-surface-900">{file.format}</span>
            <span className="text-surface-500">Type</span>
            <span className="font-medium text-surface-900">{aiAnalysis.classification.type}</span>
            <span className="text-surface-500">Confidence</span>
            <span className="font-medium text-surface-900">
              {(aiAnalysis.classification.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Full report preview */}
        <div className="relative">
          <pre className="max-h-64 overflow-auto rounded-lg border border-surface-200 bg-surface-950 p-4 text-xs leading-relaxed text-surface-300">
            {reportText}
          </pre>
        </div>

        {/* Export actions */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleDownload} className="flex-1">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
