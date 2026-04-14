import { formatCurrency, formatPercent, formatNumber } from "../../lib/format";
import type { SensitivityMatrixResponse } from "../../types/dcf";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "../../components/ui/table";
import { cn } from "../../lib/utils";

export function SensitivityHeatmap({ matrix }: { matrix: SensitivityMatrixResponse | null }) {
  if (!matrix) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Analysis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sensitivity output will appear here after the first calculation.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sensitivity Analysis</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <thead>
            <TableRow>
              <TableHead>{matrix.matrix_type === "wacc_growth" ? "WACC \\ g" : "WACC \\ Exit Multiple"}</TableHead>
              {matrix.column_values.map((value) => (
                <TableHead key={value}>
                  {matrix.matrix_type === "wacc_growth" ? formatPercent(value) : `${formatNumber(value, 1)}x`}
                </TableHead>
              ))}
            </TableRow>
          </thead>
          <tbody>
            {matrix.row_values.map((rowValue, rowIndex) => (
              <TableRow key={rowValue}>
                <TableCell className="font-medium">{formatPercent(rowValue)}</TableCell>
                {matrix.cells[rowIndex].map((cell, columnIndex) => (
                  <TableCell
                    key={`${rowValue}-${columnIndex}`}
                    className={cn(
                      "text-right",
                      rowIndex === matrix.base_row_index &&
                        columnIndex === matrix.base_column_index &&
                        "rounded-lg bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    {formatCurrency(cell, matrix.currency_symbol)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

