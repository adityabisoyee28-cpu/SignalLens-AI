import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatFrequency } from "@/lib/utils";

export function PSDChart({ frequency, power }: { frequency: number[]; power: number[] }) {
  const data = frequency.map((f, i) => ({ frequency: f, power: power[i] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
        <XAxis dataKey="frequency" tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "monospace" }}
          tickFormatter={(v) => formatFrequency(v)} stroke="#e8ddd0" />
        <YAxis tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "monospace" }}
          stroke="#e8ddd0" width={40} />
        <Tooltip contentStyle={{ backgroundColor: "#fffdf8", border: "1px solid #e8ddd0", borderRadius: 6, fontSize: 11, color: "#1f2937", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [`${Number(v).toFixed(1)} dB/Hz`, "Power"]}
          labelFormatter={(l) => `f = ${formatFrequency(l as number)}`} />
        <Area type="monotone" dataKey="power" stroke="#d97706" fill="#d97706" fillOpacity={0.08} strokeWidth={1.2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
