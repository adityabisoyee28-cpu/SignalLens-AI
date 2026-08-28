import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function ConstellationChart({ i, q }: { i: number[]; q: number[] }) {
  const data = i.map((iVal, idx) => ({ i: iVal, q: q[idx] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" />
        <XAxis type="number" dataKey="i" tick={{ fontSize: 9, fill: "#475569", fontFamily: "monospace" }}
          stroke="rgba(255,255,255,0.04)" domain={["auto", "auto"]} name="I" width={45} />
        <YAxis type="number" dataKey="q" tick={{ fontSize: 9, fill: "#475569", fontFamily: "monospace" }}
          stroke="rgba(255,255,255,0.04)" domain={["auto", "auto"]} name="Q" />
        <Tooltip contentStyle={{ backgroundColor: "#0c1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, fontSize: 11, color: "#c8d1dc" }}
          formatter={(v) => [Number(v).toFixed(4)]}
          labelFormatter={(_, p) => p?.[0] ? `I: ${p[0].payload.i.toFixed(4)}, Q: ${p[0].payload.q.toFixed(4)}` : ""} />
        <Scatter data={data} fill="#f59e0b" fillOpacity={0.3} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
