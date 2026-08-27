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
      ? "bg-emerald-500"
      : pct >= 50
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-surface-500">Confidence</span>
        <span className="font-semibold text-surface-900">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
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
      <div className="flex items-center gap-2 text-sm text-surface-400">
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
          "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold",
          isLow
            ? "bg-emerald-100 text-emerald-700"
            : isMedium
            ? "bg-amber-100 text-amber-700"
            : "bg-red-100 text-red-700"
        )}
      >
        {pct}
      </div>
      <div>
        <p className="text-sm font-medium text-surface-900">Anomaly Score</p>
        <p
          className={cn(
            "text-xs",
            isLow
              ? "text-emerald-600"
              : isMedium
              ? "text-amber-600"
              : "text-red-600"
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-violet-500" />
            AI Analysis
          </CardTitle>
          <Badge variant="default">Model v1</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Classification */}
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-surface-900">
              Classification
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-surface-900">
              {classification.type}
            </span>
          </div>
          <div className="mt-3">
            <ConfidenceBar value={classification.confidence} />
          </div>
        </div>

        {/* Anomaly Score */}
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-surface-900">
              Anomaly Assessment
            </span>
          </div>
          <AnomalyIndicator score={anomalyScore} />
        </div>

        {/* Detected Characteristics */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-signal-500" />
            <span className="text-sm font-semibold text-surface-900">
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

        {/* Additional Detected Characteristics */}
        {detectedCharacteristics.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-neon-600" />
              <span className="text-sm font-semibold text-surface-900">
                Signal Properties
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {detectedCharacteristics.map((char) => (
                <div
                  key={char}
                  className="flex items-center gap-2 rounded-md border border-surface-200 bg-white px-3 py-2 text-sm text-surface-700"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-neon-500" />
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
