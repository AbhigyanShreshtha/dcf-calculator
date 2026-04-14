import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ForecastRow } from "../../types/dcf";
import { formatCurrency } from "../../lib/format";

export function CashFlowChart({
  rows,
  currencySymbol,
}: {
  rows: ForecastRow[];
  currencySymbol: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={(value) => formatCurrency(value, currencySymbol, 0)} />
        <Tooltip formatter={(value: number) => formatCurrency(value, currencySymbol)} />
        <Legend />
        <Bar dataKey="fcff" fill="#0b8f77" radius={[10, 10, 0, 0]} />
        <Bar dataKey="fcfe" fill="#b75c35" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

