import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PricePoint } from '../types';

interface PriceChartProps {
  data: PricePoint[];
  color: string;
  height?: number | string;
  detailed?: boolean;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, color, height = 120, detailed = false }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: typeof height === 'number' ? height : '100%' }} className="w-full flex items-center justify-center bg-[#171a1e] rounded border border-gray-800 border-dashed text-gray-600 text-xs font-mono">
        LOADING MARKET DATA...
      </div>
    );
  }

  const prices = data.map(d => d.value);
  // Tighter bounds for detailed view to emphasize movement
  const min = Math.min(...prices) * (detailed ? 0.999 : 0.99);
  const max = Math.max(...prices) * (detailed ? 1.001 : 1.01);

  const formatTime = (timeStr: string) => {
    return timeStr.split(':').slice(0, 2).join(':');
  };

  return (
    <div className="w-full select-none" style={{ height: typeof height === 'number' ? height : '100%', minHeight: detailed ? 300 : undefined }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={detailed ? { top: 20, right: 60, left: 10, bottom: 20 } : { top: 5, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={detailed ? 0.15 : 0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          {detailed && (
            <CartesianGrid stroke="#2b3139" strokeDasharray="3 3" vertical={false} />
          )}

          <XAxis 
            dataKey="time" 
            hide={!detailed} 
            tickFormatter={formatTime}
            stroke="#4b5563"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={50}
          />
          
          <YAxis 
            domain={[min, max]} 
            hide={!detailed} 
            orientation="right"
            stroke="#4b5563"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => val.toFixed(detailed ? (val < 1 ? 6 : 2) : 2)}
            width={60}
          />

          <Tooltip 
            isAnimationActive={false} 
            cursor={detailed ? { stroke: '#4b5563', strokeDasharray: '3 3' } : false}
            content={detailed ? undefined : <></>} 
            wrapperStyle={{ outline: 'none' }}
            contentStyle={{ 
              backgroundColor: '#1e2329', 
              borderColor: '#2b3139', 
              color: '#EAECEF', 
              fontSize: '12px',
              borderRadius: '4px',
              padding: '8px'
            }}
            itemStyle={{ color: color }}
            labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
            formatter={(value: number) => [value.toFixed(6), 'Price']}
          />

          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            fill={`url(#gradient-${color})`} 
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;