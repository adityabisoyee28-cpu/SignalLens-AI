import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileAudio,
  Radio,
  Clock,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MetricsPanel } from "@/components/dashboard/MetricsPanel";
import { VisualizationPanel } from "@/components/dashboard/VisualizationPanel";
import { AIAnalysisPanel } from "@/components/dashboard/AIAnalysisPanel";
import { ReportPanel } from "@/components/dashboard/ReportPanel";
import { FeatureInspector } from "@/components/dashboard/FeatureInspector";
import { formatBytes } from "@/lib/utils";
import type { AnalysisResult } from "@/types/signal";

export function DashboardPage() {
  const location = useLocation();

  const state = location.state as {
    analysisResult?: AnalysisResult;
    uploaded?: boolean;
    fileName?: string;
    format?: string;
  } | null;

  const result: AnalysisResult | null = useMemo(() => {
    if (state?.analysisResult) {
      const r = state.analysisResult;
      if (r.analyzedAt && typeof r.analyzedAt === "string") {
        r.analyzedAt = new Date(r.analyzedAt);
      }
      return r;
    }
    return null;
  }, [state]);

  if (!result) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-900 border border-white/[0.06]">
          <Radio className="h-10 w-10 text-surface-500/40" />
        </div>
        <h1 className="text-2xl font-bold text-white">No Analysis Data</h1>
        <p className="mt-2 text-surface-400 text-sm max-w-md mx-auto">
          Upload a WAV or IQ file to begin signal analysis.
        </p>
        <Link to="/upload" className="mt-6 inline-block">
          <Button>
            <Upload className="h-4 w-4" />
            Go to Upload
          </Button>
        </Link>
      </div>
    );
  }

  const isIQ = result.file.format === "IQ";
  const uploadTime =
    result.analyzedAt instanceof Date ? result.analyzedAt : new Date();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Analysis Dashboard
            </h1>
            <p className="mt-1 text-sm text-surface-400">
              AI-powered signal characterization and classification
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/upload">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" />
                New Analysis
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* File Info Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mt-5"
      >
        <Card className="!bg-surface-900/60">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                {isIQ ? (
                  <Radio className="h-4 w-4 text-purple-400" />
                ) : (
                  <FileAudio className="h-4 w-4 text-signal-400" />
                )}
                <span className="font-medium text-white">
                  {result.file.name}
                </span>
              </div>
              <Badge variant={isIQ ? "default" : "secondary"}>
                {result.file.format}
              </Badge>
              <span className="text-surface-400">
                {formatBytes(result.file.size)}
              </span>
              <Separator orientation="vertical" className="h-4 !bg-white/10" />
              <div className="flex items-center gap-1.5 text-surface-400">
                <Clock className="h-3.5 w-3.5" />
                {uploadTime.toLocaleTimeString()}
              </div>
              <Badge variant="success">Complete</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content */}
      <div className="mt-5 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <MetricsPanel metrics={result.metrics} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <VisualizationPanel
            data={result.visualization}
            showConstellation={isIQ}
          />
        </motion.div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <AIAnalysisPanel analysis={result.aiAnalysis} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <FeatureInspector metrics={result.metrics} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <ReportPanel result={result} />
        </motion.div>
      </div>
    </div>
  );
}
