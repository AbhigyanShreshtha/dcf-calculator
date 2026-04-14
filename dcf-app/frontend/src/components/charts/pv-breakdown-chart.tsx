import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatCurrency } from "../../lib/format";

const COLORS = ["#0b8f77", "#b75c35"];

export function PvBreakdownChart({
  forecastPv,
  terminalPv,
  currencySymbol,
}: {
  forecastPv: number;
  terminalPv: number;
  currencySymbol: string;
}) {
  const data = [
    { name: "Forecast PV", value: forecastPv },
    { name: "Terminal PV", value: terminalPv },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value, currencySymbol)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

