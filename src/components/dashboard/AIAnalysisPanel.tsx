import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIAnalysis } from "@/types/signal";
import { cn } from "@/lib/utils";

interface AIAnalysisPanelProps {
  analysis: AIAnalysis;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80
      ? "bg-neon-500"
      : pct >= 50
      ? "bg-amber-500"
      : "bg-danger-500";

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-surface-400">Confidence</span>
        <span className="font-semibold font-mono text-white tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-800">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AnomalyIndicator({ score }: { score?: number }) {
  if (score == null) {
    return (
      <div className="flex items-center gap-2 text-sm text-surface-500/60">
        <ShieldCheck className="h-4 w-4" />
        Anomaly detection not implemented
      </div>
    );
  }

  const pct = Math.round(score * 100);
  const isLow = pct < 30;
  const isMedium = pct >= 30 && pct < 70;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold font-mono",
          isLow
            ? "bg-neon-600/15 text-neon-400"
            : isMedium
            ? "bg-amber-500/15 text-amber-400"
            : "bg-danger-500/15 text-danger-500"
        )}
      >
        {pct}
      </div>
      <div>
        <p className="text-sm font-medium text-white">Anomaly Score</p>
        <p
          className={cn(
            "text-xs",
            isLow
              ? "text-neon-400"
              : isMedium
              ? "text-amber-400"
              : "text-danger-500"
          )}
        >
          {isLow ? "Low — Normal signal" : isMedium ? "Medium — Possible anomaly" : "High — Significant anomaly"}
        </p>
      </div>
    </div>
  );
}

export function AIAnalysisPanel({ analysis }: AIAnalysisPanelProps) {
  const { classification, anomalyScore, detectedCharacteristics } = analysis;

  return (
    <Card className="!bg-surface-900/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/15">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
            </div>
            AI Signal Analysis
          </CardTitle>
          <Badge variant="default">Model v1</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Classification */}
        <div className="rounded-lg border border-white/[0.06] bg-surface-950/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-neon-500" />
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
              Classification
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-white">
              {classification.type}
            </span>
          </div>
          <div className="mt-3">
            <ConfidenceBar value={classification.confidence} />
          </div>
        </div>

        {/* Anomaly */}
        <div className="rounded-lg border border-white/[0.06] bg-surface-950/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
              Anomaly Assessment
            </span>
          </div>
          <AnomalyIndicator score={anomalyScore} />
        </div>

        {/* Characteristics */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-signal-400" />
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
              Detected Characteristics
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {classification.characteristics.map((char) => (
              <Badge key={char} variant="secondary">
                {char}
              </Badge>
            ))}
          </div>
        </div>

        {/* Signal Properties */}
        {detectedCharacteristics.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-neon-500" />
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                Signal Properties
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {detectedCharacteristics.map((char) => (
                <div
                  key={char}
                  className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-surface-950/30 px-3 py-2 text-sm text-surface-300"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-neon-500 shrink-0" />
                  {char}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
