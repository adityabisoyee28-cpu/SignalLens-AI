import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload,
  Brain,
  BarChart3,
  FileText,
  Waves,
  ArrowRight,
  Zap,
  Shield,
  Radio,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const features = [
  { icon: Upload, title: "Drag & Drop Upload", desc: "Drop .WAV or .IQ files for instant processing. Standard SDR capture formats supported." },
  { icon: BarChart3, title: "Real-time DSP", desc: "Waveform, FFT, PSD, Spectrogram, and Constellation diagrams — computed in real-time." },
  { icon: Brain, title: "AI Classification", desc: "ML-powered signal type identification with confidence scoring and characteristic detection." },
  { icon: FileText, title: "Export Reports", desc: "Download comprehensive analysis reports with metrics, visualizations, and AI findings." },
  { icon: Zap, title: "Fast Pipeline", desc: "Optimized signal processing with sub-second analysis for most signal captures." },
  { icon: Shield, title: "Secure Storage", desc: "Encrypted Supabase Storage with RLS policies and publishable-key-only access." },
];

const metrics = [
  "Duration", "Sample Rate", "RMS", "Peak Amplitude",
  "Dominant Frequency", "Bandwidth", "SNR", "Classification",
];

/* ─── SVG Signal Visualization (CSS-rendered) ─────────────────────── */
function SignalVisualization() {
  return (
    <div className="relative w-full max-w-lg mx-auto h-64 overflow-hidden rounded-xl border border-white/[0.06] bg-surface-900/80">
      {/* Grid lines */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Waveform line */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3391ff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3391ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#00e682" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3391ff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3391ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Amplitude fill */}
        <path
          d="M0,100 C20,80 40,60 60,100 C80,140 100,120 120,100 C140,80 160,40 180,100 C200,160 220,140 240,100 C260,60 280,30 300,100 C320,170 340,130 360,100 C380,70 400,90 400,100 L400,200 L0,200 Z"
          fill="url(#waveFill)"
        />
        {/* Waveform stroke */}
        <path
          d="M0,100 C20,80 40,60 60,100 C80,140 100,120 120,100 C140,80 160,40 180,100 C200,160 220,140 240,100 C260,60 280,30 300,100 C320,170 340,130 360,100 C380,70 400,90 400,100"
          fill="none"
          stroke="url(#waveGrad)"
          strokeWidth="2"
        />
        {/* Frequency bars (FFT) */}
        {[40, 80, 120, 160, 200, 240, 280, 320, 360].map((x, i) => {
          const h = [45, 30, 60, 20, 80, 15, 35, 25, 40][i];
          return (
            <rect
              key={x}
              x={x - 6}
              y={180 - h}
              width={12}
              height={h}
              rx={2}
              fill="#8b5cf6"
              fillOpacity={0.3}
            />
          );
        })}
        {/* FFT peak line */}
        <line x1="200" y1="40" x2="200" y2="180" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        <text x="205" y="36" fill="#8b5cf6" fontSize="10" fontFamily="monospace" opacity="0.7">f_peak</text>
      </svg>

      {/* Overlay labels */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-mono text-signal-400/70 bg-surface-950/60 px-2 py-1 rounded">
        <Activity className="h-3 w-3" />
        REAL-TIME DSP
      </div>
      <div className="absolute top-3 right-3 text-[10px] font-mono text-neon-400/70 bg-surface-950/60 px-2 py-1 rounded">
        48 kHz
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-signal-600/[0.08] blur-[120px]" />
          <div className="absolute -bottom-20 left-0 h-[400px] w-[400px] rounded-full bg-neon-600/[0.05] blur-[100px]" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-signal-500/20 bg-signal-600/10 px-4 py-1.5 text-xs font-medium text-signal-400"
          >
            <Radio className="h-3.5 w-3.5" />
            SIH26147 — Smart India Hackathon
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            <span className="text-signal-400">Signal</span>
            <span className="text-white">Lens</span>{" "}
            <span className="text-neon-400">AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-lg text-surface-400 sm:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Automated WAV &amp; IQ Signal Intelligence
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-2 text-sm text-surface-500 max-w-xl mx-auto"
          >
            Transform raw signal data into measurable DSP insights, visualizations and interpretable AI analysis.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/upload">
              <Button size="xl" className="min-w-[200px]">
                Analyze a Signal
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="xl" className="min-w-[200px]">
                Explore Demo
              </Button>
            </Link>
          </motion.div>

          {/* Supported formats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex items-center justify-center gap-4 text-xs text-surface-500"
          >
            <span className="flex items-center gap-1.5">
              <Waves className="h-3.5 w-3.5" /> WAV
            </span>
            <span className="h-1 w-1 rounded-full bg-surface-600" />
            <span className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5" /> IQ
            </span>
            <span className="h-1 w-1 rounded-full bg-surface-600" />
            <span className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> AI-Powered
            </span>
          </motion.div>
        </div>

        {/* Signal Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-12 mx-auto max-w-2xl"
        >
          <SignalVisualization />
        </motion.div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center text-2xl font-bold text-white sm:text-3xl"
          >
            Platform Capabilities
          </motion.h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-surface-400 text-sm">
            Everything you need to analyze, classify, and understand RF signals.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className="group rounded-xl border border-white/[0.06] bg-surface-900/60 p-5 transition-all duration-200 hover:border-signal-500/20 hover:bg-surface-900"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-signal-600/10 text-signal-400 group-hover:bg-signal-600/20 transition-colors">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">{feat.title}</h3>
                <p className="mt-1.5 text-xs text-surface-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center text-2xl font-bold text-white sm:text-3xl"
          >
            How It Works
          </motion.h2>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Upload", desc: "Drop your .IQ or .WAV capture file" },
              { step: "02", title: "Process", desc: "AI processes signal metrics and features" },
              { step: "03", title: "Visualize", desc: "Explore interactive signal diagrams" },
              { step: "04", title: "Report", desc: "Export findings and classification results" },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className="relative rounded-xl border border-white/[0.06] bg-surface-900/60 p-6 text-center"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-signal-600/15 text-sm font-bold text-signal-400 border border-signal-500/20">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-xs text-surface-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Metrics ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center text-2xl font-bold text-white sm:text-3xl"
          >
            Analysis Metrics
          </motion.h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-surface-400 text-sm">
            Deep signal characterization with industry-standard measurements.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {metrics.map((m, i) => (
              <motion.div
                key={m}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className="rounded-lg border border-white/[0.06] bg-surface-900/60 p-4 text-center"
              >
                <div className="text-xs font-medium text-signal-400/80">{m}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Analyze?
          </h2>
          <p className="mt-4 text-surface-400">
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
