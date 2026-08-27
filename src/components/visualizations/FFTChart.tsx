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
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="frequency"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => formatFrequency(v)}
          stroke="#d1d5db"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          stroke="#d1d5db"
          label={{ value: "dB", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9ca3af" } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            color: "#f1f5f9",
          }}
          formatter={(value) => [`${Number(value).toFixed(1)} dB`, "Magnitude"]}
          labelFormatter={(label) => `Freq: ${formatFrequency(label as number)}`}
        />
        <Area
          type="monotone"
          dataKey="magnitude"
          stroke="#8b5cf6"
          fill="#8b5cf6"
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
