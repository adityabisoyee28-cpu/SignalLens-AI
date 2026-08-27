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
import { generateMockAnalysis } from "@/lib/mock-data";
import { formatBytes } from "@/lib/utils";
import type { AnalysisResult } from "@/types/signal";

export function DashboardPage() {
  const location = useLocation();

  // The UploadPage passes the real analysis result via router state
  const state = location.state as {
    analysisResult?: AnalysisResult;
    uploaded?: boolean;
    fileName?: string;
    format?: string;
  } | null;

  // Use the real analysis result from the backend, falling back to mock only if no upload
  const result: AnalysisResult = useMemo(() => {
    if (state?.analysisResult) {
      // Convert analyzedAt string to Date if it came from the backend as a string
      const r = state.analysisResult;
      if (r.analyzedAt && typeof r.analyzedAt === "string") {
        r.analyzedAt = new Date(r.analyzedAt);
      }
      return r;
    }
    // Fallback: show demo mock data (no upload happened)
    return generateMockAnalysis();
  }, [state]);

  const isIQ = result.file.format === "IQ";
  const uploadTime = result.analyzedAt instanceof Date
    ? result.analyzedAt
    : new Date();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {state?.uploaded && (
          <div className="mb-4 rounded-lg border border-neon-200 bg-neon-50 p-3 text-sm text-neon-800">
            ✓ File uploaded successfully — showing real analysis results
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 sm:text-3xl">
              Analysis Dashboard
            </h1>
            <p className="mt-1 text-sm text-surface-500">
              AI-powered signal characterization and classification
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/upload">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" />
                New Upload
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
        className="mt-6"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                {isIQ ? (
                  <Radio className="h-4 w-4 text-violet-500" />
                ) : (
                  <FileAudio className="h-4 w-4 text-signal-500" />
                )}
                <span className="font-medium text-surface-900">
                  {result.file.name}
                </span>
              </div>
              <Badge variant={isIQ ? "default" : "secondary"}>
                {result.file.format}
              </Badge>
              <span className="text-surface-400">
                {formatBytes(result.file.size)}
              </span>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5 text-surface-500">
                <Clock className="h-3.5 w-3.5" />
                Analyzed {uploadTime.toLocaleTimeString()}
              </div>
              <Badge variant="success">Complete</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="mt-6 space-y-6">
        {/* Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <MetricsPanel metrics={result.metrics} />
        </motion.div>

        {/* Visualizations */}
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

        {/* AI + Report two-column */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            <ReportPanel result={result} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
