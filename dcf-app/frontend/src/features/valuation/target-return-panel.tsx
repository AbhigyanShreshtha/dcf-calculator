import { useState } from "react";

import { formatCurrency, formatPercent } from "../../lib/format";
import type { TargetReturnResponse } from "../../types/dcf";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export function TargetReturnPanel({
  result,
  onRun,
  loading,
  currencySymbol,
}: {
  result: TargetReturnResponse | null;
  onRun: (desiredReturn: number, holdingPeriod: number | null) => void;
  loading: boolean;
  currencySymbol: string;
}) {
  const [desiredReturn, setDesiredReturn] = useState("0.15");
  const [holdingPeriod, setHoldingPeriod] = useState("5");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Return Mode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Desired annualized return</p>
            <Input value={desiredReturn} onChange={(event) => setDesiredReturn(event.target.value)} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Holding period (years)</p>
            <Input value={holdingPeriod} onChange={(event) => setHoldingPeriod(event.target.value)} />
          </div>
        </div>
        <Button onClick={() => onRun(Number(desiredReturn), Number(holdingPeriod))} disabled={loading}>
          Calculate Max Buy Price
        </Button>

        {result ? (
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Target return" value={formatPercent(result.desired_annualized_return)} />
            <MetricCard label="Max buy price today" value={formatCurrency(result.max_buy_price_today, currencySymbol)} />
            <MetricCard
              label="Buy-under price with margin of safety"
              value={formatCurrency(result.buy_under_price_with_margin_of_safety, currencySymbol)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/60 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
