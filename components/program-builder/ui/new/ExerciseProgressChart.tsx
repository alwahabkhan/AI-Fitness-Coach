/* eslint-disable @typescript-eslint/no-explicit-any */
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Label } from 'recharts';
import { SessionDataPoint } from '../../utils/progressCalculations';

interface ExerciseProgressChartProps {
  exerciseName: string;
  dataPoints: SessionDataPoint[];
  mode: 'weight' | 'reps' | 'normalized' | 'percentage';
}

export default function ExerciseProgressChart({ 
  exerciseName, 
  dataPoints, 
  mode 
}: ExerciseProgressChartProps) {
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

  if (dataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No session data available for {exerciseName}
      </div>
    );
  }

  // Sort data points by session number
  const sortedData = [...dataPoints].sort((a, b) => a.sessionNumber - b.sessionNumber);

  // Calculate max session number - ensure minimum of 5 points on X-axis
  const maxSessionNumber = sortedData.length > 0 
    ? Math.max(...sortedData.map(p => p.sessionNumber))
    : 0;
  const xAxisMax = Math.max(5, maxSessionNumber); // Minimum 5 points, or more if needed
  
  // Generate all X-axis ticks from 0 to xAxisMax
  const xAxisTicks = Array.from({ length: xAxisMax + 1 }, (_, i) => i);

  // Prepare chart data - use actual session numbers and add origin point (0, 0) for better visualization
  const chartData = [
    { session: 0, value: 0 }, // Start from origin
    ...sortedData.map(point => ({
      session: point.sessionNumber,
      value: point[getValueKey()] || 0
    }))
  ];

  // Calculate Y-axis domain - always start from 0 for better visualization
  const values = chartData.filter(d => d.session > 0).map(d => d.value); // Exclude origin point
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Calculate Y-axis max: add 2-3 extra points above max value, or ensure minimum of 5
  let yAxisMax: number;
  if (maxValue === 0) {
    // If all values are 0, set max to 5
    yAxisMax = 5;
  } else {
    // Add 2-3 extra points (or ~20-30% padding, whichever gives more space)
    const extraPoints = Math.max(2, Math.ceil(maxValue * 0.2));
    yAxisMax = maxValue + extraPoints;
    
    // Ensure minimum of 5 if maxValue is less than 5
    if (yAxisMax < 5) {
      yAxisMax = 5;
    }
  }
  
  const yDomain = mode === 'percentage' 
    ? [Math.min(0, minValue - (yAxisMax - maxValue) * 0.1), yAxisMax]
    : [0, yAxisMax]; // Always start Y-axis from 0

  // Calculate Y-axis ticks - ensure at least 5 ticks are shown
  const tickCount = 5;
  const tickStep = (yDomain[1] - yDomain[0]) / (tickCount - 1);
  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const value = yDomain[0] + tickStep * i;
    // Round to 1 decimal place for better readability
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

          <Line
            type="monotone"
            dataKey="value"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={(props: any) => {
              // Hide dot at session 0 (origin point) by returning invisible element
              if (props.payload?.session === 0) {
                return <circle cx={props.cx} cy={props.cy} r={0} fill="transparent" />;
              }
              return <circle cx={props.cx} cy={props.cy} r={4} fill="#3B82F6" />;
            }}
            activeDot={{ r: 6 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

