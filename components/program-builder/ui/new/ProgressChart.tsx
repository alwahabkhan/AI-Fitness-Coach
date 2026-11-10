/* eslint-disable @typescript-eslint/no-explicit-any */
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,AreaChart,LabelList, Label,Area } from 'recharts';
import { DaySeries } from '../../utils/progressCalculations';

interface ProgressChartProps {
  series: DaySeries[];
  mode: 'weight' | 'reps' | 'normalized';
  muscleName: string;
}

export default function ProgressChart({ series, mode, muscleName }: ProgressChartProps) {

  const getValueKey = () => {
    switch (mode) {
      case 'weight': return 'avgWeight';
      case 'reps': return 'avgReps';
      case 'normalized': return 'normalizedWeight';
    }
  };

  const getYAxisLabel = () => {
    switch (mode) {
      case 'weight': return ' Weight (kg)';
      case 'reps': return ' Reps';
      case 'normalized': return ' Normalized weight (kg)';
    }
  };

  if (series.length === 0 || series.every(s => s.dataPoints.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No session data available for {muscleName}
      </div>
    );
  }

  // Combine all data points with day identifier
  const allDataPoints = series.flatMap(daySeries => 
    daySeries.dataPoints.map(point => ({
      ...point,
      dayName: daySeries.dayName
    }))
  );

  // Get unique session numbers across all days
  const sessionNumbers = Array.from(
    new Set(allDataPoints.map(p => p.sessionNumber))
  ).sort((a, b) => a - b);

  // Create combined data structure for Recharts
  const chartData = sessionNumbers.map(sessionNum => {
    const dataPoint: any = { sessionNumber: sessionNum };
    
    series.forEach((daySeries, idx) => {
      const point = daySeries.dataPoints.find(p => p.sessionNumber === sessionNum);
      if (point) {
        dataPoint[`day_${idx}`] = point[getValueKey()];
        dataPoint[`day_${idx}_data`] = point;
      }
    });
    
    return dataPoint;
  });
  return (
    <div className="w-full ">
     <ResponsiveContainer width="100%" height={380}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 50 }}>
          {/* Light grid lines */}
          <CartesianGrid stroke="#f3f4f6" vertical={false} />

          {/* X Axis */}
          <XAxis
            dataKey="sessionNumber"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          >
            <Label
              value="Sessions"
              offset={-25}
              position="insideBottom"
              style={{ textAnchor: 'middle', fontSize: 13, fill: '#6b7280' }}
            />
          </XAxis>

          {/* Y Axis */}
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{
              value: getYAxisLabel(),
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 13, fill: '#6b7280' },
            }}
          />

          {/* Tooltip */}
          <Tooltip
            formatter={(value: number) => [Math.round(value), series?.[0]?.dayName || 'Day 1']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: 12,
            }}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="softBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <Area
            type="monotone"
            dataKey="day_0"
            name={series?.[0]?.dayName || 'Day 1'}
            stroke="none"
            fill="url(#softBlue)"
            fillOpacity={1}
            connectNulls
          />

          {/* Line + Labels */}
          <Line
            type="monotone"
            dataKey="day_0"
            name={series?.[0]?.dayName || 'Day 1'}
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3B82F6' }}
            activeDot={{ r: 5 }}
            connectNulls
          >
            <LabelList
              dataKey="day_0"
              position="top"
              content={({ value, x, y, index }: any) => {
                const sessionNum = chartData[index]?.sessionNumber;
                if (value == null || x == null || y == null) return null;
                return (
                  <g>
                    <text
                      x={x}
                      y={y - 18}
                      textAnchor="middle"
                      style={{ fontSize: 11, fill: '#6b7280' }}
                    >
                      {sessionNum}
                    </text>
                    <text
                      x={x}
                      y={y - 5}
                      textAnchor="middle"
                      style={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                    >
                      {Math.round(value)}
                    </text>
                  </g>
                );
              }}
            />
          </Line>
        </AreaChart>
      </ResponsiveContainer>




    </div>
  );
  
}