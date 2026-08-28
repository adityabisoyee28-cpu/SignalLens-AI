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
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }}
          tickFormatter={(v) => `${v.toFixed(2)}s`}
          stroke="rgba(255,255,255,0.08)"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }}
          stroke="rgba(255,255,255,0.08)"
          domain={["auto", "auto"]}
          label={{ value: "Amplitude", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#64748b" } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1e27",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
            color: "#e2e8f0",
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
