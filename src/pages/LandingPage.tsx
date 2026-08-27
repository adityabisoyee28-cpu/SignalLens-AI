import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Radio,
  Upload,
  Brain,
  BarChart3,
  FileText,
  Waves,
  ArrowRight,
  Zap,
  Shield,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const features = [
  {
    icon: Upload,
    title: "Upload Signals",
    description: "Drag & drop .IQ and .WAV files for instant processing. Supports standard SDR capture formats.",
  },
  {
    icon: BarChart3,
    title: "Rich Visualizations",
    description: "Waveform, FFT, PSD, Spectrogram, and Constellation diagrams — all rendered in real-time.",
  },
  {
    icon: Brain,
    title: "AI Classification",
    description: "Machine learning models automatically classify signal types with confidence scores.",
  },
  {
    icon: FileText,
    title: "Detailed Reports",
    description: "Export comprehensive analysis reports with metrics, visualizations, and AI findings.",
  },
  {
    icon: Zap,
    title: "Real-time Analysis",
    description: "Fast signal processing pipeline with duration, sample rate, SNR, and dominant frequency detection.",
  },
  {
    icon: Shield,
    title: "Anomaly Detection",
    description: "Identify unusual signal patterns and potential interference or anomalies automatically.",
  },
];

const steps = [
  { step: "01", title: "Upload", description: "Drop your .IQ or .WAV capture file" },
  { step: "02", title: "Analyze", description: "AI processes signal metrics and features" },
  { step: "03", title: "Visualize", description: "Explore interactive signal diagrams" },
  { step: "04", title: "Report", description: "Export findings and classification results" },
];

export function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-signal-100/60 blur-3xl" />
          <div className="absolute -bottom-20 left-0 h-[400px] w-[400px] rounded-full bg-neon-100/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-signal-200 bg-signal-50 px-4 py-1.5 text-sm font-medium text-signal-700"
          >
            <Cpu className="h-4 w-4" />
            SIH26147 — Smart India Hackathon
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-surface-950 sm:text-5xl lg:text-6xl"
          >
            <span className="text-signal-600">SignalLens</span>{" "}
            <span className="text-surface-900">AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-lg text-surface-500 sm:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Automated analysis of .IQ and .WAV signal files. Upload captures from
            any SDR and get instant AI-powered classification, rich visualizations,
            and exportable reports.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/upload">
              <Button size="xl" className="min-w-[200px]">
                Start Analysis
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="xl" className="min-w-[200px]">
                View Demo Dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Supported formats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex items-center justify-center gap-4 text-sm text-surface-400"
          >
            <span className="flex items-center gap-1.5">
              <Waves className="h-4 w-4" /> WAV
            </span>
            <span className="h-1 w-1 rounded-full bg-surface-300" />
            <span className="flex items-center gap-1.5">
              <Radio className="h-4 w-4" /> IQ
            </span>
            <span className="h-1 w-1 rounded-full bg-surface-300" />
            <span className="flex items-center gap-1.5">
              <Brain className="h-4 w-4" /> AI-Powered
            </span>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-surface-50 border-y border-surface-200">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center text-2xl font-bold text-surface-900 sm:text-3xl"
          >
            How It Works
          </motion.h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className="relative rounded-xl border border-surface-200 bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-signal-600 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-surface-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-surface-500">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center text-2xl font-bold text-surface-900 sm:text-3xl"
          >
            Platform Capabilities
          </motion.h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-surface-500">
            Everything you need to analyze, classify, and understand RF signals in one place.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-signal-50 text-signal-600">
                      <feat.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-surface-900">
                      {feat.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-surface-500 leading-relaxed">
                      {feat.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-surface-900 text-white">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center text-2xl font-bold sm:text-3xl"
          >
            Analysis Metrics
          </motion.h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-surface-400">
            Deep signal characterization with industry-standard measurements.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              "Duration",
              "Sample Rate",
              "RMS",
              "Peak Amplitude",
              "Dominant Frequency",
              "Bandwidth",
              "SNR",
              "Classification",
            ].map((metric, i) => (
              <motion.div
                key={metric}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className="rounded-lg border border-surface-700 bg-surface-800/50 p-4 text-center"
              >
                <div className="text-sm font-medium text-signal-400">
                  {metric}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold text-surface-900 sm:text-4xl">
            Ready to Analyze?
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            Upload your first signal capture and see AI-powered analysis in seconds.
          </p>
          <Link to="/upload" className="mt-8 inline-block">
            <Button size="xl" className="min-w-[220px]">
              Upload Signal File
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
