import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Pengiriman } from '../types';

interface ShippingChartProps {
  data: Pengiriman[];
}

export default function ShippingChart({ data }: ShippingChartProps) {
  // We'll focus on last 7 days as requested.
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const chartData = data
    .filter(p => {
      if (!p.createdAt) return false;
      const dateVal = new Date(p.createdAt);
      return !isNaN(dateVal.getTime()) && dateVal >= last7Days;
    })
    .reduce((acc, curr) => {
      const dateObj = new Date(curr.createdAt);
      // Format as YYYY-MM-DD for easy, reliable sorting
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const sortKey = `${year}-${month}-${day}`;

      if (!acc[sortKey]) {
        acc[sortKey] = { sortKey, orders: 0, cbm: 0 };
      }
      acc[sortKey].orders += 1;
      const cbmValue = parseFloat(curr.cbm.toString().replace(',', '.'));
      acc[sortKey].cbm += isNaN(cbmValue) ? 0 : cbmValue;
      return acc;
    }, {} as Record<string, { sortKey: string, orders: number, cbm: number }>);

  // Sort by YYYY-MM-DD key chronologically
  const sortedData = Object.values(chartData).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Map to final display format
  const formattedData = sortedData.map(item => {
    const [_, month, day] = item.sortKey.split('-');
    return {
      date: `${day}/${month}`,
      orders: item.orders,
      cbm: Number(item.cbm.toFixed(3))
    };
  });

  return (
    <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800/80 shadow-md">
      <div className="flex justify-between items-center mb-5">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-white tracking-wide">Tren Operasional Mingguan</h3>
          <p className="text-[11px] text-zinc-400">Total volume pengiriman (CBM) & volume order dalam 7 hari terakhir</p>
        </div>
      </div>
      <div className="h-48 sm:h-56">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500">
            Belum ada data pengiriman dalam 7 hari terakhir
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#71717a" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                yAxisId="left"
                stroke="#3B82F6" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                dx={-10}
                allowDecimals={false}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#10B981" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                dx={10}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  borderColor: '#27272a', 
                  borderRadius: '12px', 
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }} 
                labelStyle={{ fontWeight: 'bold', color: '#a1a1aa', marginBottom: '4px' }}
              />
              <Legend 
                verticalAlign="top" 
                align="right"
                height={36} 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', fontWeight: 'semibold', paddingBottom: '10px' }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="orders" 
                name="Total Order (Pcs)" 
                stroke="#3B82F6" 
                strokeWidth={3} 
                activeDot={{ r: 6, strokeWidth: 0 }}
                dot={{ r: 3, strokeWidth: 0, fill: '#3B82F6' }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cbm" 
                name="Total CBM" 
                stroke="#10B981" 
                strokeWidth={3} 
                activeDot={{ r: 6, strokeWidth: 0 }}
                dot={{ r: 3, strokeWidth: 0, fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
