/* eslint-disable @typescript-eslint/no-explicit-any */
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Label, Legend } from 'recharts';
import { DaySeries, SessionDataPoint } from '../../utils/progressCalculations';

interface MultiSeriesProgressChartProps {
  exerciseName: string;
  series: DaySeries[];
  mode: 'weight' | 'reps' | 'normalized' | 'percentage';
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function MultiSeriesProgressChart({ 
  exerciseName, 
  series,
  mode 
}: MultiSeriesProgressChartProps) {
  const getValueKey = () => {
    switch (mode) {
      case 'weight': return 'avgWeight';
      case 'reps': return 'avgReps';
      case 'normalized': return 'normalizedWeight';
      case 'percentage': return 'percentIncrease';
    }
  };

  const getYAxisLabel = () => {
    switch (mode) {
      case 'weight': return 'Weight (kg)';
      case 'reps': return 'Reps';
      case 'normalized': return 'Normalized Weight (kg)';
      case 'percentage': return 'Percentage (%)';
    }
  };

  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No session data available for {exerciseName}
      </div>
    );
  }

  // Get all unique session numbers across all series
  const allSessionNumbers = new Set<number>();
  series.forEach((s) => {
    s.dataPoints.forEach((dp) => allSessionNumbers.add(dp.sessionNumber));
  });
  const maxSessionNumber = Math.max(...Array.from(allSessionNumbers), 0);
  const xAxisMax = Math.max(5, maxSessionNumber);
  const xAxisTicks = Array.from({ length: xAxisMax + 1 }, (_, i) => i);

  // Prepare chart data - combine all series
  const chartDataMap = new Map<number, any>();
  
  // Add origin point
  chartDataMap.set(0, { session: 0 });
  
  series.forEach((s) => {
    s.dataPoints.forEach((point) => {
      const session = point.sessionNumber;
      if (!chartDataMap.has(session)) {
        chartDataMap.set(session, { session });
      }
      const data = chartDataMap.get(session);
      data[s.dayName] = point[getValueKey()] || 0;
    });
  });

  const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.session - b.session);

  // Calculate Y-axis domain
  const allValues = chartData
    .filter(d => d.session > 0)
    .flatMap(d => series.map(s => d[s.dayName]).filter(v => v !== undefined))
    .filter(v => typeof v === 'number') as number[];
  
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
  
  let yAxisMax: number;
  if (maxValue === 0) {
    yAxisMax = 5;
  } else {
    const extraPoints = Math.max(2, Math.ceil(maxValue * 0.2));
    yAxisMax = maxValue + extraPoints;
    if (yAxisMax < 5) {
      yAxisMax = 5;
    }
  }
  
  const yDomain = mode === 'percentage' 
    ? [Math.min(0, minValue - (yAxisMax - maxValue) * 0.1), yAxisMax]
    : [0, yAxisMax];

  const tickCount = 5;
  const tickStep = (yDomain[1] - yDomain[0]) / (tickCount - 1);
  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const value = yDomain[0] + tickStep * i;
    return Math.round(value * 10) / 10;
  });

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{exerciseName}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 50 }}>
          <CartesianGrid stroke="#f3f4f6" vertical={false} />
          
          <XAxis
            dataKey="session"
            type="number"
            scale="linear"
            domain={[0, xAxisMax]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            allowDecimals={false}
            ticks={xAxisTicks}
            tickFormatter={(value) => value.toString()}
          >
            <Label
              offset={-10}
              position="insideBottom"
              style={{ textAnchor: 'middle', fontSize: 13, fill: '#6b7280' }}
            >
              Sessions
            </Label>
          </XAxis>

          <YAxis
            type="number"
            domain={yDomain}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            ticks={yTicks}
            allowDecimals={mode === 'percentage'}
            label={{
              value: getYAxisLabel(),
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 13, fill: '#6b7280' },
            }}
          />

          <Tooltip
            formatter={(value: number) => [
              mode === 'percentage' ? `${value}%` : value.toFixed(1),
              getYAxisLabel()
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: 12,
            }}
            labelFormatter={(label) => `Session ${Math.round(label)}`}
          />

          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />

          {series.map((s, index) => (
            <Line
              key={s.dayId}
              type="monotone"
              dataKey={s.dayName}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={(props: any) => {
                if (props.payload?.session === 0) {
                  return <circle cx={props.cx} cy={props.cy} r={0} fill="transparent" />;
                }
                return <circle cx={props.cx} cy={props.cy} r={4} fill={COLORS[index % COLORS.length]} />;
              }}
              activeDot={{ r: 6 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
