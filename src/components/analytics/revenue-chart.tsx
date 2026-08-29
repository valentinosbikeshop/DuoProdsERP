'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MonthlyData } from '@/types';
import { formatCLP } from '@/lib/utils';

export function RevenueChart({ data }: { data: MonthlyData[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Evolución Mensual: Ventas vs Costos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false}
                className="text-sm text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(value) => formatCLP(value)}
                tickLine={false}
                axisLine={false}
                width={80}
                className="text-xs text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => [formatCLP(value), undefined]}
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                name="Ventas"
                dataKey="ventas" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                name="Costos"
                dataKey="costos" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
