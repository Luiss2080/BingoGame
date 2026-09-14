import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dinero } from '../lib/format';

interface VentasChartProps {
  data: { hora: string; cantidad: number; ingresos: number }[];
}

export function VentasChart({ data }: VentasChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => {
      // Extraer solo la hora para mejor legibilidad, ej: "2026-09-14 14:00" -> "14:00"
      const time = d.hora.split(' ')[1] || d.hora;
      return {
        ...d,
        label: time,
      };
    });
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-line bg-surface shadow-sm shadow-black/20">
        <p className="text-sm text-muted">No hay datos de ventas aún.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-black/20">
      <h3 className="mb-4 text-sm font-bold text-white">Ventas por Hora</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" stroke="#8795A1" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#8795A1" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A2A3A', borderColor: '#2D3E50', borderRadius: '8px' }}
              itemStyle={{ color: '#E2E8F0' }}
              formatter={(value: number, name: string) => [name === 'ingresos' ? dinero(value) : value, name === 'ingresos' ? 'Ingresos' : 'Cantidad']}
              labelStyle={{ color: '#8795A1', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="ingresos"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorIngresos)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
