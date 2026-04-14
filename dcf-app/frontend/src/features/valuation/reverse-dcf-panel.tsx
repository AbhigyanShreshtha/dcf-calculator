import { useState } from "react";

import { formatCurrency, formatPercent } from "../../lib/format";
import type { ReverseDcfResponse, ReverseSolveMode } from "../../types/dcf";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export function ReverseDcfPanel({
  result,
  onSolve,
  loading,
  currencySymbol,
}: {
  result: ReverseDcfResponse | null;
  onSolve: (mode: ReverseSolveMode, lowerBound?: number | null, upperBound?: number | null) => void;
  loading: boolean;
  currencySymbol: string;
}) {
  const [growthBounds, setGrowthBounds] = useState({ low: "-0.30", high: "0.60" });
  const [marginBounds, setMarginBounds] = useState({ low: "0.10", high: "0.70" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reverse DCF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border/70 p-4">
            <h4 className="font-semibold">Solve for implied revenue growth</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input value={growthBounds.low} onChange={(event) => setGrowthBounds((current) => ({ ...current, low: event.target.value }))} />
              <Input value={growthBounds.high} onChange={(event) => setGrowthBounds((current) => ({ ...current, high: event.target.value }))} />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => onSolve("revenue_growth", Number(growthBounds.low), Number(growthBounds.high))}
              disabled={loading}
            >
              Solve Growth
            </Button>
          </div>
          <div className="space-y-3 rounded-2xl border border-border/70 p-4">
            <h4 className="font-semibold">Solve for implied operating margin</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input value={marginBounds.low} onChange={(event) => setMarginBounds((current) => ({ ...current, low: event.target.value }))} />
              <Input value={marginBounds.high} onChange={(event) => setMarginBounds((current) => ({ ...current, high: event.target.value }))} />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => onSolve("operating_margin", Number(marginBounds.low), Number(marginBounds.high))}
              disabled={loading}
            >
              Solve Margin
            </Button>
          </div>
        </div>

        {result ? (
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-sm text-muted-foreground">{result.assumption_label}</p>
            <p className="mt-2 text-2xl font-semibold">
              {result.solve_for === "revenue_growth"
                ? formatPercent(result.implied_value)
                : formatPercent(result.implied_value)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Justified price: {formatCurrency(result.justified_price, currencySymbol)} vs market price{" "}
              {formatCurrency(result.target_market_price, currencySymbol)}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

