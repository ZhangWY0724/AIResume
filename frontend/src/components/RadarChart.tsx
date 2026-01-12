import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { DimensionScore } from "@/lib/api";

interface RadarChartProps {
  data: DimensionScore[];
}

export default function RadarChart({ data }: RadarChartProps) {
  // Transform array format to Recharts format
  // API returns [{ name: "Skill", score: 85, ... }]
  const chartData = data.map((item) => ({
    subject: item.name,
    A: item.score,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[300px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar outerRadius="70%" data={chartData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="能力维度"
            dataKey="A"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
          />
          <Tooltip 
             contentStyle={{ 
               backgroundColor: 'hsl(var(--popover))', 
               borderColor: 'hsl(var(--border))',
               borderRadius: 'var(--radius)',
               color: 'hsl(var(--popover-foreground))'
             }}
             itemStyle={{ color: 'hsl(var(--primary))' }}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
