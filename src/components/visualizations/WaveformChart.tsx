import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function WaveformChart({ time, amplitude }: { time: number[]; amplitude: number[] }) {
  const data = time.map((t, i) => ({ time: t, amplitude: amplitude[i] }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
        <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "monospace" }}
          tickFormatter={(v) => `${v.toFixed(2)}s`} stroke="#e8ddd0" />
        <YAxis tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "monospace" }}
          stroke="#e8ddd0" domain={["auto", "auto"]} width={45} />
        <Tooltip contentStyle={{ backgroundColor: "#fffdf8", border: "1px solid #e8ddd0", borderRadius: 6, fontSize: 11, color: "#1f2937", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [Number(v).toFixed(4), "Amplitude"]}
          labelFormatter={(l) => `t = ${(l as number).toFixed(4)}s`} />
        <Line type="monotone" dataKey="amplitude" stroke="#e97b2c" strokeWidth={1.2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
