import { Radio } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-surface-500">
            <Radio className="h-4 w-4 text-signal-500" />
            <span className="text-sm">
              SignalLens AI — SIH26147
            </span>
          </div>
          <p className="text-xs text-surface-400">
            Automated Analysis of .IQ and .WAV Signal Files
          </p>
        </div>
      </div>
    </footer>
  );
}
