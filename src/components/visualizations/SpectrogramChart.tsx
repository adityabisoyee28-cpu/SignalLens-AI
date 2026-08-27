import { useRef, useEffect, useCallback } from "react";

interface SpectrogramChartProps {
  data: number[][];
  width?: number;
  height?: number;
}

function getHeatmapColor(value: number, min: number, max: number): string {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));

  // Dark blue → cyan → yellow → red heat scale
  const r = Math.round(normalized < 0.5 ? normalized * 2 * 200 : 200 + (normalized - 0.5) * 2 * 55);
  const g = Math.round(normalized < 0.25 ? normalized * 4 * 200 : normalized < 0.75 ? 200 - (normalized - 0.25) * 2 * 200 : 0);
  const b = Math.round(normalized < 0.5 ? 200 - normalized * 2 * 200 : 0);

  return `rgb(${r}, ${g}, ${b})`;
}

export function SpectrogramChart({
  data,
  width = 600,
  height = 240,
}: SpectrogramChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rows = data.length;
    const cols = data[0].length;

    // Find min/max for normalization
    let min = Infinity;
    let max = -Infinity;
    for (const row of data) {
      for (const val of row) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = getHeatmapColor(data[r][c], min, max);
        ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth + 1, cellHeight + 1);
      }
    }
  }, [data, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Set the canvas size
    canvas.width = width;
    canvas.height = height;
    draw();
  }, [draw, width, height]);

  return (
    <div className="w-full overflow-hidden rounded-lg border border-surface-200 bg-surface-950">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px`, display: "block" }}
      />
    </div>
  );
}
