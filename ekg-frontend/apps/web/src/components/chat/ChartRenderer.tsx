'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface ChartConfig {
  type: 'chart';
  chartType: 'bar' | 'pie' | 'line';
  title: string;
  data: ChartData[];
  message?: string;
}

interface ChartRendererProps {
  config: ChartConfig;
}

// Zen-style color palette - muted, calm
const COLORS = [
  '#E6775B', // primary coral
  '#6B9C89', // sage green
  '#D4A574', // warm tan
  '#8B7E74', // warm gray
  '#7C9EB2', // muted blue
  '#B4838D', // dusty rose
  '#9B8AA6', // muted purple
  '#A89B8C', // taupe
];

export function ChartRenderer({ config }: ChartRendererProps) {
  const { chartType, title, data } = config;

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Không có dữ liệu để hiển thị biểu đồ
      </div>
    );
  }

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
        />
        <YAxis 
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#262626', 
            border: '1px solid #404040',
            borderRadius: '8px',
            color: '#d1cfc1'
          }}
        />
        <Legend />
        <Bar 
          dataKey="value" 
          fill="#E6775B" 
          radius={[4, 4, 0, 0]}
          animationDuration={500}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data as any[]}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }: { name?: string; percent?: number }) => 
            `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          outerRadius={100}
          fill="#E6775B"
          dataKey="value"
          animationDuration={500}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#262626', 
            border: '1px solid #404040',
            borderRadius: '8px',
            color: '#d1cfc1'
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
        />
        <YAxis 
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#262626', 
            border: '1px solid #404040',
            borderRadius: '8px',
            color: '#d1cfc1'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#E6775B" 
          strokeWidth={2}
          dot={{ fill: '#E6775B', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={500}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div className="my-4 p-4 bg-card rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-center mb-4 text-foreground">
        📊 {title}
      </h3>
      
      {chartType === 'bar' && renderBarChart()}
      {chartType === 'pie' && renderPieChart()}
      {chartType === 'line' && renderLineChart()}
      
      <div className="mt-3 text-xs text-center text-muted-foreground">
        Tổng: {data.reduce((sum, item) => sum + item.value, 0)} | 
        Số mục: {data.length}
      </div>
    </div>
  );
}

// Helper to detect and parse chart data from response
export function parseChartFromResponse(content: string): ChartConfig | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*"type"\s*:\s*"chart"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.type === 'chart' && parsed.data) {
        return parsed as ChartConfig;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default ChartRenderer;
