import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ForecastRow } from "../../types/dcf";
import { formatCurrency } from "../../lib/format";

export function RevenueChart({
  rows,
  currencySymbol,
}: {
  rows: ForecastRow[];
  currencySymbol: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={rows}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0b8f77" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0b8f77" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={(value) => formatCurrency(value, currencySymbol, 0)} />
        <Tooltip formatter={(value: number) => formatCurrency(value, currencySymbol)} />
        <Area type="monotone" dataKey="revenue" stroke="#0b8f77" fill="url(#revenueGradient)" strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

