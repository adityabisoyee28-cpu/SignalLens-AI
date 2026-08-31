import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function ConstellationChart({ i, q }: { i: number[]; q: number[] }) {
  const data = i.map((iVal, idx) => ({ i: iVal, q: q[idx] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
        <XAxis type="number" dataKey="i" tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "monospace" }}
          stroke="#e8ddd0" domain={["auto", "auto"]} name="I" width={45} />
        <YAxis type="number" dataKey="q" tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "monospace" }}
          stroke="#e8ddd0" domain={["auto", "auto"]} name="Q" />
        <Tooltip contentStyle={{ backgroundColor: "#fffdf8", border: "1px solid #e8ddd0", borderRadius: 6, fontSize: 11, color: "#1f2937", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [Number(v).toFixed(4)]}
          labelFormatter={(_, p) => p?.[0] ? `I: ${p[0].payload.i.toFixed(4)}, Q: ${p[0].payload.q.toFixed(4)}` : ""} />
        <Scatter data={data} fill="#0d9488" fillOpacity={0.4} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
