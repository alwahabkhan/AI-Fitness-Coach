/* eslint-disable @typescript-eslint/no-explicit-any */
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Label } from 'recharts';
import { CumulativeDataPoint } from '../../utils/progressCalculations';

interface CumulativeProgressChartProps {
  dataPoints: CumulativeDataPoint[];
  mode: 'volume' | 'weight' | 'exercises' | 'programs';
}

export default function CumulativeProgressChart({ 
  dataPoints,
  mode 
}: CumulativeProgressChartProps) {
  const getValueKey = () => {
    switch (mode) {
      case 'volume': return 'totalVolume';
      case 'weight': return 'averageWeight';
      case 'exercises': return 'exercisesCompleted';
      case 'programs': return 'programsActive';
    }
  };

  const getYAxisLabel = () => {
    switch (mode) {
      case 'volume': return 'Total Volume (kg)';
      case 'weight': return 'Average Weight (kg)';
      case 'exercises': return 'Exercises Completed';
      case 'programs': return 'Active Programs';
    }
  };

  if (dataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No cumulative data available
      </div>
    );
  }

  const maxSessionNumber = Math.max(...dataPoints.map(p => p.sessionNumber), 0);
  const xAxisMax = Math.max(5, maxSessionNumber);
  const xAxisTicks = Array.from({ length: xAxisMax + 1 }, (_, i) => i);

  const chartData = [
    { session: 0, value: 0 },
    ...dataPoints.map(point => ({
      session: point.sessionNumber,
      value: point[getValueKey()] || 0,
      date: point.date
    }))
  ];

  const values = chartData.filter(d => d.session > 0).map(d => d.value);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  
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
  
  const yDomain = [0, yAxisMax];
  const tickCount = 5;
  const tickStep = (yDomain[1] - yDomain[0]) / (tickCount - 1);
  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const value = yDomain[0] + tickStep * i;
    return Math.round(value * 10) / 10;
  });

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Progress Over Time</h3>
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
            allowDecimals={mode === 'weight'}
            label={{
              value: getYAxisLabel(),
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 13, fill: '#6b7280' },
            }}
          />

          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              mode === 'volume' ? `${value.toLocaleString()} kg` : 
              mode === 'weight' ? `${value.toFixed(1)} kg` : 
              value.toString(),
              getYAxisLabel()
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: 12,
            }}
            labelFormatter={(label, payload) => {
              const data = payload?.[0]?.payload;
              return `Session ${Math.round(label)}${data?.date ? ` (${data.date})` : ''}`;
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={(props: any) => {
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
