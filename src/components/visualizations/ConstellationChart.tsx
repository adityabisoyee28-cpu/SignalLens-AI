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
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          dataKey="i"
          name="In-Phase"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          stroke="#d1d5db"
          domain={["auto", "auto"]}
        />
        <YAxis
          type="number"
          dataKey="q"
          name="Quadrature"
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
          fillOpacity={0.6}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
