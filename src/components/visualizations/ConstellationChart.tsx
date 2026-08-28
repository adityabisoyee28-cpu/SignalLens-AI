import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ConstellationChartProps {
  i: number[];
  q: number[];
}

export function ConstellationChart({ i, q }: ConstellationChartProps) {
  const data = i.map((iVal, idx) => ({
    i: iVal,
    q: q[idx],
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          type="number"
          dataKey="i"
          name="In-Phase"
          tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }}
          stroke="rgba(255,255,255,0.08)"
          domain={["auto", "auto"]}
          label={{ value: "I", angle: 0, position: "insideBottomRight", offset: -5, style: { fontSize: 10, fill: "#64748b" } }}
        />
        <YAxis
          type="number"
          dataKey="q"
          name="Quadrature"
          tick={{ fontSize: 10, fill: "#64748b", fontFamily: "monospace" }}
          stroke="rgba(255,255,255,0.08)"
          domain={["auto", "auto"]}
          label={{ value: "Q", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#64748b" } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1e27",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
            color: "#e2e8f0",
          }}
          formatter={(value) => [Number(value).toFixed(4)]}
          labelFormatter={(_, payload) => {
            if (payload && payload.length > 0) {
              return `I: ${payload[0].payload.i.toFixed(4)}, Q: ${payload[0].payload.q.toFixed(4)}`;
            }
            return "";
          }}
        />
        <Scatter
          data={data}
          fill="#f59e0b"
          fillOpacity={0.5}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
