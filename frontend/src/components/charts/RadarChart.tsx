"use client";

import {
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface RadarDataPoint {
  axis: string;
  score: number;
}

interface FiveAxisRadarProps {
  data: RadarDataPoint[];
  maxScore?: number;
}

export default function FiveAxisRadar({ data, maxScore = 5 }: FiveAxisRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ReRadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 12, fill: "#475569" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, maxScore]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickCount={6}
        />
        <Radar
          dataKey="score"
          stroke="#2563eb"
          fill="#3b82f6"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </ReRadarChart>
    </ResponsiveContainer>
  );
}
