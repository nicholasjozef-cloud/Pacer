import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, ComposedChart, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { WORKOUT_COLORS, getWorkoutCategory, type WorkoutCategory } from '@/lib/workout-colors';
import type { Workout } from '@shared/schema';

interface WeeklyProgressChartProps {
  weekPlan: Workout[];
  currentWeek: number;
}

interface ChartDataPoint {
  day: string;
  dayFull: string;
  planned: number;
  actual: number;
  type: string;
  category: WorkoutCategory;
  color: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload as ChartDataPoint;
  if (!data) return null;
  
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold text-foreground mb-2">{data.dayFull}</p>
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: data.color }}
        />
        <span className="text-sm text-muted-foreground">{data.type}</span>
      </div>
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Planned: </span>
          <span className="font-medium text-foreground">{data.planned} mi</span>
        </p>
        <p>
          <span className="text-muted-foreground">Actual: </span>
          <span className="font-medium text-foreground">{data.actual || 0} mi</span>
        </p>
      </div>
    </div>
  );
}

export function WeeklyProgressChart({ weekPlan, currentWeek }: WeeklyProgressChartProps) {
  const chartData = useMemo(() => {
    return weekPlan.map((workout) => {
      const category = getWorkoutCategory(workout.type);
      return {
        day: workout.day.slice(0, 3),
        dayFull: workout.day,
        planned: workout.planned,
        actual: workout.actual || 0,
        type: workout.type,
        category,
        color: WORKOUT_COLORS[category].hex,
      };
    });
  }, [weekPlan]);

  const maxValue = useMemo(() => {
    const max = Math.max(
      ...chartData.map(d => Math.max(d.planned, d.actual)),
      1
    );
    return Math.ceil(max * 1.1);
  }, [chartData]);

  return (
    <Card className="border-border/50" data-testid="card-weekly-chart">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg" data-testid="text-chart-title">
          <TrendingUp className="w-5 h-5 text-primary" />
          Week {currentWeek} Progression
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64" data-testid="weekly-progress-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.5}
              />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, maxValue]}
                tickFormatter={(value) => `${value}`}
                label={{ 
                  value: 'Miles', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="planned"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Planned"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Actual"
              />
              <Scatter dataKey="actual" name="Workouts">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 pt-4 border-t border-border/50 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-muted-foreground" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0', borderColor: 'hsl(var(--muted-foreground))' }} />
            <span className="text-sm text-muted-foreground">Planned</span>
          </div>
          {Object.entries(WORKOUT_COLORS).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: config.hex }}
              />
              <span className="text-sm text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
