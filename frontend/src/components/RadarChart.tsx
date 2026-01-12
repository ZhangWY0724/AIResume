import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";

interface RadarChartProps {
  data: Record<string, number>;
}

export default function RadarChart({ data }: RadarChartProps) {
  // Transform object to array format required by Recharts
  const chartData = Object.entries(data).map(([subject, A]) => ({
    subject,
    A,
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
