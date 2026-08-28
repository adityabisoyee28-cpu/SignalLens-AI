import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatFrequency } from "@/lib/utils";

interface FFTChartProps {
  frequency: number[];
  magnitude: number[];
}

export function FFTChart({ frequency, magnitude }: FFTChartProps) {
  const data = frequency.map((f, i) => ({
    frequency: f,
    magnitude: magnitude[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="frequency"
          tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }}
          tickFormatter={(v) => formatFrequency(v)}
          stroke="rgba(255,255,255,0.08)"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }}
          stroke="rgba(255,255,255,0.08)"
          label={{ value: "dB", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#64748b" } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1e27",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
            color: "#e2e8f0",
          }}
          formatter={(value) => [`${Number(value).toFixed(1)} dB`, "Magnitude"]}
          labelFormatter={(label) => `Freq: ${formatFrequency(label as number)}`}
        />
        <Area
          type="monotone"
          dataKey="magnitude"
          stroke="#8b5cf6"
          fill="#8b5cf6"
          fillOpacity={0.12}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
