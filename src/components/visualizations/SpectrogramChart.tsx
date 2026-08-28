import { useRef, useEffect, useCallback } from "react";

export function SpectrogramChart({ data }: { data: number[][] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0 || !data[0]?.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Measure actual container width
    const containerWidth = container.clientWidth;
    const displayHeight = 180;

    // Set canvas internal resolution to match display size (1:1 pixel mapping)
    canvas.width = containerWidth;
    canvas.height = displayHeight;

    // Set CSS size
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const rows = data.length;
    const cols = data[0].length;

    // Find min/max for color normalization
    let min = Infinity;
    let max = -Infinity;
    for (const row of data) {
      for (const v of row) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }

    // Create ImageData for fast pixel-level rendering
    const imageData = ctx.createImageData(containerWidth, displayHeight);
    const pixels = imageData.data;

    const cw = containerWidth / cols;
    const ch = displayHeight / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = Math.max(0, Math.min(1, (data[r][c] - min) / (max - min || 1)));
        // Blue → Cyan → Yellow → Red
        let red: number, green: number, blue: number;
        if (n < 0.25) {
          red = 0;
          green = Math.round(n * 4 * 180);
          blue = Math.round(200 - n * 4 * 200);
        } else if (n < 0.5) {
          red = 0;
          green = Math.round(180);
          blue = Math.round(0);
        } else if (n < 0.75) {
          red = Math.round((n - 0.5) * 4 * 255);
          green = Math.round(180 - (n - 0.5) * 4 * 100);
          blue = 0;
        } else {
          red = 255;
          green = Math.round(80 - (n - 0.75) * 4 * 80);
          blue = 0;
        }

        // Fill the rectangular cell
        const x0 = Math.floor(c * cw);
        const y0 = Math.floor(r * ch);
        const x1 = Math.min(Math.ceil((c + 1) * cw), containerWidth);
        const y1 = Math.min(Math.ceil((r + 1) * ch), displayHeight);

        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const idx = (py * containerWidth + px) * 4;
            pixels[idx] = red;
            pixels[idx + 1] = green;
            pixels[idx + 2] = blue;
            pixels[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [data]);

  useEffect(() => {
    draw();

    // Redraw on resize
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  if (!data || data.length === 0 || !data[0]?.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--color-surface-500)" }}>
        No spectrogram data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} style={{ display: "block" }} />
      <div className="flex justify-between mt-2 text-[10px] mono" style={{ color: "var(--color-surface-500)" }}>
        <span>Time →</span>
        <span>0 Hz → {((data[0]?.length || 0) * 100).toFixed(0)} Hz</span>
        <span>dB (power)</span>
      </div>
    </div>
  );
}
