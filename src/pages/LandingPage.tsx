import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top section — editorial layout */}
      <div className="px-6 pt-10 pb-6 lg:px-10 lg:pt-14 lg:pb-8">
        <div className="max-w-5xl">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl" style={{ color: "#e2e8f0" }}>
                SIGNALENS
              </h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-widest" style={{ color: "var(--color-signal-500)" }}>
                Signal Analysis Workbench
              </p>
              <p className="mt-3 text-sm max-w-md" style={{ color: "var(--color-surface-400)" }}>
                Automated analysis for WAV and IQ signals. DSP, feature extraction, classification.
              </p>
            </div>
            <Link to="/upload">
              <Button className="gap-2">
                Analyze Signal
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Large signal visualization — takes up most of the screen */}
      <div className="flex-1 px-6 pb-8 lg:px-10">
        <div className="max-w-5xl h-[60vh] min-h-[400px] relative rounded-lg overflow-hidden"
          style={{ backgroundColor: "#080d18", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Grid */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
            {/* Subtle grid lines */}
            {Array.from({ length: 20 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 30} x2="1000" y2={i * 30} stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
            ))}
            {Array.from({ length: 30 }, (_, i) => (
              <line key={`v${i}`} x1={i * 34} y1="0" x2={i * 34} y2="600" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
            ))}

            {/* Waveform — top half */}
            <g>
              <path
                d="M0,150 C30,120 60,100 90,150 C120,200 150,180 180,150 C210,120 240,70 270,150 C300,230 330,190 360,150 C390,110 420,60 450,150 C480,240 510,200 540,150 C570,100 600,80 630,150 C660,220 690,180 720,150 C750,120 780,90 810,150 C840,210 870,170 900,150 C930,130 960,120 1000,150"
                fill="none" stroke="rgba(59,142,255,0.4)" strokeWidth="1.2"
              />
              <path
                d="M0,150 C30,120 60,100 90,150 C120,200 150,180 180,150 C210,120 240,70 270,150 C300,230 330,190 360,150 C390,110 420,60 450,150 C480,240 510,200 540,150 C570,100 600,80 630,150 C660,220 690,180 720,150 C750,120 780,90 810,150 C840,210 870,170 900,150 C930,130 960,120 1000,150 L1000,300 L0,300 Z"
                fill="rgba(59,142,255,0.03)"
              />
            </g>

            {/* FFT bars — bottom half */}
            <g>
              {[40,80,120,160,200,240,280,320,360,400,440,480,520,560,600,640,680,720,760,800,840,880,920,960].map((x, i) => {
                const h = [30,50,80,40,25,60,35,20,45,30,15,55,70,40,25,50,35,20,45,30,15,40,25,20][i];
                return (
                  <rect key={i} x={x} y={450 - h} width={24} height={h} rx="1"
                    fill="rgba(59,142,255,0.08)" stroke="rgba(59,142,255,0.15)" strokeWidth="0.5" />
                );
              })}
            </g>

            {/* Section labels */}
            <text x="20" y="32" fill="var(--color-surface-500)" fontSize="9" fontFamily="monospace" letterSpacing="0.1em">
              TIME DOMAIN
            </text>
            <text x="20" y="340" fill="var(--color-surface-500)" fontSize="9" fontFamily="monospace" letterSpacing="0.1em">
              FREQUENCY DOMAIN
            </text>
            <text x="900" y="32" fill="rgba(59,142,255,0.4)" fontSize="9" fontFamily="monospace" textAnchor="end">
              48 kHz • 16-bit
            </text>
            <text x="900" y="340" fill="rgba(59,142,255,0.4)" fontSize="9" fontFamily="monospace" textAnchor="end">
              FFT 1024
            </text>

            {/* Frequency annotation */}
            <line x1="450" y1="90" x2="450" y2="150" stroke="rgba(59,142,255,0.2)" strokeWidth="0.5" strokeDasharray="3 3" />
            <text x="455" y="85" fill="rgba(59,142,255,0.4)" fontSize="8" fontFamily="monospace">f₀ peak</text>

            {/* Noise floor line */}
            <line x1="0" y1="155" x2="1000" y2="155" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="4 4" />
            <text x="900" y="165" fill="rgba(255,255,255,0.1)" fontSize="7" fontFamily="monospace" textAnchor="end">
              noise floor
            </text>
          </svg>
        </div>
      </div>

      {/* Bottom info strip */}
      <div className="px-6 pb-6 lg:px-10">
        <div className="max-w-5xl flex flex-wrap gap-x-8 gap-y-2 text-[10px] font-medium" style={{ color: "var(--color-surface-500)" }}>
          <span>01 / TIME DOMAIN</span>
          <span>02 / FREQUENCY DOMAIN</span>
          <span>03 / SPECTRAL DENSITY</span>
          <span>04 / TIME-FREQUENCY</span>
          <span>05 / IQ ANALYSIS</span>
        </div>
      </div>
    </div>
  );
}
