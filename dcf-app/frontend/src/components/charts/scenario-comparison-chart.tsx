import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency, formatPercentFromPercentage } from "../../lib/format";
import type { ScenarioComparisonItem } from "../../types/dcf";

export function ScenarioComparisonChart({
  results,
  currencySymbol,
}: {
  results: ScenarioComparisonItem[];
  currencySymbol: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={results}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis dataKey="scenario_name" />
        <YAxis tickFormatter={(value) => formatCurrency(value, currencySymbol, 0)} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "upside_downside_pct"
              ? formatPercentFromPercentage(value)
              : formatCurrency(value, currencySymbol)
          }
        />
        <Bar dataKey="intrinsic_value_per_share" fill="#0b8f77" radius={[12, 12, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

