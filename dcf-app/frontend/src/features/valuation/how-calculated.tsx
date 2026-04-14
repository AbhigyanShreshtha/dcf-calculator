import { formatCurrency } from "../../lib/format";
import type { DcfCalculationResponse } from "../../types/dcf";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function HowCalculated({
  calculation,
  currencySymbol,
}: {
  calculation: DcfCalculationResponse | null;
  currencySymbol: string;
}) {
  if (!calculation) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>How This Was Calculated</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h4 className="font-semibold">Formulas</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {calculation.transparency.formulas.map((formula) => (
              <li key={formula}>{formula}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">Terminal Value</h4>
          <p className="mt-2 text-sm text-muted-foreground">{calculation.transparency.terminal_value_formula}</p>
        </div>

        <div>
          <h4 className="font-semibold">Discount Factors</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {calculation.transparency.discount_factors.map((factor, index) => (
              <span key={factor} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                Y{index + 1}: {factor.toFixed(4)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold">Enterprise to Equity Bridge</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {calculation.transparency.enterprise_to_equity_bridge.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="font-semibold">{formatCurrency(item.value, currencySymbol)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold">Notes</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {calculation.transparency.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

