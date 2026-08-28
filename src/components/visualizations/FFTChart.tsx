import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatFrequency } from "@/lib/utils";

export function FFTChart({ frequency, magnitude }: { frequency: number[]; magnitude: number[] }) {
  const data = frequency.map((f, i) => ({ frequency: f, magnitude: magnitude[i] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" />
        <XAxis dataKey="frequency" tick={{ fontSize: 9, fill: "#475569", fontFamily: "monospace" }}
          tickFormatter={(v) => formatFrequency(v)} stroke="rgba(255,255,255,0.04)" />
        <YAxis tick={{ fontSize: 9, fill: "#475569", fontFamily: "monospace" }}
          stroke="rgba(255,255,255,0.04)" width={40} />
        <Tooltip contentStyle={{ backgroundColor: "#0c1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, fontSize: 11, color: "#c8d1dc" }}
          formatter={(v) => [`${Number(v).toFixed(1)} dB`, "Magnitude"]}
          labelFormatter={(l) => `f = ${formatFrequency(l as number)}`} />
        <Area type="monotone" dataKey="magnitude" stroke="#6366f1" fill="#6366f1" fillOpacity={0.06} strokeWidth={1} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
