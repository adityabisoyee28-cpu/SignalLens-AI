import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WaveformChartProps {
  time: number[];
  amplitude: number[];
}

export function WaveformChart({ time, amplitude }: WaveformChartProps) {
  const data = time.map((t, i) => ({
    time: t,
    amplitude: amplitude[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => `${v.toFixed(2)}s`}
          stroke="#d1d5db"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          stroke="#d1d5db"
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            color: "#f1f5f9",
          }}
          formatter={(value) => [Number(value).toFixed(4), "Amplitude"]}
          labelFormatter={(label) => `Time: ${(label as number).toFixed(4)}s`}
        />
        <Line
          type="monotone"
          dataKey="amplitude"
          stroke="#3391ff"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
