import { formatCurrency, formatPercent } from "../../lib/format";
import type { ForecastRow } from "../../types/dcf";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "../../components/ui/table";

export function ForecastTable({
  rows,
  currencySymbol,
}: {
  rows: ForecastRow[];
  currencySymbol: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast Table</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <thead>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Growth</TableHead>
              <TableHead>EBIT Margin</TableHead>
              <TableHead>FCFF</TableHead>
              <TableHead>FCFE</TableHead>
              <TableHead>PV Factor</TableHead>
            </TableRow>
          </thead>
          <tbody>
            {rows.map((row) => (
              <TableRow key={row.year}>
                <TableCell>{row.year}</TableCell>
                <TableCell>{formatCurrency(row.revenue, currencySymbol)}</TableCell>
                <TableCell>{formatPercent(row.growth_rate)}</TableCell>
                <TableCell>{formatPercent(row.ebit_margin)}</TableCell>
                <TableCell>{formatCurrency(row.fcff, currencySymbol)}</TableCell>
                <TableCell>{formatCurrency(row.fcfe, currencySymbol)}</TableCell>
                <TableCell>{row.discount_factor.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

