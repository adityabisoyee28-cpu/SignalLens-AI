import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function WaveformChart({ time, amplitude }: { time: number[]; amplitude: number[] }) {
  const data = time.map((t, i) => ({ time: t, amplitude: amplitude[i] }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" />
        <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#475569", fontFamily: "monospace" }}
          tickFormatter={(v) => `${v.toFixed(2)}s`} stroke="rgba(255,255,255,0.04)" />
        <YAxis tick={{ fontSize: 9, fill: "#475569", fontFamily: "monospace" }}
          stroke="rgba(255,255,255,0.04)" domain={["auto", "auto"]} width={45} />
        <Tooltip contentStyle={{ backgroundColor: "#0c1220", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, fontSize: 11, color: "#c8d1dc" }}
          formatter={(v) => [Number(v).toFixed(4), "Amplitude"]}
          labelFormatter={(l) => `t = ${(l as number).toFixed(4)}s`} />
        <Line type="monotone" dataKey="amplitude" stroke="#3b8eff" strokeWidth={1} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
